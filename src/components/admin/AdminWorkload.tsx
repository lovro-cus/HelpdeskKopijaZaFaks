import Link from "next/link";

import { EmptyState } from "@/components/ui";
import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/shared";

export type WorkloadRow = {
  id: string | null;
  name: string;
  level: number | null;
  open: number;
  waiting: number;
  manual: number;
  urgent: number;
  /** Starost najstarejšega odprtega primera v dnevih. */
  oldestDays: number | null;
};

/** Kdo ima kaj prevzeto. Nivo je človek, ne stolpec — zato je to pogled na
 *  ljudi, ne na stanja. */
export function AdminWorkload({ rows, locale }: { rows: WorkloadRow[]; locale: Locale }) {
  const total = rows.reduce((sum, row) => sum + row.open, 0);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-3.5">
        <div>
          <h2 className="caption" style={{ color: "var(--ink)" }}>{t(locale, "admin.workload.title")}</h2>
          <p className="mt-1 max-w-[80ch] text-[12px] text-label-2">{t(locale, "admin.workload.intro")}</p>
        </div>
        <span className="mono text-[12px] text-label-3">{t(locale, "admin.workload.total", { count: total })}</span>
      </div>

      {rows.length === 0 ? (
        <div className="border-t" style={{ borderColor: "var(--separator)" }}>
          <EmptyState title={t(locale, "admin.workload.none")} />
        </div>
      ) : (
        <div className="overflow-x-auto border-t" style={{ borderColor: "var(--separator)" }}>
          <table className="shipgerman-table">
            <thead><tr>
              <th>{t(locale, "admin.workload.person")}</th>
              <th style={{ textAlign: "right" }}>{t(locale, "admin.workload.open")}</th>
              <th style={{ textAlign: "right" }}>{t(locale, "admin.workload.urgent")}</th>
              <th style={{ textAlign: "right" }}>{t(locale, "admin.workload.waiting")}</th>
              <th style={{ textAlign: "right" }}>{t(locale, "admin.workload.manual")}</th>
              <th style={{ textAlign: "right" }}>{t(locale, "admin.workload.oldest")}</th>
              <th />
            </tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id ?? "unassigned"}>
                  <td data-label={t(locale, "admin.workload.person")}>
                    <span className="text-[12.5px] font-medium">{row.name}</span>
                    {row.level !== null && <span className="pill ml-2">{t(locale, "nav.level", { level: row.level })}</span>}
                  </td>
                  <td data-label={t(locale, "admin.workload.open")} className="mono" style={{ textAlign: "right" }}>{row.open}</td>
                  <td data-label={t(locale, "admin.workload.urgent")} className="mono" style={{ textAlign: "right", color: row.urgent > 0 ? "var(--stamp)" : undefined }}>
                    {row.urgent || "—"}
                  </td>
                  <td data-label={t(locale, "admin.workload.waiting")} className="mono" style={{ textAlign: "right" }}>{row.waiting || "—"}</td>
                  <td data-label={t(locale, "admin.workload.manual")} className="mono" style={{ textAlign: "right" }}>{row.manual || "—"}</td>
                  <td data-label={t(locale, "admin.workload.oldest")} className="mono" style={{ textAlign: "right", color: (row.oldestDays ?? 0) > 7 ? "var(--stamp)" : undefined }}>
                    {row.oldestDays === null ? "—" : t(locale, "unfulfilled.days", { days: row.oldestDays })}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {row.open > 0 && row.id && (
                      <Link href={`/orders?view=all&assignee=${encodeURIComponent(row.id)}`} className="link text-[12px]">
                        {t(locale, "admin.workload.show")}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
