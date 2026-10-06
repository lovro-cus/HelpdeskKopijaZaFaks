import Link from "next/link";
import { ExternalLink, PackageSearch, RotateCcw, Truck, Warehouse } from "lucide-react";

import { markShipgShipped, releaseShipgPackages, requestSupplierExchange } from "@/lib/actions/shipg-allocation";
import { cancelSupplierOrder } from "@/lib/actions/supplier-orders";
import { supplierOrderCode } from "@/lib/supplier-import";
import { itemLabel, parseSupplierItems } from "@/lib/supplier-orders";
import { refreshShipGermanForOrder } from "@/lib/actions/shipgerman-sync";
import { ShipGermanRefreshButton } from "@/components/ShipGermanRefreshButton";
import { ShipgDispatchLink } from "@/components/ShipgDispatchLink";
import { canonicalLabel } from "@/lib/catalog-canonical";
import { ensureCatalog } from "@/lib/catalog-server";
import { loadSettings, loadTextSettings } from "@/lib/config/server";
import { db } from "@/lib/db";
import { isShipgermanMarket } from "@/lib/domain";
import { hasUnsettledPriceDiff } from "@/lib/exchange-price";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { ShipgMatchList, type MatchView } from "@/components/ShipgMatchList";
import { shipCutoff } from "@/lib/ship-cutoff";
import { exchangeDemand, findExactPackageMatches, type MatchPackage } from "@/lib/shipg-matching";
import { getCachedShipGermanParcels } from "@/lib/shipgerman-sync";
import type { Locale } from "@/lib/i18n/shared";

type ExchangeIssue = {
  id: number;
  key: string;
  type: string;
  customerCountryCode: string | null;
  exchangeRound: number;
  currency: string;
  items: {
    name: string; replacementVariant: string | null; replacementName: string | null;
    priceDiffSettled: boolean; qty: number; resolution: string;
  }[];
};

function contents(items: MatchPackage["items"]) {
  // Kanonična oznaka: isti fizični kos med IT in DACH trgom se prikaže enako.
  return items.map((item) => `${item.qty}× ${canonicalLabel(item.name, item.variant)}`).join(", ");
}

export async function ShipGermanExchangeCard({ issue, locale, feedback }: { issue: ExchangeIssue; locale: Locale; feedback?: string }) {
  // Prikaži se, kadar naročilo vsebuje artikel z zamenjavo — tudi če je tip
  // celega naročila refund (mešano naročilo).
  if (!issue.items.some((item) => item.resolution === "exchange")) return null;
  await ensureCatalog();

  const everyRound = await db.shipgAllocation.findMany({
    where: { exchangeIssueId: issue.id },
    include: { shipgReturn: { include: { items: true } }, reservedBy: { select: { name: true } } },
    orderBy: { id: "asc" },
  });
  // Stanje kartice je stanje tekočega kroga; paketi prejšnjih krogov so odšli in
  // stojijo spodaj kot zgodovina — ne zaklenejo nove rezervacije.
  const allocations = everyRound.filter((allocation) => allocation.exchangeRound === issue.exchangeRound);
  const earlier = everyRound.filter((allocation) => allocation.exchangeRound < issue.exchangeRound);
  // Meta fizičnega paketa: pošiljatelj (za lažjo identifikacijo v skladišču) in
  // ali je še v aktivni ShipGerman zalogi — če ga ni več, je odprema potrjena.
  const parcelMeta = allocations.length
    ? new Map((await db.shipGermanCachedParcel.findMany({
        where: { id: { in: allocations.map((allocation) => allocation.externalParcelId) } },
        select: { id: true, sender: true, active: true },
      })).map((parcel) => [parcel.id, parcel] as const))
    : new Map<string, { id: string; sender: string | null; active: boolean }>();
  const supplier = (await loadTextSettings()).supplierName;
  // Naročilo pri dobavitelju za tekoči krog. Preklicano ne šteje — takrat se
  // gumb za naročilo pokaže znova.
  const supplierOrder = await db.supplierOrder.findFirst({
    where: { issueId: issue.id, exchangeRound: issue.exchangeRound, status: { not: "cancelled" } },
    orderBy: { id: "desc" },
  });
  const incompleteTarget = issue.items.some((item) => item.resolution === "exchange" && !item.replacementVariant);
  // Menjava v drug izdelek z neurejeno razliko v ceni ne sme oditi; predlogov
  // paketov zato sploh ne iščemo, da gumba za rezervacijo ni videti.
  const unsettledPrice = hasUnsettledPriceDiff(issue.items, issue.currency);
  const demand = exchangeDemand(issue.items);
  const eligible = isShipgermanMarket(issue.customerCountryCode);
  const countryKnown = Boolean(issue.customerCountryCode);

  let matches: ReturnType<typeof findExactPackageMatches> = [];
  let integrationError: string | null = null;
  if (!allocations.length && eligible && demand.length && !incompleteTarget && !unsettledPrice) {
    const [returns, live, settings] = await Promise.all([
      db.shipgReturn.findMany({
        // Vsa vpisana zaloga je veljavna za menjavo — tudi ročno vpisani paketi
        // iz ShipGermana (vezani na naročilo, ki ni nujno menjava/refund). Točno
        // sestavo zagotovi findExactPackageMatches, ne tip izvornega naročila.
        where: { status: "stocked" },
        include: { items: true, allocation: true },
        orderBy: { stockedAt: "asc" },
      }),
      getCachedShipGermanParcels(),
      loadSettings(),
    ]);
    if (live.length > 0) {
      matches = findExactPackageMatches(demand, returns.map((record) => ({
        id: record.id,
        trackingNumber: record.trackingNumber,
        externalParcelId: record.shipgermanParcelId,
        allocated: Boolean(record.allocation),
        matchQuality: record.matchQuality,
        items: record.items.map((item) => ({
          name: item.name,
          variant: item.variant,
          qty: item.receivedQty > 0 ? item.receivedQty : item.expectedQty,
        })),
      })), live, undefined, undefined, shipCutoff(settings));
    } else {
      const state = await db.shipGermanSyncState.findUnique({ where: { key: "inventory" } });
      integrationError = state?.status === "error" ? state.error : null;
    }
  }

  const target = demand.map((item) => `${item.qty}× ${canonicalLabel(item.name, item.variant)}`).join(", ");
  const shipped = allocations.length > 0 && allocations.every((item) => item.status === "shipped");
  const dispatching = allocations.some((item) => item.status === "dispatching");
  // Odprema čaka potrditev, dokler je kateri paket še v aktivni ShipGerman zalogi.
  const awaitingConfirmation = shipped && allocations.some((allocation) => parcelMeta.get(allocation.externalParcelId)?.active);

  // Serializiran pogled ujemanj za klientski seznam (FIFO vrstni red se ohrani).
  const matchViews: MatchView[] = matches.map((match) => ({
    key: match.packages.map((item) => item.shipgReturnId).join("-"),
    shipgReturnIds: match.packages.map((item) => item.shipgReturnId),
    packages: match.packages.map((item) => ({
      shipgReturnId: item.shipgReturnId,
      parcelId: item.parcel.id,
      sender: item.parcel.sender,
      contents: contents(item.items),
      weightKg: (item.parcel.weightGrams / 1000).toLocaleString(locale, { maximumFractionDigits: 2 }),
      arrivalLabel: formatDate(item.parcel.arrivalDate, locale),
      weightConfidence: item.weightConfidence,
    })),
  }));

  return (
    <section className="card overflow-hidden">
      <div className="px-4 pb-3 pt-3.5">
        <h3 className="caption flex items-center gap-2" style={{ color: "var(--ink)" }}><Warehouse size={14} />{t(locale, "shipg.exchange.title")}</h3>
        {target && (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="caption" style={{ color: "var(--petrol)" }}>{t(locale, "shipg.exchange.lookingFor")}</span>
            <span className="mono text-[12.5px] text-label">{target}</span>
          </div>
        )}
      </div>

      <div className="border-t px-4 py-3.5" style={{ borderColor: "var(--separator)" }}>
        {feedback && ["reserved", "released", "shipped", "refreshed", "supplierRequested", "supplierNoted"].includes(feedback) && (
          <p className="mb-3 text-[12.5px]" style={{ color: "var(--petrol)" }}>{t(locale, `shipg.exchange.feedback.${feedback}` as TranslationKey)}</p>
        )}
        {feedback && ["invalid", "stale", "refreshError", "lowConfidence", "priceDiff", "resolutionPending"].includes(feedback) && (
          <p className="mb-3 text-[12.5px]" style={{ color: "var(--stamp)" }}>{t(locale, `shipg.exchange.feedback.${feedback}` as TranslationKey)}</p>
        )}

        {supplierOrder?.status === "shipped" ? <SupplierState order={supplierOrder} supplier={supplier} locale={locale} />
          : !countryKnown ? <State title={t(locale, "shipg.exchange.countryMissing")} body={t(locale, "shipg.exchange.countryMissingBody")} />
          : !eligible ? (
            <div>
              <State title={t(locale, "shipg.exchange.countryBlocked", { country: issue.customerCountryCode ?? "—" })} body={t(locale, "shipg.exchange.countryBlockedBody")} />
              {supplierOrder ? <div className="mt-3"><SupplierState order={supplierOrder} supplier={supplier} locale={locale} /></div>
                : demand.length > 0 && !incompleteTarget && !unsettledPrice && <SupplierAsk issueId={issue.id} supplier={supplier} locale={locale} />}
            </div>
          )
          : incompleteTarget || !demand.length ? <State title={t(locale, "shipg.exchange.targetMissing")} body={t(locale, "shipg.exchange.targetMissingBody")} />
          : unsettledPrice ? <State title={t(locale, "shipg.exchange.priceDiff")} body={t(locale, "shipg.exchange.priceDiffBody")} />
          : allocations.length ? (
            <div>
              {supplierOrder && (
                <p className="mb-3 border-l-2 py-1 pl-2.5 text-[12.5px]" style={{ borderColor: "var(--warning)", color: "var(--warning)" }}>
                  {t(locale, "shipg.exchange.supplierStillOpen", { supplier, code: supplierOrderCode(supplierOrder.id) })}
                </p>
              )}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[13.5px] font-medium">{t(locale, shipped ? "shipg.exchange.shipped" : dispatching ? "shipg.exchange.dispatching" : "shipg.exchange.reserved")}</div>
                  <div className="mt-0.5 text-[12px] text-label-2">{t(locale, "shipg.exchange.reservedBy", { name: allocations[0].reservedBy?.name ?? "—" })}</div>
                </div>
                <span className="pill pill-ink">{allocations.length} {t(locale, "shipg.exchange.packages")}</span>
              </div>
              {allocations.map((allocation) => {
                const meta = parcelMeta.get(allocation.externalParcelId);
                const confirmed = shipped && !meta?.active;
                return (
                  <div key={allocation.id} className="flex flex-wrap items-center gap-x-2 border-t py-2.5 text-[12.5px]" style={{ borderColor: "var(--separator)" }}>
                    <span className="mono font-medium">ShipGerman {allocation.externalParcelId}</span>
                    {meta?.sender && <span className="text-label-2">· {meta.sender}</span>}
                    <span className="text-label-2">· {allocation.shipgReturn.items.map((item) => `${item.receivedQty || item.expectedQty}× ${canonicalLabel(item.name, item.variant)}`).join(", ")}</span>
                    {shipped && (
                      <span className="pill ml-auto" style={{ borderColor: confirmed ? "var(--success)" : "var(--warning)", color: confirmed ? "var(--success)" : "var(--warning)" }}>
                        {t(locale, confirmed ? "shipg.exchange.shippedConfirmed" : "shipg.exchange.shippedPending")}
                      </span>
                    )}
                  </div>
                );
              })}
              {!shipped && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ShipgDispatchLink
                    issueId={issue.id}
                    label={t(locale, "shipg.exchange.prepare")}
                  />
                  {dispatching && (
                    <form action={markShipgShipped}><input type="hidden" name="issueId" value={issue.id} /><button className="btn btn-sm"><Truck size={14} />{t(locale, "shipg.exchange.markShipped")}</button></form>
                  )}
                  <form action={releaseShipgPackages}><input type="hidden" name="issueId" value={issue.id} /><button className="btn btn-sm"><RotateCcw size={14} />{t(locale, "shipg.exchange.release")}</button></form>
                  <span className="text-[11.5px] text-label-3">{t(locale, "shipg.exchange.prepareHint")}</span>
                </div>
              )}
              {awaitingConfirmation && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form action={refreshShipGermanForOrder}><input type="hidden" name="issueKey" value={issue.key} /><ShipGermanRefreshButton /></form>
                  <span className="text-[11.5px] text-label-3">{t(locale, "shipg.exchange.refreshHint")}</span>
                </div>
              )}
            </div>
          ) : integrationError ? <State title={t(locale, "shipg.exchange.unavailable")} body={t(locale, `shipg.external.error.${integrationError}` as TranslationKey)} />
          : matches.length === 0 ? (
            <div>
              {supplierOrder ? <SupplierState order={supplierOrder} supplier={supplier} locale={locale} /> : (
                <>
                  <State title={t(locale, "shipg.exchange.noMatch")} body={t(locale, "shipg.exchange.noMatchBody")} />
                  {/* Ko paketa ni, ga naročimo pri dobavitelju — en gumb. */}
                  <SupplierAsk issueId={issue.id} supplier={supplier} locale={locale} />
                </>
              )}
            </div>
          )
          : (
            <div>
              {supplierOrder && (
                <p className="mb-3 border-l-2 py-1 pl-2.5 text-[12.5px] font-medium" style={{ borderColor: "var(--warning)", color: "var(--warning)" }}>
                  {t(locale, supplierOrder.status === "exported" ? "shipg.exchange.stockArrivedExported" : "shipg.exchange.stockArrivedOpen", { supplier, code: supplierOrderCode(supplierOrder.id) })}
                </p>
              )}
              <p className="mb-3 text-[12.5px] text-label-2">{t(locale, "shipg.exchange.matches", { count: matches.length })}</p>
              <ShipgMatchList issueId={issue.id} matches={matchViews} />
              {supplierOrder && <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--separator)" }}><SupplierState order={supplierOrder} supplier={supplier} locale={locale} /></div>}
            </div>
          )}
      </div>
      {earlier.length > 0 && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--separator)" }}>
          <p className="caption">{t(locale, "round.history")}</p>
          <ul className="mt-1.5 grid gap-1">
            {earlier.map((allocation) => (
              <li key={allocation.id} className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-label-2">
                <span className="mono text-[11.5px] text-label-3">{t(locale, "round.current", { round: allocation.exchangeRound })}</span>
                <span className="mono">ShipGerman {allocation.externalParcelId}</span>
                <span>· {allocation.shipgReturn.items.map((item) => `${item.receivedQty || item.expectedQty}× ${canonicalLabel(item.name, item.variant)}`).join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="border-t px-4 py-2.5" style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}>
        <Link href="/shipg?view=stock" className="link inline-flex items-center gap-1 text-[12px]">{t(locale, "shipg.exchange.openInventory")}<ExternalLink size={12} /></Link>
      </div>
    </section>
  );
}

function SupplierAsk({ issueId, supplier, locale }: { issueId: number; supplier: string; locale: Locale }) {
  return (
    <form action={requestSupplierExchange} className="mt-3">
      <input type="hidden" name="issueId" value={issueId} />
      <button type="submit" className="btn btn-sm btn-primary">
        <PackageSearch size={14} />
        {t(locale, "shipg.exchange.supplierAsk", { supplier })}
      </button>
      <p className="mt-1.5 text-[11.5px] text-label-3">{t(locale, "shipg.exchange.supplierAskHint", { supplier })}</p>
    </form>
  );
}

function SupplierState({ order, supplier, locale }: {
  order: { id: number; status: string; items: string; tracking: string | null; exportedAt: Date | null; shippedAt: Date | null; createdAt: Date };
  supplier: string;
  locale: Locale;
}) {
  const shipped = order.status === "shipped";
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[13.5px] font-medium">
          {t(locale, shipped ? "shipg.exchange.supplierShipped" : "shipg.exchange.supplierOrdered", { supplier })}
        </span>
        <span className="mono text-[12px] text-label-2">{supplierOrderCode(order.id)}</span>
        <span className={`pill ${shipped ? "" : order.status === "open" ? "pill-petrol" : "pill-ink"}`} style={shipped ? { borderColor: "var(--success)", color: "var(--success)" } : undefined}>
          {shipped
            ? formatDate(order.shippedAt, locale)
            : order.status === "open"
              ? t(locale, "supplier.status.open")
              : t(locale, "supplier.status.exported", { date: formatDate(order.exportedAt, locale) })}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-label-2">{parseSupplierItems(order.items).map(itemLabel).join(", ")}</p>
      {shipped && order.tracking && (
        <p className="mt-1 text-[12.5px]"><span className="text-label-2">{t(locale, "supplier.col.tracking")}: </span><span className="mono">{order.tracking}</span></p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Link href="/dobavitelj" className="btn btn-sm">{t(locale, "shipg.exchange.supplierOpen", { supplier })}</Link>
        {!shipped && (
          <form action={cancelSupplierOrder}>
            <input type="hidden" name="supplierOrderId" value={order.id} />
            <button type="submit" className="btn btn-sm btn-plain">{t(locale, "supplier.cancel")}</button>
          </form>
        )}
        <span className="text-[11.5px] text-label-3">{t(locale, shipped ? "shipg.exchange.supplierShippedHint" : "shipg.exchange.supplierOrderedHint", { supplier })}</span>
      </div>
    </div>
  );
}

function State({ title, body }: { title: string; body: string }) {
  return <div><div className="text-[13.5px] font-medium">{title}</div><p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed text-label-2">{body}</p></div>;
}
