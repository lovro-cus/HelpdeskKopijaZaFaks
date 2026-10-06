"use client";

import { useMemo, useState } from "react";

import { useLocale, useT } from "@/lib/i18n/client";
import { STORAGE_CURRENCY } from "@/lib/storage-cost";

export type CostPoint = { date: string; cost: number; parcels: number };

const W = 720;
const H = 200;
const PAD = { top: 12, right: 12, bottom: 22, left: 44 };

/**
 * Dnevni strošek skladiščenja skozi čas — ena serija, zato brez legende;
 * naslov pove, kaj je narisano. Število paketov je namenoma le v opisu ob
 * prehodu miške: druga os bi bila druga merska lestvica na istem grafu.
 */
export function CostChart({ points }: { points: CostPoint[] }) {
  const t = useT();
  const locale = useLocale();
  const [hover, setHover] = useState<number | null>(null);

  const money = useMemo(
    () => new Intl.NumberFormat(locale === "sl" ? "sl-SI" : "en-GB", { style: "currency", currency: STORAGE_CURRENCY }),
    [locale],
  );
  const day = useMemo(
    () => new Intl.DateTimeFormat(locale === "sl" ? "sl-SI" : "en-GB", { day: "numeric", month: "short" }),
    [locale],
  );

  const max = Math.max(1, ...points.map((point) => point.cost));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (index: number) => PAD.left + (points.length < 2 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const y = (cost: number) => PAD.top + innerH - (cost / max) * innerH;

  if (points.length === 0) return null;

  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.cost).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;
  // Tri vodoravne črte zadoščajo za branje velikostnega reda; več jih le zamaže.
  const ticks = [0, max / 2, max];
  const last = points[points.length - 1];
  const active = hover === null ? null : points[hover];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "auto" }}
        role="img"
        aria-label={t("admin.warehouse.chartTitle")}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const ratio = ((event.clientX - box.left) / box.width) * W;
          const index = Math.round(((ratio - PAD.left) / innerW) * (points.length - 1));
          setHover(Math.min(points.length - 1, Math.max(0, index)));
        }}
      >
        {ticks.map((value) => (
          <g key={value}>
            <line
              x1={PAD.left} x2={W - PAD.right} y1={y(value)} y2={y(value)}
              stroke="var(--rule)" strokeWidth="1"
            />
            <text
              x={PAD.left - 6} y={y(value) + 3} textAnchor="end"
              className="mono" fontSize="9" fill="var(--ink-3)"
            >
              {Math.round(value)}
            </text>
          </g>
        ))}

        <path d={area} fill="var(--petrol)" opacity="0.09" />
        <path d={line} fill="none" stroke="var(--petrol)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Zadnja vrednost je edina stalno izpisana — številka na vsaki točki bi
            bila hrup, brez nje pa graf ne pove, kje danes stojimo. */}
        <circle cx={x(points.length - 1)} cy={y(last.cost)} r="3.5" fill="var(--petrol)" />

        {active && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--rule-strong)" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(active.cost)} r="4" fill="var(--petrol)" stroke="var(--sheet)" strokeWidth="2" />
          </g>
        )}

        <text x={PAD.left} y={H - 6} className="mono" fontSize="9" fill="var(--ink-3)">{day.format(new Date(points[0].date))}</text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="mono" fontSize="9" fill="var(--ink-3)">{day.format(new Date(last.date))}</text>
      </svg>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 text-[12px]">
        <span className="text-label-2">
          {active
            ? `${day.format(new Date(active.date))} · ${money.format(active.cost)} · ${t("admin.warehouse.parcelsShort", { count: active.parcels })}`
            : `${day.format(new Date(last.date))} · ${money.format(last.cost)} · ${t("admin.warehouse.parcelsShort", { count: last.parcels })}`}
        </span>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-[11.5px] text-label-3">{t("admin.warehouse.table")}</summary>
        <div className="mt-2 max-h-[220px] overflow-y-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="text-label-3">
                <th className="py-1 text-left font-normal">{t("admin.warehouse.colDate")}</th>
                <th className="py-1 text-right font-normal">{t("admin.warehouse.colCost")}</th>
                <th className="py-1 text-right font-normal">{t("admin.warehouse.colParcels")}</th>
              </tr>
            </thead>
            <tbody className="mono">
              {[...points].reverse().map((point) => (
                <tr key={point.date}>
                  <td className="py-0.5">{point.date}</td>
                  <td className="py-0.5 text-right">{money.format(point.cost)}</td>
                  <td className="py-0.5 text-right">{point.parcels}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
