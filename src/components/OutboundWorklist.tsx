import Link from "next/link";
import { Suspense } from "react";
import { ArrowDown, ArrowUp, Ban, Check, Layers, PackageCheck, PackageX, RotateCcw, Search, ShieldQuestion, Truck } from "lucide-react";

import { EmptyState } from "@/components/ui";
import { UnfulfilledRefreshButton } from "@/components/UnfulfilledRefreshButton";
import { releaseOutbound, reserveOutbound } from "@/lib/actions/outbound";
import { releaseShipgPackages } from "@/lib/actions/shipg-allocation";
import { refreshOutboundStock } from "@/lib/actions/shipgerman-sync";
import { canDispatchMatch } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { pluralSuffix, type Locale } from "@/lib/i18n/shared";
import { freshMatchOrders } from "@/lib/outbound-matches";
import { buildOutboundWorklist, type WorklistRow } from "@/lib/outbound-worklist";
import type { ShopifyOrderSummary } from "@/lib/shopify";
import { findOrdersAwaitingStock } from "@/lib/unfulfilled";
import { freeDaysLeft, STORAGE_CURRENCY, type AgeTier } from "@/lib/storage-cost";

const OK_FEEDBACK = ["reserved", "released", "fulfilled", "stockRefreshed"];
const BAD_FEEDBACK = ["invalid", "stale", "alreadyReserved", "fulfillError", "syncError", "lowConfidence"];

const rightAlign = { textAlign: "right" as const };

const TIER_COLOR: Record<AgeTier, string> = {
  free: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--stamp)",
};

/** Vrstni red seznama. Privzeto FIFO (najstarejši prvi) — to je disciplina, ki
 *  drži strošek pri tleh. Po teži se sortira le v pogledu ujemanj, kjer paket
 *  izbiraš, ne le odpremljaš po vrsti. */
type WorklistSort = "arrival" | "weight" | "weightAsc";

function asSort(value: string | undefined): WorklistSort {
  return value === "weight" || value === "weightAsc" ? value : "arrival";
}

/** Polica seznama: vsi paketi, vsa ujemanja, samo redka (paket z več kosi) ali
 *  rezervirani paketi, ki čakajo na odpremo. */
type WorklistFilter = "all" | "matches" | "rare" | "reserved";

function asFilter(value: string | undefined): WorklistFilter {
  return value === "matches" || value === "rare" || value === "reserved" ? value : "all";
}

function worklistHref(filter: WorklistFilter, sort?: WorklistSort) {
  const params = new URLSearchParams({ view: "outbound" });
  if (filter !== "all") params.set("only", filter);
  if (sort && sort !== "arrival") params.set("sort", sort);
  return `/shipg?${params.toString()}`;
}

function money(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "sl" ? "sl-SI" : "en-GB", { style: "currency", currency: STORAGE_CURRENCY }).format(amount);
}

function kilograms(grams: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "sl" ? "sl-SI" : "en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(grams / 1000);
}

/** Paketni seznam za odpremo, vgrajen kot zavihek ZA ODPREMO. Ogrodje strani je
 *  takoj vidno; počasen Shopify klic teče v <Suspense>. */
export function OutboundWorklistPanel({ locale, state, found, only, sort }: {
  locale: Locale;
  state?: string;
  /** Koliko novih ujemanj je prinesla zadnja osvežitev (iz naslova). */
  found?: string;
  only?: string;
  sort?: string;
}) {
  const filter = asFilter(only);
  const foundCount = Number.parseInt(found ?? "", 10);
  const reported = Number.isInteger(foundCount) && foundCount >= 0;

  return (
    <div className="pt-4">
      {state && OK_FEEDBACK.includes(state) && (
        <p className="mb-3 text-[12.5px]" style={{ color: "var(--petrol)" }}>
          {t(locale, `outbound.feedback.${state}` as TranslationKey)}
          {reported && (foundCount > 0 ? (
            <>
              {" "}{t(locale, `outbound.matches.found.${pluralSuffix(locale, foundCount)}` as TranslationKey, { count: foundCount })}
              {/* Povezava le, kadar ujemanj ne gledaš že zdaj — sicer bi peljala nase. */}
              {filter === "all" && <>{" "}<Link href={worklistHref("matches")} className="link">{t(locale, "outbound.matches.view")}</Link></>}
            </>
          ) : (
            <span className="text-label-2">{" "}{t(locale, "outbound.matches.foundNone")}</span>
          ))}
        </p>
      )}
      {state && BAD_FEEDBACK.includes(state) && (
        <p className="mb-3 text-[12.5px]" style={{ color: "var(--stamp)" }}>{t(locale, `outbound.feedback.${state}` as TranslationKey)}</p>
      )}
      <p className="caption mb-4 max-w-[720px] text-label-3">{t(locale, "unfulfilled.subtitlePkg")}</p>
      <Suspense fallback={<WorklistSkeleton />}>
        <Worklist locale={locale} filter={filter} sort={asSort(sort)} />
      </Suspense>
    </div>
  );
}

async function Worklist({ locale, filter, sort }: { locale: Locale; filter: WorklistFilter; sort: WorklistSort }) {
  // Obe polici ujemanj imata stolpec teže in razvrščanje; ostali ne.
  const matchesOnly = filter === "matches" || filter === "rare";
  // Naročila iz Shopifyja beremo v živo; če odpovejo, paketni pogled vseeno
  // pokažemo (staranje zaloge je jedro), le predlogi naročil izginejo.
  let orders: ShopifyOrderSummary[] = [];
  let shopifyDown = false;
  try {
    orders = await findOrdersAwaitingStock();
  } catch {
    shopifyDown = true;
  }

  const [{ rows, summary }, fresh] = await Promise.all([buildOutboundWorklist(orders), freshMatchOrders()]);

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t(locale, shopifyDown ? "unfulfilled.notConnected" : "unfulfilled.emptyStock")}
        hint={t(locale, shopifyDown ? "unfulfilled.notConnectedHint" : "unfulfilled.emptyStockHint")}
      />
    );
  }

  // Ujemanje vodi sidrni paket — člani seta so isti predlog in se ne štejejo posebej.
  const anchors = rows.filter((row) => row.kind === "anchor");
  const rareAnchors = anchors.filter((row) => row.order?.rare);
  const reserved = rows.filter((row) => row.kind === "reserved");
  const shelf = filter === "rare" ? rareAnchors : filter === "matches" ? anchors : filter === "reserved" ? reserved : rows;
  const visible = sortRows(shelf, matchesOnly ? sort : "arrival");

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="caption">
            {t(locale, "unfulfilled.sumPackages", { count: summary.packages })}
            {summary.agingCount > 0 && <> · <span style={{ color: "var(--warning)" }}>{t(locale, "unfulfilled.sumAging", { count: summary.agingCount })}</span></>}
            {summary.tooOldCount > 0 && <> · <span title={t(locale, "unfulfilled.tooOldHint", { days: summary.maxAgeDays })}>{t(locale, "unfulfilled.sumTooOld", { count: summary.tooOldCount, days: summary.maxAgeDays })}</span></>}
          </p>
          {/* Ujemanja so lastna polica: kaj lahko odpremim zdaj, brez brskanja po celem seznamu. */}
          <Link
            href={filter === "matches" ? worklistHref("all") : worklistHref("matches", sort)}
            className="shipgerman-filter-chip"
            data-active={filter === "matches" ? "true" : "false"}
            title={t(locale, filter === "matches" ? "outbound.matches.showAll" : "outbound.matches.filter")}
          >
            <Check size={12} /> {t(locale, "outbound.matches.filter")} <span className="mono text-[10px]">{anchors.length}</span>
          </Link>
          {/* Redka: paket z več kosi, ki najde naročilo morda enkrat na teden. */}
          <Link
            href={filter === "rare" ? worklistHref("all") : worklistHref("rare", sort)}
            className="shipgerman-filter-chip"
            data-active={filter === "rare" ? "true" : "false"}
            title={t(locale, filter === "rare" ? "outbound.matches.showAll" : "outbound.matches.rareHint")}
          >
            <Layers size={12} /> {t(locale, "outbound.matches.rare")} <span className="mono text-[10px]">{rareAnchors.length}</span>
          </Link>
          {/* Rezervirani: obljubljeni paketi, ki še niso odšli — naročila in menjave. */}
          <Link
            href={filter === "reserved" ? worklistHref("all") : worklistHref("reserved")}
            className="shipgerman-filter-chip"
            data-active={filter === "reserved" ? "true" : "false"}
            title={t(locale, filter === "reserved" ? "outbound.matches.showAll" : "outbound.reserved.hint")}
          >
            <PackageCheck size={12} /> {t(locale, "outbound.reserved.filter")} <span className="mono text-[10px]">{reserved.length}</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {summary.dailyBurn > 0 && (
            <span className="caption mono" style={{ color: "var(--stamp)" }} title={t(locale, "unfulfilled.sumAccrued", { amount: money(summary.accruedCost, locale) })}>
              {t(locale, "unfulfilled.sumDaily", { amount: money(summary.dailyBurn, locale) })}
            </span>
          )}
          <form action={refreshOutboundStock}><UnfulfilledRefreshButton /></form>
        </div>
      </div>

      {shopifyDown && (
        <p className="mb-3 text-[12.5px]" style={{ color: "var(--warning)" }}>{t(locale, "unfulfilled.shopifyDown")}</p>
      )}

      <div className="shipgerman-register">
        {visible.length === 0 ? (
          <EmptyState
            title={t(locale, filter === "reserved" ? "outbound.reserved.empty" : filter === "rare" ? "outbound.matches.rareEmpty" : "outbound.matches.empty")}
            hint={t(locale, filter === "reserved" ? "outbound.reserved.emptyHint" : filter === "rare" ? "outbound.matches.rareEmptyHint" : "outbound.matches.emptyHint")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="shipgerman-table">
              <thead><tr>
                <th>{t(locale, "unfulfilled.colPackage")}</th>
                <th>{t(locale, "unfulfilled.colContents")}</th>
                {matchesOnly ? (
                  <th aria-sort={sort === "arrival" ? "ascending" : "none"}>
                    <Link href={worklistHref(filter)} className="shipgerman-sort" title={t(locale, "unfulfilled.sortArrival")}>
                      {t(locale, "unfulfilled.colArrived")}
                      {sort === "arrival" && <ArrowUp size={12} />}
                    </Link>
                  </th>
                ) : <th>{t(locale, "unfulfilled.colArrived")}</th>}
                <th>{t(locale, "unfulfilled.colAge")}</th>
                {matchesOnly && (
                  <th style={rightAlign} aria-sort={sort === "weight" ? "descending" : sort === "weightAsc" ? "ascending" : "none"}>
                    <Link
                      href={worklistHref(filter, sort === "weight" ? "weightAsc" : "weight")}
                      className="shipgerman-sort"
                      title={t(locale, sort === "weight" ? "unfulfilled.sortWeightAsc" : "unfulfilled.sortWeightDesc")}
                    >
                      {t(locale, "unfulfilled.colWeight")}
                      {sort === "weight" ? <ArrowDown size={12} /> : sort === "weightAsc" ? <ArrowUp size={12} /> : null}
                    </Link>
                  </th>
                )}
                <th style={rightAlign}>{t(locale, "unfulfilled.colCost")}</th>
                <th>{t(locale, "unfulfilled.colOrder")}</th>
                <th className="worklist-action">{t(locale, "unfulfilled.colAction")}</th>
              </tr></thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.parcelId}>
                    <td data-label={t(locale, "unfulfilled.colPackage")}>
                      <span className="mono font-medium">ShipGerman {row.parcelId}</span>
                      {row.sender && <span className="ml-2 text-label-3">· {row.sender}</span>}
                    </td>
                    <td data-label={t(locale, "unfulfilled.colContents")} className="text-label-2">
                      {row.kind === "unidentified"
                        ? <span className="pill inline-flex items-center gap-1" style={{ borderColor: "var(--warning)", color: "var(--warning)" }}><PackageX size={12} />{t(locale, "unfulfilled.unidentified")}</span>
                        : row.contents || <span className="text-label-3">—</span>}
                    </td>
                    <td data-label={t(locale, "unfulfilled.colArrived")} className="text-label-2">
                      {formatDate(row.arrival, locale)}
                    </td>
                    <td data-label={t(locale, "unfulfilled.colAge")} className="mono" style={{ color: TIER_COLOR[row.tier] }}>
                      {t(locale, "unfulfilled.days", { days: row.days })}
                    </td>
                    {matchesOnly && (
                      <td data-label={t(locale, "unfulfilled.colWeight")} className="mono whitespace-nowrap" style={rightAlign}>
                        {t(locale, "unfulfilled.weightKg", { value: kilograms(row.weightGrams, locale) })}
                      </td>
                    )}
                    <td data-label={t(locale, "unfulfilled.colCost")} className="mono whitespace-nowrap" style={{ ...rightAlign, color: TIER_COLOR[row.tier] }}>
                      {row.tier === "danger"
                        ? money(row.accruedCost, locale)
                        : row.tier === "warning"
                          ? t(locale, "unfulfilled.freeForDays", { days: freeDaysLeft(row.days) })
                          : t(locale, "unfulfilled.freeDays")}
                    </td>
                    <td data-label={t(locale, "unfulfilled.colOrder")}>
                      <OrderCell row={row} locale={locale} isNew={row.kind === "anchor" && !!row.order && fresh.has(row.order.orderNumber)} />
                    </td>
                    <td className="worklist-action" data-label={t(locale, "unfulfilled.colAction")}>
                      <ActionCell row={row} locale={locale} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/** Privzeti vrstni red je že FIFO iz seznama; po teži uredimo le na zahtevo,
 *  starost pa ostane razsodnik pri enaki teži — vrstni red je tako določen. */
function sortRows(rows: WorklistRow[], sort: WorklistSort): WorklistRow[] {
  if (sort === "arrival") return rows;
  const direction = sort === "weight" ? -1 : 1;
  return [...rows].sort((a, b) =>
    direction * (a.weightGrams - b.weightGrams) || a.arrival.getTime() - b.arrival.getTime());
}

function WorklistSkeleton() {
  return (
    <div className="shipgerman-register animate-pulse">
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-9" style={{ background: "var(--surface-2)" }} />
        ))}
      </div>
    </div>
  );
}

/** Levi del: kaj paket JE — stanje, naročilo, stranka. Brez gumbov, da stolpec
 *  ostane berljiv tudi pri dolgih imenih. */
function OrderCell({ row, locale, isNew }: { row: WorklistRow; locale: Locale; isNew: boolean }) {
  if (row.kind === "unidentified") {
    return <span className="text-label-3">—</span>;
  }

  if (row.kind === "reserved") {
    // Številka je tu samo še podatek — v odpremo pelje gumb v stolpcu dejanja,
    // da je pot naprej vidna in ne skrita v drobni povezavi.
    const datum = row.reservedExchange ? row.reservedIssueKey : row.reservedOrderNumber && `#${row.reservedOrderNumber}`;
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="pill pill-petrol">{t(locale, "unfulfilled.reservedNoOrder")}</span>
        {datum && <span className="mono text-[12.5px]">{datum}</span>}
        {row.reservedExchange && <span className="text-[11.5px] text-label-3">{t(locale, "unfulfilled.reservedExchangeNote")}</span>}
      </div>
    );
  }

  if (row.kind === "anchor" && row.order) {
    return (
      <div className="flex items-center gap-x-2">
        <Link href={`/unfulfilled/${encodeURIComponent(row.order.orderNumber)}`} className="link mono shrink-0 text-[12.5px]">#{row.order.orderNumber}</Link>
        {row.order.customerName && (
          <span className="max-w-[190px] truncate text-[11.5px] text-label-3" title={row.order.customerName}>{row.order.customerName}</span>
        )}
        {/* Novo od zadnje osvežitve — brez tega je "našel sem 3 nova" brez naslova. */}
        {isNew && <span className="pill pill-petrol shrink-0">{t(locale, "outbound.matches.new")}</span>}
        {row.order.rare && <span className="pill pill-ink shrink-0">{t(locale, "outbound.matches.rareTag")}</span>}
        {row.order.packageCount > 1 && <span className="pill shrink-0">{t(locale, "unfulfilled.multiPkg", { count: row.order.packageCount })}</span>}
      </div>
    );
  }

  if (row.kind === "member" && row.memberOf) {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1.5 text-[12px] text-label-3">
        {t(locale, "unfulfilled.partOf", { order: row.memberOf.orderNumber })}
        <span className="mono">· ShipGerman {row.memberOf.anchorParcelId}</span>
      </span>
    );
  }

  // Prestar paket ne dobi naročila namenoma — brez oznake bi človek iskal,
  // zakaj ujemanja ni.
  if (row.tooOld) {
    return (
      <span className="pill inline-flex items-center gap-1 text-label-3" title={t(locale, "unfulfilled.tooOldTitle")}>
        <Ban size={12} />{t(locale, "unfulfilled.tooOld")}
      </span>
    );
  }

  // Dvomljivo ujemanje ni "brez naročila" — paket je vezan, le zaupati mu ne
  // smemo. Če bi ga pokazali kot nevezanega, bi človek iskal napako drugje.
  if (!canDispatchMatch(row.matchQuality)) {
    return (
      <span className="pill inline-flex items-center gap-1" style={{ borderColor: "var(--warning)", color: "var(--warning)" }}>
        <ShieldQuestion size={12} />{t(locale, "matchQuality.blocked")}
      </span>
    );
  }

  return <span className="text-[12px] text-label-3">{t(locale, "unfulfilled.noOrder")}</span>;
}

/** Desni del: dejanje vrstice. Glavni gumb stoji v enako širokem mestu, zato so
 *  glavni gumbi vseh vrstic poravnani; sprostitev se kot pomožna pripne zanj. */
function ActionCell({ row, locale }: { row: WorklistRow; locale: Locale }) {
  if (row.kind === "unidentified") {
    return (
      <div className="worklist-action-row">
        <div className="worklist-action-primary">
          <Link href="/shipg?view=stock&lens=list&filter=unidentifiable" className="btn btn-sm">
            <Search size={13} />{t(locale, "unfulfilled.identify")}
          </Link>
        </div>
      </div>
    );
  }

  if (row.kind === "anchor" && row.order) {
    return (
      <div className="worklist-action-row">
        <div className="worklist-action-primary">
          <form action={reserveOutbound}>
            <input type="hidden" name="from" value="list" />
            <input type="hidden" name="orderNumber" value={row.order.orderNumber} />
            {row.order.shipgReturnIds.map((id) => <input key={id} type="hidden" name="shipgReturnId" value={id} />)}
            <button className="btn btn-primary btn-sm"><PackageCheck size={13} />{t(locale, "unfulfilled.reserve")}</button>
          </form>
        </div>
      </div>
    );
  }

  if (row.kind === "reserved") {
    // Pot naprej: odprema naročila teče na strani naročila, menjava na ticketu.
    const href = row.reservedExchange
      ? (row.reservedIssueKey ? `/orders/${encodeURIComponent(row.reservedIssueKey)}` : null)
      : (row.reservedOrderNumber ? `/unfulfilled/${encodeURIComponent(row.reservedOrderNumber)}` : null);
    const dispatchLabel = t(locale, row.reservedExchange ? "unfulfilled.dispatchExchange" : "unfulfilled.dispatchOrder");

    return (
      <div className="worklist-action-row">
        <div className="worklist-action-primary">
          {href && (
            <Link href={href} className="btn btn-primary btn-sm">
              <Truck size={13} />{dispatchLabel}
            </Link>
          )}
        </div>
        <ReleaseButton row={row} locale={locale} />
      </div>
    );
  }

  return null;
}

/** Sprostitev rezervacije: odprema prek outboundId, menjava prek issueId. */
function ReleaseButton({ row, locale }: { row: WorklistRow; locale: Locale }) {
  const title = t(locale, "shipg.exchange.release");
  const label = t(locale, "unfulfilled.release");
  if (!row.reservedExchange && row.reservedOutboundId && row.reservedOrderNumber) {
    return (
      <form action={releaseOutbound}>
        <input type="hidden" name="from" value="list" />
        <input type="hidden" name="orderNumber" value={row.reservedOrderNumber} />
        <input type="hidden" name="outboundId" value={row.reservedOutboundId} />
        <button className="btn btn-sm" title={title}><RotateCcw size={13} />{label}</button>
      </form>
    );
  }
  if (row.reservedExchange && row.reservedIssueId) {
    return (
      <form action={releaseShipgPackages}>
        <input type="hidden" name="issueId" value={row.reservedIssueId} />
        <button className="btn btn-sm" title={title}><RotateCcw size={13} />{label}</button>
      </form>
    );
  }
  return null;
}
