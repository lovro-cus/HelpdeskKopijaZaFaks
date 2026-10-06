"use client";

import { useState } from "react";
import Link from "next/link";
import { Boxes, ChevronRight, ExternalLink } from "lucide-react";

import { EmptyState } from "./ui";
import { useT } from "@/lib/i18n/client";

export type InventoryPackage = {
  shipgReturnId: number;
  parcelId: string | null;
  sender: string | null;
  arrivalLabel: string | null;
  arrivalSort: number;
  reserved: boolean;
  /** Zakaj paket ni na voljo, čeprav je vpisan v zalogo (null = na voljo).
   *  gone = paket ni več v skladišču ShipGerman; unlinked = ni vezan na paket. */
  blockReason: "gone" | "unlinked" | "tooOld" | null;
  orderNumber: string | null;
  issueKey: string | null;
};

export type InventoryRow = {
  key: string;
  label: string;
  available: number;
  reserved: number;
  /** Vpisani paketi, ki jih ni v skladišču — ne štejejo med proste ali skupaj. */
  blocked: number;
  /** V skladišču, a starejši od praga za odpremo — ne ponudimo jih, zato niso "na voljo". */
  tooOld: number;
  packages: InventoryPackage[];
};

/** Koliko sestav dobi svojo barvo v donutu; ostale se zložijo v "Ostalo". */
const DONUT_SLOTS = 6;
const rightAlign = { textAlign: "right" as const };

type Segment = { label: string; value: number; color: string };

/** Agregiran pregled zaloge po sestavi paketa — isti fizični kos med IT in DACH
 *  trgom je združen, štejejo pa se paketi (najmanjša odpremljiva enota). Vrstico
 *  je mogoče razpreti in videti posamezne pakete iz ShipGerman zaloge. */
export function ShipgInventoryTable({ rows }: { rows: InventoryRow[] }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);

  if (rows.length === 0) {
    return <EmptyState title={t("shipg.inventory.empty")} />;
  }
  const totalAvailable = rows.reduce((sum, row) => sum + row.available, 0);
  const totalReserved = rows.reduce((sum, row) => sum + row.reserved, 0);
  const totalBlocked = rows.reduce((sum, row) => sum + row.blocked, 0);
  const totalTooOld = rows.reduce((sum, row) => sum + row.tooOld, 0);
  const totalPackages = totalAvailable + totalReserved + totalTooOld;

  const ranked = rows
    .map((row) => ({ ...row, total: row.available + row.reserved + row.tooOld }))
    .filter((row) => row.total > 0);
  const restTotal = ranked.slice(DONUT_SLOTS).reduce((sum, row) => sum + row.total, 0);
  const segments: Segment[] = [
    ...ranked.slice(0, DONUT_SLOTS).map((row, index) => ({ label: row.label, value: row.total, color: `var(--viz-${index + 1})` })),
    ...(restTotal > 0 ? [{ label: t("shipg.inventory.other"), value: restTotal, color: "var(--viz-other)" }] : []),
  ];

  return (
    <div className="shipgerman-register mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5">
        <p className="flex items-center gap-2 text-[11.5px] text-label-2">
          <Boxes size={14} className="text-accent" strokeWidth={1.7} />
          {t("shipg.inventory.description")}
        </p>
        <span className="mono text-[10.5px] text-label-2">
          {t("shipg.inventory.totals", { available: totalAvailable, reserved: totalReserved })}
          {totalTooOld > 0 && <> · {t("shipg.inventory.tooOldCount", { count: totalTooOld })}</>}
          {totalBlocked > 0 && <> · {t("shipg.inventory.notCounted", { count: totalBlocked })}</>}
        </span>
      </div>

      {totalPackages > 0 && (
        <div className="inventory-chart border-b px-3 py-4" style={{ borderColor: "var(--rule)" }}>
          <InventoryDonut segments={segments} total={totalPackages} aria={t("shipg.inventory.chartAria")} unit={t("shipg.inventory.unit")} />
          <ul className="inventory-legend">
            {segments.map((segment) => (
              <li key={segment.label} className="inventory-legend-item">
                <span className="inventory-swatch" style={{ background: segment.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[12px]" title={segment.label}>{segment.label}</span>
                <span className="mono text-[12px]">{segment.value}</span>
                <span className="mono w-9 text-right text-[11px] text-label-3">{Math.round((segment.value / totalPackages) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="shipgerman-table">
          <thead><tr>
            <th>{t("shipg.inventory.item")}</th>
            <th style={rightAlign}>{t("shipg.inventory.available")}</th>
            <th style={rightAlign}>{t("shipg.inventory.reserved")}</th>
            <th style={rightAlign}>{t("shipg.inventory.total")}</th>
          </tr></thead>
          <tbody>
            {rows.map((row) => {
              const expanded = open === row.key;
              return (
                <InventoryRowGroup
                  key={row.key}
                  row={row}
                  expanded={expanded}
                  onToggle={() => setOpen(expanded ? null : row.key)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryRowGroup({ row, expanded, onToggle }: { row: InventoryRow; expanded: boolean; onToggle: () => void }) {
  const t = useT();
  const panelId = `inv-${row.key.replace(/[^a-z0-9]+/gi, "-")}`;
  return (
    <>
      <tr data-open={expanded || undefined} className="inventory-summary-row">
        <td data-label={t("shipg.inventory.item")}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="inventory-expand"
          >
            <ChevronRight size={13} className="inventory-caret" strokeWidth={2} aria-hidden="true" />
            <span className="font-medium">{row.label}</span>
          </button>
        </td>
        <td data-label={t("shipg.inventory.available")} className="mono" style={rightAlign}>{row.available}</td>
        <td data-label={t("shipg.inventory.reserved")} className="mono text-label-2" style={rightAlign}>{row.reserved || "—"}</td>
        <td data-label={t("shipg.inventory.total")} className="mono" style={rightAlign}>{row.available + row.reserved + row.tooOld}</td>
      </tr>
      {expanded && (
        <tr className="inventory-detail-row">
          <td colSpan={4} className="inventory-detail-cell">
            <div id={panelId} className="inventory-packages">
              <div className="inventory-packages-head">
                {t("shipg.inventory.packagesHead", { count: row.packages.length })}
              </div>
              {row.packages.map((pkg) => (
                <PackageLine key={pkg.shipgReturnId} pkg={pkg} />
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PackageLine({ pkg }: { pkg: InventoryPackage }) {
  const t = useT();
  const state = pkg.reserved ? "reserved" : pkg.blockReason ? "blocked" : "available";
  const stateLabel = pkg.reserved
    ? t("shipg.inventory.tag.reserved")
    : pkg.blockReason === "gone"
      ? t("shipg.inventory.tag.gone")
      : pkg.blockReason === "tooOld"
        ? t("shipg.inventory.tag.tooOld")
        : pkg.blockReason
        ? t("shipg.inventory.tag.blocked")
        : t("shipg.inventory.tag.available");
  const blockTitle = pkg.blockReason === "gone"
    ? t("shipg.inventory.block.gone")
    : pkg.blockReason === "tooOld"
      ? t("shipg.inventory.block.tooOld")
      : pkg.blockReason === "unlinked" ? t("shipg.inventory.block.unlinked") : undefined;

  return (
    <div className="inventory-pkg">
      <div className="min-w-0">
        <div className="inventory-pkg-id">
          {pkg.parcelId ? (
            <Link href={`/shipg?view=stock&q=${encodeURIComponent(pkg.parcelId)}`} className="inventory-pkg-link">
              <span className="mono">ShipGerman {pkg.parcelId}</span>
              <ExternalLink size={11} aria-hidden="true" />
            </Link>
          ) : (
            <span className="mono text-label-3">{t("shipg.inventory.noParcelId")}</span>
          )}
          {pkg.sender && <span className="inventory-pkg-sender">· {pkg.sender}</span>}
        </div>
        <div className="inventory-pkg-meta">
          {pkg.arrivalLabel && <span>{pkg.arrivalLabel}</span>}
          {pkg.orderNumber && (
            <span>
              {pkg.issueKey ? (
                <Link href={`/orders/${pkg.issueKey}`} className="link">#{pkg.orderNumber}</Link>
              ) : (
                <>#{pkg.orderNumber}</>
              )}
            </span>
          )}
        </div>
      </div>
      <span className="inventory-tag" data-state={state} title={blockTitle}>{stateLabel}</span>
    </div>
  );
}

function InventoryDonut({ segments, total, aria, unit }: { segments: Segment[]; total: number; aria: string; unit: string }) {
  const size = 168;
  const stroke = 24;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = segments.length > 1 ? 2 : 0;

  let offset = 0;
  return (
    <svg
      className="inventory-donut"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={aria}
    >
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--rule)" strokeWidth={stroke} />
      {segments.map((segment) => {
        const length = (segment.value / total) * circumference;
        const dash = Math.max(length - gap, 0.001);
        const element = (
          <circle
            key={segment.label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        );
        offset += length;
        return element;
      })}
      <text x={center} y={center - 4} textAnchor="middle" className="inventory-donut-total" fill="var(--ink)">{total}</text>
      <text x={center} y={center + 14} textAnchor="middle" className="inventory-donut-unit" fill="var(--ink-3)">{unit}</text>
    </svg>
  );
}
