"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, FileText } from "lucide-react";

import { useLocale, useT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/shared";

export type ShippedRow = {
  /** ID posiljke iz ShipGermana. */
  id: string;
  parcelId: string | null;
  sender: string | null;
  dateLabel: string | null;
  status: string;
  tracking: string | null;
  trackingLink: string | null;
  shipMethod: string | null;
  price: number | null;
  currency: string;
  invoiceAvailable: boolean;
  /** Kako je posiljka nastala: skozi Desk, pred njegovim obstojem, ali mimo njega. */
  origin: "system" | "preSystem" | "outside";
  /** Interni podatki (samo za sistemske posiljke). */
  contents: string | null;
  sourceOrderNumber: string | null;
  sourceIssueKey: string | null;
  orderNumber: string | null;
  issueKey: string | null;
  /** Cilj pri odpremi novega narocila (ta ticketa nima). */
  outboundOrderNumber: string | null;
  byName: string | null;

  /** Vse, kar o posiljki se vrne ShipGerman — za razprto vrstico. */
  weightGrams: number | null;
  dimensionsMm: [number, number, number] | null;
  insurance: number | null;
  incoterm: string | null;
  kind: string | null;
  isEU: boolean | null;
  isVAT: boolean | null;
  isPickupPoint: boolean | null;
  isConsolidation: boolean | null;
  locations: string | null;
  altTrackings: string | null;
  plannedLabel: string | null;
  shippedLabel: string | null;

  /** Podatki fizicnega paketa ob prihodu v skladisce. */
  parcelTracking: string | null;
  parcelCarrier: string | null;
  parcelBarcode: string | null;
  parcelArrivalLabel: string | null;
  parcelDwellDays: number | null;
};

const rightAlign = { textAlign: "right" as const };

function formatPrice(price: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === "sl" ? "sl-SI" : "en-GB", { style: "currency", currency }).format(price);
}

function decimal(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "sl" ? "sl-SI" : "en-GB", { maximumFractionDigits: 1 }).format(value);
}

/**
 * Ena odposlana posiljka. Puscica razpre vse, kar o njej vrne ShipGerman: v
 * tabeli je prostora za devet stolpcev, podatkov pa je dvakrat toliko, in
 * redko rabljeni (carina, mere, prihodna stevilka) ne smejo iz nje izriniti
 * tistih, ki se berejo vsak dan.
 */
export function ShipgShippedRow({ row, columns }: { row: ShippedRow; columns: number }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const dash = <span className="text-label-3">&mdash;</span>;

  return (
    <>
      <tr key={row.id} data-system={row.origin === "system" ? "true" : "false"}>
        <td data-label={t("shipg.shipped.parcel")}>
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className="btn btn-sm px-1.5"
              aria-expanded={open}
              title={t(open ? "shipg.shipped.less" : "shipg.shipped.more")}
              aria-label={t(open ? "shipg.shipped.less" : "shipg.shipped.more")}
            >
              <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : undefined }} />
            </button>
            <span className="mono font-medium">ShipGerman {row.parcelId ?? row.id}</span>
            {/* Fotografija paketa se naloži šele ob kliku: slike so
                velike (nekaj MB) in gredo skozi naš strežnik. */}
          </span>
          {row.sender && <span className="ml-2 text-label-2">· {row.sender}</span>}
          {row.dateLabel && <span className="ml-2 text-[11px] text-label-3">{row.dateLabel}</span>}
        </td>

        <td data-label={t("shipg.shipped.contents")} className="text-label-2">
          {row.contents || dash}
        </td>

        <td data-label={t("shipg.shipped.source")}>
          {row.sourceIssueKey && row.sourceOrderNumber
            ? <Link href={`/orders/${row.sourceIssueKey}`} className="link mono">#{row.sourceOrderNumber}</Link>
            : row.sourceOrderNumber
              ? <span className="mono text-label-2">#{row.sourceOrderNumber}</span>
              : dash}
        </td>

        <td data-label={t("shipg.shipped.exchange")}>
          {/* Menjava pelje na ticket, odprema novega naročila na naročilo.
              Žig ob številki pove, čemu je paket služil — po tem se seznam
              bere brez ugibanja iz obeh stolpcev s številkami. */}
          {row.issueKey && row.orderNumber ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link href={`/orders/${row.issueKey}`} className="link mono">#{row.orderNumber}</Link>
              <span className="pill">{t("shipg.shipped.kindExchange")}</span>
            </span>
          ) : row.outboundOrderNumber ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link href={`/unfulfilled/${encodeURIComponent(row.outboundOrderNumber)}`} className="link mono">#{row.outboundOrderNumber}</Link>
              <span className="pill">{t("shipg.shipped.kindOutbound")}</span>
            </span>
          ) : dash}
        </td>

        <td data-label={t("shipg.shipped.by")} className="text-label-2">
          {row.origin === "system"
            ? (row.byName ?? dash)
            : row.origin === "outside"
              // Opuščen korak, ne zgodovina: jantarna opozori, ne obtoži.
              ? <span className="pill" style={{ borderColor: "var(--warning)", color: "var(--warning)" }} title={t("shipg.shipped.outsideSystemHint")}>{t("shipg.shipped.outsideSystem")}</span>
              : <span className="pill" style={{ borderColor: "var(--rule-strong)", color: "var(--ink-3)" }}>{t("shipg.shipped.preSystem")}</span>}
        </td>

        <td data-label={t("shipg.shipped.status")}>
          {(() => {
            const shipped = row.status === "Shipped";
            const color = shipped ? "var(--success)" : "var(--warning)";
            const label = shipped ? t("shipg.shipped.statusShipped")
              : row.status === "ReadyForProcessing" ? t("shipg.shipped.statusReady")
              : row.status;
            return <span className="pill" style={{ borderColor: color, color }}>{label}</span>;
          })()}
        </td>

        <td data-label={t("shipg.shipped.tracking")}>
          {row.tracking ? (
            <span className="inline-flex flex-col">
              {row.trackingLink
                ? <a href={row.trackingLink} target="_blank" rel="noopener noreferrer" className="link mono inline-flex items-center gap-1">{row.tracking}<ExternalLink size={11} /></a>
                : <span className="mono">{row.tracking}</span>}
              {row.shipMethod && <span className="text-[10.5px] text-label-3">{row.shipMethod}</span>}
            </span>
          ) : dash}
        </td>

        <td data-label={t("shipg.shipped.price")} className="mono" style={rightAlign}>
          {row.price != null ? formatPrice(row.price, row.currency, locale) : dash}
        </td>

        <td data-label={t("shipg.shipped.receipt")} style={rightAlign}>
          {dash}
        </td>
      </tr>

      {open && (
        <tr className="shipg-details-row" data-system={row.origin === "system" ? "true" : "false"}>
          <td colSpan={columns}>
            <div className="shipg-details">
              <Detail label={t("shipg.shipped.detail.shipment")} value={<span className="mono">{row.id}</span>} />
              <Detail label={t("shipg.shipped.detail.parcel")} value={row.parcelId ? <span className="mono">{row.parcelId}</span> : dash} />
              <Detail label={t("shipg.shipped.detail.sender")} value={row.sender ?? dash} />
              <Detail
                label={t("shipg.shipped.detail.inboundTracking")}
                value={row.parcelTracking
                  ? <span className="mono">{row.parcelTracking}{row.parcelCarrier ? ` \u00b7 ${row.parcelCarrier}` : ""}</span>
                  : dash}
              />
              <Detail label={t("shipg.shipped.detail.barcode")} value={row.parcelBarcode ? <span className="mono">{row.parcelBarcode}</span> : dash} />
              <Detail label={t("shipg.shipped.detail.arrived")} value={row.parcelArrivalLabel ?? dash} />
              <Detail
                label={t("shipg.shipped.detail.dwell")}
                value={row.parcelDwellDays != null ? t("unfulfilled.days", { days: row.parcelDwellDays }) : dash}
              />
              <Detail label={t("shipg.shipped.detail.planned")} value={row.plannedLabel ?? dash} />
              <Detail label={t("shipg.shipped.detail.shipped")} value={row.shippedLabel ?? dash} />
              <Detail label={t("shipg.shipped.detail.method")} value={row.shipMethod ?? dash} />
              <Detail
                label={t("shipg.shipped.detail.altTracking")}
                value={row.altTrackings ? <span className="mono">{row.altTrackings}</span> : dash}
              />
              <Detail
                label={t("shipg.shipped.detail.weight")}
                value={row.weightGrams != null ? `${decimal(row.weightGrams / 1000, locale)} kg` : dash}
              />
              <Detail
                label={t("shipg.shipped.detail.dimensions")}
                value={row.dimensionsMm ? `${row.dimensionsMm.map((mm) => decimal(mm / 10, locale)).join(" \u00d7 ")} cm` : dash}
              />
              <Detail
                label={t("shipg.shipped.detail.insurance")}
                value={row.insurance != null ? formatPrice(row.insurance, row.currency, locale) : dash}
              />
              <Detail label={t("shipg.shipped.detail.incoterm")} value={row.incoterm ?? dash} />
              <Detail label={t("shipg.shipped.detail.warehouse")} value={row.locations ?? dash} />
              <Detail
                label={t("shipg.shipped.detail.kind")}
                value={row.kind ? t(row.kind === "single" ? "shipg.shipped.detail.single" : "shipg.shipped.detail.consolidated") : dash}
              />
              <Detail
                label={t("shipg.shipped.detail.flags")}
                value={(() => {
                  // Zastavice izpisemo samo, kadar drzijo — seznam nicel ne pove nic.
                  const flags = [
                    row.isEU ? t("shipg.shipped.detail.eu") : null,
                    row.isVAT ? t("shipg.shipped.detail.vat") : null,
                    row.isPickupPoint ? t("shipg.shipped.detail.pickup") : null,
                    row.isConsolidation ? t("shipg.shipped.detail.consolidation") : null,
                  ].filter(Boolean);
                  return flags.length ? flags.join(" \u00b7 ") : dash;
                })()}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="shipg-detail">
      <span className="caption">{label}</span>
      <span className="text-[12.5px]">{value}</span>
    </div>
  );
}
