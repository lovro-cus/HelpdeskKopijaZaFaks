"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, ArrowDownToLine, ChevronDown, ExternalLink, GitMerge, Link2, Package, PackageCheck, RotateCcw, Trash2, Truck, Unlink } from "lucide-react";

import { confirmShipgReturn, deleteShipgReturn, linkTicketToShipment, moveShipgToCheck, reconcileTicketWithStock, resolveAlreadyShipped } from "@/lib/actions/shipg";
import { linkShipGermanParcel, unlinkShipGermanParcel } from "@/lib/actions/shipg-linking";
import { imageOf, selectionOf } from "@/lib/catalog";
import { SHIPG_ITEM_CONDITIONS } from "@/lib/domain";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { isBulkEligible } from "@/lib/shipg-bulk";
import { useBulkSelection } from "./ShipgBulkCheck";
import { Notice } from "./ui";

export type AlreadyShipped = {
  /** Zapis, ki paket dejansko nosi. */
  recordId: number;
  parcelId: string;
  dateLabel: string | null;
  tracking: string | null;
  exchangeIssueKey: string | null;
  exchangeOrderNumber: string | null;
  outboundOrderNumber: string | null;
};

export type ShipgReturnView = {
  id: number;
  orderNumber: string;
  /** Krog menjave naročila; od 2 naprej stranka vrača nadomestek, ne prvotnega kosa. */
  exchangeRound: number;
  customerName: string | null;
  trackingNumber: string | null;
  status: string;
  notes: string | null;
  createdAtLabel: string;
  receivedAtLabel: string | null;
  stockedAtLabel: string | null;
  createdByName: string | null;
  verifiedByName: string | null;
  shipgermanParcelId: string | null;
  shipgermanParcel: { id: string; sender: string; trackingNumber: string | null; carrier: string } | null;
  shipgermanLinkLocked: boolean;
  issue: { key: string } | null;
  parcel: { carrierName: string | null; state: string; lastEventText: string | null; checkedAtLabel: string | null } | null;
  items: { id: number; name: string; variant: string | null; expectedQty: number; receivedQty: number; condition: string; note: string | null }[];
  reconcile: ReconcileOption[];
  shippedMatches: ShippedMatchOption[];
  /**
   * Paket tega naročila je že prevzet in odposlan — pod drugim zapisom. To ni
   * ugibanje po imenu pošiljatelja, ampak naša lastna povezava, zato zapisu
   * pove naravnost, da paketa ne bo.
   */
  alreadyShipped: AlreadyShipped | null;
  /** V registru obstaja še en zapis za isto naročilo — možna podvojitev. */
  duplicate: boolean;
};

export type ReconcileOption = {
  stockId: number;
  parcelLabel: string;
  stockedAtLabel: string | null;
  diff: { key: string; label: string; packageQty: number; issueQty: number; state: "match" | "qty" | "extra" | "missing" }[];
  differences: number;
};

export type ShippedMatchOption = {
  parcelId: string;
  sender: string | null;
  dateLabel: string | null;
};

export function ShipgReturnRow({ record, returnTo, hasAvailableShipGermanParcels, hasShippedShipments }: {
  record: ShipgReturnView;
  returnTo: string;
  hasAvailableShipGermanParcels: boolean;
  hasShippedShipments: boolean;
}) {
  const t = useT();
  const checking = record.status === "check" || record.status === "exception";
  const hasReconcile = record.reconcile.length > 0;
  const hasShippedMatch = record.shippedMatches.length > 0;
  const alreadyShipped = record.alreadyShipped;
  // Ročna povezava z že odposlano pošiljko je smiselna le za odprte tickete.
  const canLinkShipped = (record.status === "check" || record.status === "expected") && hasShippedShipments;
  const [expanded, setExpanded] = useState(record.items.length === 0 || hasReconcile || hasShippedMatch || Boolean(alreadyShipped));
  const detailsId = `shipg-details-${record.id}`;
  const bulk = useBulkSelection();
  const bulkEligible = isBulkEligible(record);

  return (
    <article className="shipg-record" data-status={record.status} data-selected={bulk?.selected.has(record.id) ? "true" : undefined}>
      <header className="shipg-record-header">
        <div className="shipg-record-identity flex min-w-0 items-start gap-3">
          {bulk && (
            <input
              type="checkbox"
              checked={bulk.selected.has(record.id)}
              onChange={() => bulk.toggle(record.id)}
              disabled={!bulkEligible}
              title={t(bulkEligible ? "shipg.bulk.select" : "shipg.bulk.unavailable")}
              aria-label={`${t("shipg.bulk.select")}: #${record.orderNumber}`}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--petrol)] disabled:cursor-not-allowed disabled:opacity-30"
            />
          )}
          <div className="min-w-0">
            {record.issue ? (
              <Link href={`/orders/${record.issue.key}`} className="mono link text-[16px] font-semibold leading-none">#{record.orderNumber}</Link>
            ) : <p className="mono text-[16px] font-semibold leading-none">#{record.orderNumber}</p>}
            <p className="mt-1 truncate text-[12.5px] font-medium">{record.customerName || "—"}</p>
          </div>
        </div>

        <div className="min-w-0">
          {record.items.length === 0 ? <span className="text-[12.5px] text-label-2">{t("shipg.noReturnItems")}</span> : (
            <ul className="shipg-record-products" aria-label={t("shipg.items")}>
              {record.items.map((item) => (
                <li key={item.id} className="flex min-w-0 items-center gap-2">
                  <ProductThumb name={item.name} variant={item.variant} />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium" title={item.name}>{item.name}</p>
                    <p className="mono mt-0.5 truncate text-[10.5px] text-label-2" title={item.variant ?? undefined}>
                      {item.variant || "—"} · ×{record.status === "expected" || item.condition === "pending" ? item.expectedQty : item.receivedQty}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shipg-record-actions">
          {record.exchangeRound > 1 && (
            <span className="shipg-reconcile-hint" title={t("round.registerHint")} style={{ borderColor: "var(--petrol)", color: "var(--petrol)" }}>
              <RotateCcw size={12} /> {t("round.current", { round: record.exchangeRound })}
            </span>
          )}
          {record.duplicate && (
            <span className="shipg-reconcile-hint" title={t("shipg.duplicate.hint")} style={{ borderColor: "var(--warning)", color: "var(--warning)" }}>
              <AlertTriangle size={12} /> {t("shipg.duplicate.badge")}
            </span>
          )}
          {hasReconcile && (
            <span className="shipg-reconcile-hint" title={t("shipg.reconcile.hint")}>
              <GitMerge size={12} /> {t("shipg.reconcile.badge")}
            </span>
          )}
          {alreadyShipped && (
            <span className="shipg-reconcile-hint" title={t("shipg.alreadyShipped.hint")} style={{ borderColor: "var(--warning)", color: "var(--warning)" }}>
              <Truck size={12} /> {t("shipg.alreadyShipped.badge")}
            </span>
          )}
          {hasShippedMatch && !alreadyShipped && (
            <span className="shipg-reconcile-hint" title={t("shipg.shippedLink.hint")}>
              <Truck size={12} /> {t("shipg.shippedLink.badge")}
            </span>
          )}
          {record.shipgermanParcelId && (
            <span className="shipg-external-match min-w-0 max-w-full" data-state="matched" title={shipGermanParcelLabel(record)}>
              <Link2 size={12} /> <span className="truncate">{t("shipg.internalLink.badge", { package: record.shipgermanParcel?.trackingNumber || record.shipgermanParcelId })}</span>
            </span>
          )}
          <StatusStamp status={record.status} />
          <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls={detailsId} className="btn btn-sm whitespace-nowrap">
            {t(expanded ? "shipg.lessDetails" : "shipg.moreDetails")}
            <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </header>

      {expanded && (
        <>
        {hasReconcile && <ReconcilePanel record={record} returnTo={returnTo} />}
        {alreadyShipped && <AlreadyShippedPanel record={record} shipped={alreadyShipped} />}
        {canLinkShipped && !alreadyShipped && <ShippedLinkPanel record={record} />}
        <form id={detailsId} action={checking ? confirmShipgReturn : undefined} className="border-t" style={{ borderColor: "var(--rule)" }}>
          <input type="hidden" name="shipgReturnId" value={record.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="grid gap-4 px-4 py-3 sm:grid-cols-3">
            <div className="min-w-0">
              <p className="field-label">{t("shipg.tracking")}</p>
              <p className="mono mt-1 truncate text-[11.5px]">{record.trackingNumber || "—"}</p>
              {record.parcel && (
                <div className="mt-1 space-y-0.5 text-[11px] text-label-2">
                  <p>{t("shipg.trackingState", { carrier: record.parcel.carrierName || t("shipg.carrierUnknown"), state: t(`parcel.state.${record.parcel.state}` as TranslationKey) })}</p>
                  {record.parcel.lastEventText && <p className="line-clamp-2" title={record.parcel.lastEventText}>{t("shipg.lastEvent", { event: record.parcel.lastEventText })}</p>}
                  {record.parcel.checkedAtLabel && <p>{t("shipg.lastChecked", { date: record.parcel.checkedAtLabel })}</p>}
                </div>
              )}
            </div>
            <div>
              <p className="field-label">{t("shipg.timeline")}</p>
              <div className="mt-1 space-y-1 text-[11px] text-label-2">
                <p>{t("shipg.created")}: <span className="mono">{record.createdAtLabel}</span></p>
                {record.receivedAtLabel && <p>{t("shipg.received")}: <span className="mono">{record.receivedAtLabel}</span></p>}
                {record.stockedAtLabel && <p>{t("shipg.stockedAt")}: <span className="mono">{record.stockedAtLabel}</span></p>}
                {record.verifiedByName && <p>{t("shipg.by", { name: record.verifiedByName })}</p>}
              </div>
            </div>
            <div>
              <p className="field-label">{t("shipg.notes")}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-label-2">{record.notes || "—"}</p>
            </div>
          </div>

          {record.items.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3" style={{ borderColor: "var(--rule)" }}>
              <Notice kind="error">{t("shipg.noReturnItems")}</Notice>
              {record.issue && <Link href={`/shipg/new?order=${encodeURIComponent(record.orderNumber)}`} className="btn btn-sm">{t("shipg.addExpectedItem")}</Link>}
            </div>
          ) : checking ? (
            <div className="shipg-items border-t" style={{ borderColor: "var(--rule)" }}>
              <div className="hidden grid-cols-[minmax(220px,1.6fr)_90px_120px_minmax(150px,1fr)] gap-3 border-b px-4 py-2 sm:grid">
                <span className="caption">{t("shipg.items")}</span><span className="caption">{t("shipg.receivedQty")}</span><span className="caption">{t("shipg.condition")}</span><span className="caption">{t("shipg.itemNote")}</span>
              </div>
              {record.items.map((item) => (
                <div key={item.id} className="grid gap-3 px-4 py-2.5 sm:grid-cols-[minmax(220px,1.6fr)_90px_120px_minmax(150px,1fr)] sm:items-center">
                  <div className="flex min-w-0 items-center gap-2">
                    <ProductThumb name={item.name} variant={item.variant} small />
                    <div className="min-w-0"><p className="truncate text-[12.5px] font-medium">{item.name}</p><p className="mono mt-0.5 text-[10.5px] text-label-2">{item.variant || "—"} · {t("shipg.expectedQty")} {item.expectedQty}</p></div>
                  </div>
                  <label><span className="field-label sm:hidden">{t("shipg.receivedQty")}</span><input name={`receivedQty.${item.id}`} type="number" min={0} max={9999} defaultValue={item.condition === "pending" ? item.expectedQty : item.receivedQty} className="field mono" aria-label={`${t("shipg.receivedQty")}: ${item.name}`} /></label>
                  <label><span className="field-label sm:hidden">{t("shipg.condition")}</span><select name={`condition.${item.id}`} defaultValue={item.condition === "pending" ? "good" : item.condition} className="field" aria-label={`${t("shipg.condition")}: ${item.name}`}>{SHIPG_ITEM_CONDITIONS.filter((condition) => condition !== "pending").map((condition) => <option key={condition} value={condition}>{t(`shipg.condition.${condition}` as TranslationKey)}</option>)}</select></label>
                  <label><span className="field-label sm:hidden">{t("shipg.itemNote")}</span><input name={`note.${item.id}`} defaultValue={item.note ?? ""} maxLength={300} className="field" aria-label={`${t("shipg.itemNote")}: ${item.name}`} /></label>
                </div>
              ))}
            </div>
          ) : null}

          {record.status === "stocked" && (
            <div className="flex flex-wrap items-end justify-between gap-3 border-t px-4 py-3" style={{ borderColor: "var(--rule)" }}>
              <div className="min-w-0 max-w-[520px]">
                <p className="field-label">{t("shipg.internalLink.title")}</p>
                {record.shipgermanParcelId ? (
                  <p className="mt-1 truncate text-[11.5px] text-label-2" title={shipGermanParcelLabel(record)}>
                    {t("shipg.internalLink.current", { package: shipGermanParcelLabel(record) })}
                  </p>
                ) : (
                  <p className="mt-1 text-[11.5px] text-label-2">
                    {t(record.shipgermanLinkLocked ? "shipg.internalLink.locked" : "shipg.internalLink.description")}
                  </p>
                )}
              </div>

              {record.shipgermanParcelId ? (
                <div className="flex items-center gap-2">
                  <input type="hidden" name="shipgermanParcelId" value={record.shipgermanParcelId} />
                  <PendingButton
                    formAction={unlinkShipGermanParcel}
                    disabled={record.shipgermanLinkLocked}
                    label={t("shipg.external.unlink")}
                    icon={<Unlink size={13} />}
                  />
                </div>
              ) : (
                <div className="flex w-full max-w-[560px] flex-wrap items-end gap-2 sm:flex-nowrap">
                  <label className="min-w-0 flex-1">
                    <span className="field-label">{t("shipg.internalLink.input")}</span>
                    <input
                      name="shipgermanParcelId"
                      list="shipgerman-available-parcels"
                      disabled={record.shipgermanLinkLocked || !hasAvailableShipGermanParcels}
                      placeholder={t(hasAvailableShipGermanParcels ? "shipg.internalLink.placeholder" : "shipg.internalLink.none")}
                      className="field mono"
                      autoComplete="off"
                    />
                  </label>
                  <PendingButton
                    primary
                    formAction={linkShipGermanParcel}
                    disabled={record.shipgermanLinkLocked || !hasAvailableShipGermanParcels}
                    label={t("shipg.external.linkConfirm")}
                    icon={<Link2 size={13} />}
                  />
                </div>
              )}
            </div>
          )}

          <footer className="flex flex-wrap items-end justify-end gap-2 border-t px-4 py-2.5" style={{ borderColor: "var(--rule)", background: "var(--sheet-2)" }}>
            {!record.shipgermanParcelId && !record.shipgermanLinkLocked && (
              <div className={checking ? "" : "mr-auto"}>
                <DeleteControl
                  label={t(record.status === "stocked" ? "shipg.delete" : "shipg.removeFromRegister")}
                  confirmLabel={t(record.status === "stocked" ? "shipg.deleteConfirm" : "shipg.removeFromRegisterConfirm")}
                  cancelLabel={t("common.cancel")}
                  formAction={deleteShipgReturn}
                />
              </div>
            )}
            {checking && <label className="mr-auto w-full max-w-[320px]"><span className="field-label">{t("shipg.checkNote")}</span><input name="notes" defaultValue={record.notes ?? ""} maxLength={1000} className="field" /></label>}
            {record.issue && <Link href={`/orders/${record.issue.key}`} className="btn btn-sm">{t("shipg.openOrder")} <ExternalLink size={13} /></Link>}
            {record.status === "expected" && <PendingButton formAction={moveShipgToCheck} label={t("shipg.markForCheck")} icon={<ArrowDownToLine size={14} />} />}
            {checking && <PendingButton primary label={t("shipg.confirmCheck")} icon={<PackageCheck size={14} />} />}
            {record.status === "stocked" && <PendingButton formAction={moveShipgToCheck} label={t("shipg.recheck")} icon={<RotateCcw size={14} />} />}
          </footer>
        </form>
        </>
      )}
    </article>
  );
}

/** Ponudba za združitev odprtega ticketa z že vpisano ShipGerman zalogo istega
 *  naročila (ročno dodano prek "Dodaj staro naročilo"). Fizični paket ostane vir
 *  resnice; razlike v postavkah so označene po GitHub-slog diffu pred povezavo. */
function ReconcilePanel({ record, returnTo }: { record: ShipgReturnView; returnTo: string }) {
  const t = useT();
  return (
    <section className="shipg-reconcile border-t">
      <div className="flex items-center gap-2 px-4 pt-3">
        <GitMerge size={14} className="text-accent" strokeWidth={1.8} />
        <h3 className="text-[13px] font-semibold">{t("shipg.reconcile.title")}</h3>
      </div>
      <p className="mt-1 max-w-[72ch] px-4 text-[11.5px] leading-relaxed text-label-2">{t("shipg.reconcile.description")}</p>

      {record.reconcile.map((option) => (
        <div key={option.stockId} className="mt-2.5 border-t px-4 py-3" style={{ borderColor: "var(--rule)" }}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="mono text-[12px] font-medium">{option.parcelLabel}</span>
            {option.stockedAtLabel && <span className="mono text-[10.5px] text-label-3">{option.stockedAtLabel}</span>}
          </div>

          <div className="mt-2 overflow-x-auto">
            <table className="merge-diff">
              <thead><tr>
                <th>{t("shipg.merge.item")}</th>
                <th style={{ textAlign: "right" }}>{t("shipg.merge.inPackage")}</th>
                <th style={{ textAlign: "right" }}>{t("shipg.merge.inOrder")}</th>
                <th style={{ textAlign: "right" }}>{t("shipg.merge.state")}</th>
              </tr></thead>
              <tbody>
                {option.diff.map((row) => (
                  <tr key={row.key} data-state={row.state}>
                    <td>{row.label}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{row.packageQty || "—"}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{row.issueQty || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="merge-tag" data-state={row.state}>{t(`shipg.merge.tag.${row.state}` as TranslationKey)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <form action={reconcileTicketWithStock}>
              <input type="hidden" name="ticketId" value={record.id} />
              <input type="hidden" name="stockId" value={option.stockId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <PendingButton primary label={t("shipg.reconcile.action")} icon={<GitMerge size={14} />} />
            </form>
            <span className="text-[11px] text-label-3">
              {option.differences === 0 ? t("shipg.merge.clean") : t("shipg.merge.differences", { count: option.differences })}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}

/**
 * Paket tega naročila je že prišel in odšel — pod drugim zapisom registra.
 * Fizičnega paketa temu zapisu ne moremo pripisati (en paket, en zapis), zato
 * ponuja eno samo dejanje: zapri ga in v niti ticketa pusti sled, kam je paket
 * šel. Brez tega bi zapis večno visel v "Za preverit".
 */
function AlreadyShippedPanel({ record, shipped }: { record: ShipgReturnView; shipped: AlreadyShipped }) {
  const t = useT();
  return (
    <section className="shipg-reconcile border-t" style={{ borderTopColor: "var(--warning)" }}>
      <div className="flex items-center gap-2 px-4 pt-3">
        <Truck size={14} style={{ color: "var(--warning)" }} strokeWidth={1.8} />
        <h3 className="text-[13px] font-semibold">{t("shipg.alreadyShipped.title")}</h3>
      </div>
      <p className="mt-1 max-w-[72ch] px-4 text-[11.5px] leading-relaxed text-label-2">
        {t("shipg.alreadyShipped.description", { order: record.orderNumber })}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t px-4 py-2.5 text-[11.5px]" style={{ borderColor: "var(--rule)" }}>
        <span className="mono font-medium">ShipGerman {shipped.parcelId}</span>
        {shipped.dateLabel && <span className="text-label-2">{t("shipg.alreadyShipped.on", { date: shipped.dateLabel })}</span>}
        {shipped.tracking && <span className="mono text-label-3">{shipped.tracking}</span>}
        {shipped.exchangeIssueKey && shipped.exchangeOrderNumber && (
          <span className="inline-flex items-center gap-1.5">
            {t("shipg.alreadyShipped.forExchange")}
            <Link href={`/orders/${shipped.exchangeIssueKey}`} className="link mono">#{shipped.exchangeOrderNumber}</Link>
          </span>
        )}
        {shipped.outboundOrderNumber && (
          <span className="inline-flex items-center gap-1.5">
            {t("shipg.alreadyShipped.forOutbound")}
            <span className="mono">#{shipped.outboundOrderNumber}</span>
          </span>
        )}
      </div>

      <form action={resolveAlreadyShipped} className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5" style={{ borderColor: "var(--rule)" }}>
        <input type="hidden" name="ticketId" value={record.id} />
        <input type="hidden" name="siblingId" value={shipped.recordId} />
        <span className="max-w-[52ch] text-[11.5px] text-label-3">{t("shipg.alreadyShipped.actionHint")}</span>
        <span className="ml-auto"><PendingButton primary label={t("shipg.alreadyShipped.action")} icon={<Truck size={13} />} /></span>
      </form>
    </section>
  );
}

/** Ročna povezava odprtega ticketa z ŽE ODPOSLANO pošiljko (paket je bil poslan
 *  pred sistemom). Predlaga pošiljke, kjer se pošiljatelj ujema s stranko, in
 *  ponuja ročno iskanje. Ob povezavi ticket dobi terminalni status in izgine iz
 *  registra. */
function ShippedLinkPanel({ record }: { record: ShipgReturnView }) {
  const t = useT();
  return (
    <section className="shipg-reconcile border-t">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Truck size={14} className="text-accent" strokeWidth={1.8} />
        <h3 className="text-[13px] font-semibold">{t("shipg.shippedLink.title")}</h3>
      </div>
      <p className="mt-1 max-w-[72ch] px-4 text-[11.5px] leading-relaxed text-label-2">{t("shipg.shippedLink.description")}</p>

      {record.shippedMatches.length > 0 && (
        <div className="mt-2 border-t px-4 py-2.5" style={{ borderColor: "var(--rule)" }}>
          <p className="field-label mb-1.5">{t("shipg.shippedLink.suggested")}</p>
          <div className="flex flex-col gap-1.5">
            {record.shippedMatches.map((match) => (
              <form key={match.parcelId} action={linkTicketToShipment} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="ticketId" value={record.id} />
                <input type="hidden" name="parcelId" value={match.parcelId} />
                <span className="mono text-[12px] font-medium">ShipGerman {match.parcelId}</span>
                {match.sender && <span className="text-[11.5px] text-label-2">· {match.sender}</span>}
                {match.dateLabel && <span className="mono text-[10.5px] text-label-3">{match.dateLabel}</span>}
                <span className="ml-auto"><PendingButton primary label={t("shipg.shippedLink.action")} icon={<Truck size={13} />} /></span>
              </form>
            ))}
          </div>
        </div>
      )}

      <form action={linkTicketToShipment} className="mt-2 flex flex-wrap items-end gap-2 border-t px-4 py-2.5" style={{ borderColor: "var(--rule)" }}>
        <input type="hidden" name="ticketId" value={record.id} />
        <label className="min-w-0 flex-1">
          <span className="field-label">{t("shipg.shippedLink.manual")}</span>
          <input name="parcelId" list="shipped-shipments-available" placeholder={t("shipg.shippedLink.placeholder")} className="field mono" autoComplete="off" required />
        </label>
        <PendingButton label={t("shipg.external.linkConfirm")} icon={<Link2 size={13} />} />
      </form>
    </section>
  );
}

function ProductThumb({ name, variant, small }: { name: string; variant: string | null; small?: boolean }) {
  const src = imageOf(name, 96, selectionOf(name, variant ?? ""));
  return (
    <span aria-hidden className={`flex ${small ? "h-9 w-9" : "h-11 w-11"} shrink-0 items-center justify-center overflow-hidden border`} style={{ borderColor: "var(--separator)", background: "var(--surface)" }}>
      {src ? (
        // Shopify CDN sliko že zmanjša; Next posredovanje bi bilo odveč.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : <Package size={small ? 15 : 18} className="text-label-3" />}
    </span>
  );
}

function StatusStamp({ status }: { status: string }) {
  const t = useT();
  const Icon = status === "exception" ? AlertTriangle : status === "stocked" ? PackageCheck : ArrowDownToLine;
  return <span className="shipg-status" data-status={status}><Icon size={13} />{t(`shipg.view.${status}` as TranslationKey)}</span>;
}

function shipGermanParcelLabel(record: ShipgReturnView) {
  if (!record.shipgermanParcel) return record.shipgermanParcelId || "—";
  return `${record.shipgermanParcel.sender || "—"} · ${record.shipgermanParcel.trackingNumber || record.shipgermanParcel.id} · ${record.shipgermanParcel.carrier}`;
}

function PendingButton({ label, icon, primary, formAction, disabled }: { label: string; icon: React.ReactNode; primary?: boolean; disabled?: boolean; formAction?: (data: FormData) => void | Promise<void> }) {
  const { pending } = useFormStatus();
  return <button type="submit" formAction={formAction} disabled={pending || disabled} className={`btn btn-sm ${primary ? "btn-primary" : ""}`}>{icon}{pending ? "…" : label}</button>;
}

function DeleteControl({ label, confirmLabel, cancelLabel, formAction }: {
  label: string;
  confirmLabel: string;
  cancelLabel: string;
  formAction: (data: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} disabled={pending} className="btn btn-sm btn-destructive">
        <Trash2 size={14} /> {label}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="btn btn-sm">{cancelLabel}</button>
      <button type="submit" formAction={formAction} disabled={pending} className="btn btn-sm btn-destructive">
        <Trash2 size={14} /> {pending ? "…" : confirmLabel}
      </button>
    </span>
  );
}
