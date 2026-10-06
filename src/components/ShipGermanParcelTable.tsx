import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowUp, Check, CircleHelp, Link2, PackagePlus, PackageX, ShieldQuestion, Unlink } from "lucide-react";

import { linkShipGermanParcel, setShipgMatchQuality, unlinkShipGermanParcel } from "@/lib/actions/shipg-linking";
import { asMatchQuality, MATCH_QUALITIES } from "@/lib/domain";
import { refreshShipGermanInventory, toggleShipGermanUnidentifiable } from "@/lib/actions/shipgerman-sync";
import type { ShipGermanParcel } from "@/lib/shipgerman";
import { t } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/shared";
import { EmptyState, Notice } from "./ui";
import { ShipGermanRefreshButton } from "./ShipGermanRefreshButton";

export type ShipGermanMatch = {
  shipgReturnId: number;
  orderNumber: string;
  customerName: string | null;
  issueKey: string | null;
  status: string;
  source: string;
  /** Gotovost, da ta paket res pripada temu naročilu. */
  quality: string;
  items: { name: string; variant: string | null; qty: number }[];
};

export type ShipGermanLinkCandidate = {
  id: number;
  orderNumber: string;
  customerName: string | null;
  status: string;
  itemSummary: string;
};

type ExternalParcel = ShipGermanParcel & { unidentifiable: boolean };

export function ShipGermanParcelTable({ parcels, fetchedAt, syncError, matches, candidates, locale, sort, sortHref, filterActive, filterHref, unidentifiableTotal, returnTo }: {
  parcels: ExternalParcel[];
  fetchedAt: Date | null;
  syncError: string | null;
  matches: Map<string, ShipGermanMatch>;
  candidates: ShipGermanLinkCandidate[];
  locale: Locale;
  sort: "newest" | "oldest";
  sortHref: string;
  filterActive: boolean;
  filterHref: string;
  unidentifiableTotal: number;
  returnTo: string;
}) {
  return (
    <div className="shipgerman-register">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5">
        <p className="text-[11.5px] text-label-2">{t(locale, "shipg.external.liveDescription")}</p>
        <div className="flex items-center gap-3">
          <Link
            href={filterHref}
            className={`shipgerman-filter-chip ${filterActive ? "is-active" : ""}`}
            data-active={filterActive}
            title={t(locale, filterActive ? "shipg.external.unidentifiable.showAll" : "shipg.external.unidentifiable.filter")}
          >
            <PackageX size={12} />
            {t(locale, "shipg.external.unidentifiable.filter")}
            <span className="mono">{unidentifiableTotal}</span>
          </Link>
          <span className="mono text-[10.5px] text-label-2">
            {fetchedAt ? t(locale, "shipg.external.updated", { date: formatDateTime(fetchedAt, locale) }) : t(locale, "shipg.external.neverUpdated")}
          </span>
          <form action={refreshShipGermanInventory}><ShipGermanRefreshButton /></form>
        </div>
      </div>

      {syncError && <div className="border-b px-3 py-2.5"><Notice kind="error">{t(locale, `shipg.external.error.${syncError}` as TranslationKey)}</Notice></div>}

      {parcels.length === 0 ? <EmptyState title={t(locale, "shipg.external.emptyCached")} /> : <div className="overflow-x-auto">
        <table className="shipgerman-table">
          <thead><tr>
            <th aria-sort={sort === "oldest" ? "ascending" : "descending"}>
              <Link href={sortHref} className="shipgerman-sort" title={t(locale, sort === "oldest" ? "shipg.external.sortOldest" : "shipg.external.sortNewest")}>
                {t(locale, "shipg.external.arrival")}
                {sort === "oldest" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              </Link>
            </th><th>{t(locale, "shipg.external.sender")}</th><th>{t(locale, "shipg.external.tracking")}</th><th>{t(locale, "shipg.external.dimensions")}</th><th>{t(locale, "shipg.external.weight")}</th><th>{t(locale, "shipg.external.register")}</th>
          </tr></thead>
          <tbody>{parcels.map((parcel) => <ShipGermanParcelRow key={parcel.id} parcel={parcel} match={matches.get(parcel.id) ?? null} candidates={candidates} locale={locale} returnTo={returnTo} />)}</tbody>
        </table>
      </div>}
    </div>
  );
}

function ShipGermanParcelRow({ parcel, match, candidates, locale, returnTo }: {
  parcel: ExternalParcel;
  match: ShipGermanMatch | null;
  candidates: ShipGermanLinkCandidate[];
  locale: Locale;
  returnTo: string;
}) {
  const trackingState = match
    ? "matched"
    : parcel.unidentifiable
      ? "unidentifiable"
      : parcel.trackingNumber ? "missing" : "unknown";
  const Icon = trackingState === "matched" ? Check
    : trackingState === "unidentifiable" ? PackageX
      : trackingState === "missing" ? AlertTriangle : CircleHelp;
  const itemSummary = match?.items.map((item) => `${item.qty}× ${item.name}${item.variant ? ` · ${item.variant}` : ""}`).join(", ") ?? "";

  return (
    <tr>
      <td data-label={t(locale, "shipg.external.arrival")}><span className="mono">{formatDateTime(parcel.arrivalDate, locale)}</span><span className="mono block text-[9.5px] text-label-2">ID {parcel.id}</span></td>
      <td data-label={t(locale, "shipg.external.sender")}><span className="font-medium">{parcel.sender || "—"}</span>{parcel.location && <span className="mono block text-[9.5px] text-label-2">{parcel.location}</span>}</td>
      <td data-label={t(locale, "shipg.external.tracking")}><span className="mono block text-[11.5px]">{parcel.trackingNumber || t(locale, "shipg.external.unknown")}</span><span className="block text-[10.5px] text-label-2">{parcel.carrier}</span></td>
      <td data-label={t(locale, "shipg.external.dimensions")} className="mono">{parcel.dimensionsMm.map(formatCentimetres).join(" × ")} cm</td>
      <td data-label={t(locale, "shipg.external.weight")} className="mono">{formatKilograms(parcel.weightGrams, locale)} kg</td>
      <td data-label={t(locale, "shipg.external.register")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="shipg-external-match" data-state={trackingState}><Icon size={12} /> {t(locale, `shipg.external.match.${trackingState}`)}</span>
        </div>
        {match ? (
          <div className="mt-1.5 max-w-[330px] text-[10.5px] text-label-2">
            <p className="truncate">
              {match.issueKey ? <Link href={`/orders/${match.issueKey}`} className="link mono">#{match.orderNumber}</Link> : <span className="mono">#{match.orderNumber}</span>}
              {" · "}<span className="font-medium text-label">{match.customerName || "—"}</span>
            </p>
            <p className="mt-0.5 line-clamp-2" title={itemSummary}>{itemSummary || t(locale, "shipg.noReturnItems")}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{t(locale, `shipg.view.${match.status}` as TranslationKey)} · {t(locale, `shipg.external.link.source.${match.source}` as TranslationKey)}</span>
              <form action={unlinkShipGermanParcel}>
                <input type="hidden" name="shipgermanParcelId" value={parcel.id} />
                <button className="link inline-flex items-center gap-1 text-[10.5px]"><Unlink size={10} />{t(locale, "shipg.external.unlink")}</button>
              </form>
            </div>
            <MatchQualityControl shipgReturnId={match.shipgReturnId} quality={match.quality} locale={locale} returnTo={returnTo} />
          </div>
        ) : (
          <div className="mt-1.5 max-w-[390px]">
            <div className="flex flex-wrap gap-2">
              <Link href={`/shipg/new?shipgermanParcelId=${encodeURIComponent(parcel.id)}`} className="btn btn-sm whitespace-nowrap">
                <PackagePlus size={12} />{t(locale, "shipg.manualStock.open")}
              </Link>
              <form action={toggleShipGermanUnidentifiable}>
                <input type="hidden" name="shipgermanParcelId" value={parcel.id} />
                <input type="hidden" name="unidentifiable" value={parcel.unidentifiable ? "0" : "1"} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button className={`btn btn-sm whitespace-nowrap ${parcel.unidentifiable ? "shipgerman-unident-active" : ""}`}>
                  <PackageX size={12} />{t(locale, parcel.unidentifiable ? "shipg.external.unidentifiable.clear" : "shipg.external.unidentifiable.mark")}
                </button>
              </form>
            </div>
            <details className="mt-2 max-w-[330px]">
            <summary className="btn btn-sm w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden"><Link2 size={12} />{t(locale, "shipg.external.link")}</summary>
            <form action={linkShipGermanParcel} className="mt-2 flex min-w-[290px] items-end gap-2">
              <input type="hidden" name="shipgermanParcelId" value={parcel.id} />
              <label className="min-w-0 flex-1">
                <span className="field-label">{t(locale, "shipg.external.linkRecord")}</span>
                <select name="shipgReturnId" required className="field">
                  <option value="">{t(locale, candidates.length ? "shipg.external.linkChoose" : "shipg.external.linkNone")}</option>
                  {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>#{candidate.orderNumber} · {candidate.customerName || "—"} · {candidate.itemSummary || t(locale, "shipg.noReturnItems")}</option>)}
                </select>
              </label>
              <label className="w-[104px] shrink-0">
                <span className="field-label">{t(locale, "matchQuality.label")}</span>
                <select name="matchQuality" defaultValue="high" className="field">
                  {MATCH_QUALITIES.map((quality) => (
                    <option key={quality} value={quality}>{t(locale, `matchQuality.${quality}` as TranslationKey)}</option>
                  ))}
                </select>
              </label>
              <button disabled={!candidates.length} className="btn btn-primary btn-sm">{t(locale, "shipg.external.linkConfirm")}</button>
            </form>
            </details>
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * Gotovost ujemanja: pri visoki je vrstica tiha, pri nižji nosi opozorilo, ker
 * tak paket ne sme ven. Spreminjanje je skrito v razkritje — dejanje je redko,
 * pregled zaloge pa mora ostati berljiv.
 */
function MatchQualityControl({ shipgReturnId, quality, locale, returnTo }: {
  shipgReturnId: number;
  quality: string;
  locale: Locale;
  returnTo: string;
}) {
  const current = asMatchQuality(quality);
  return (
    <details className="mt-1">
      <summary className="inline-flex w-fit cursor-pointer list-none items-center gap-1.5 text-[10.5px] [&::-webkit-details-marker]:hidden">
        {current === "high" ? (
          <span className="text-label-3">{t(locale, "matchQuality.label")}: {t(locale, "matchQuality.high")}</span>
        ) : (
          <span className="pill" style={{ borderColor: "var(--warning)", color: "var(--warning)" }}>
            <ShieldQuestion size={11} />{t(locale, `matchQuality.${current}` as TranslationKey)}
          </span>
        )}
      </summary>
      <form action={setShipgMatchQuality} className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <input type="hidden" name="shipgReturnId" value={shipgReturnId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        {MATCH_QUALITIES.map((option) => (
          <button
            key={option}
            name="matchQuality"
            value={option}
            className="shipgerman-filter-chip"
            data-active={current === option ? "true" : "false"}
          >
            {t(locale, `matchQuality.${option}` as TranslationKey)}
          </button>
        ))}
        <span className="text-[10.5px] text-label-3">{t(locale, "matchQuality.hint")}</span>
      </form>
    </details>
  );
}

function formatCentimetres(millimetres: number) {
  return Number.isInteger(millimetres / 10) ? String(millimetres / 10) : (millimetres / 10).toFixed(1);
}

function formatKilograms(grams: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "sl" ? "sl-SI" : "en-GB", { maximumFractionDigits: 3 }).format(grams / 1000);
}

function formatDateTime(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "sl" ? "sl-SI" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Ljubljana" }).format(date);
}
