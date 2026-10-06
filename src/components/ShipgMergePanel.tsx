"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowDownToLine, GitMerge, PackageCheck } from "lucide-react";

import { mergeShipgStockIntoIssue } from "@/lib/actions/shipg";
import { mergeRows, type MergeDiffState } from "@/lib/shipg-merge";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/shared";

export type MergeIssue = {
  id: number;
  orderNumber: string;
  items: { name: string; variant: string | null; qty: number; resolution: string }[];
};

export type MergeStockRecord = {
  id: number;
  shipgermanParcelId: string | null;
  trackingNumber: string | null;
  customerName: string | null;
  stockedAtLabel: string | null;
  /** Teža fizičnega paketa, npr. "1,2 kg". */
  weightLabel: string | null;
  items: { name: string; variant: string | null; expectedQty: number; receivedQty: number }[];
};

/** GitHub-slog pregled ujemanja pred povezavo ročno vpisane zaloge z naročilom.
 *  Vsebina paketa je urejljiva: če je bil vnos nepopoln (npr. manjka kos, ki
 *  fizično je v paketu), ga tu popraviš, preden zalogo povežeš z naročilom. */
export function ShipgMergePanel({ issue, records }: { issue: MergeIssue; records: MergeStockRecord[]; locale?: Locale }) {
  const t = useT();
  return (
    <section className="card mb-4 overflow-hidden">
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--separator)" }}>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <GitMerge size={15} className="text-accent" strokeWidth={1.8} />
          {t("shipg.merge.title")}
        </h2>
        <p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed text-label-2">{t("shipg.merge.subtitle")}</p>
      </div>

      {records.map((record) => (
        <MergeRecordForm key={record.id} issueId={issue.id} record={record} issueItems={issue.items} />
      ))}
    </section>
  );
}

function liveState(packageQty: number, orderQty: number): MergeDiffState {
  if (packageQty <= 0) return orderQty > 0 ? "missing" : "extra";
  if (orderQty <= 0) return "extra";
  return packageQty === orderQty ? "match" : "qty";
}

function MergeRecordForm({ issueId, record, issueItems }: {
  issueId: number;
  record: MergeStockRecord;
  issueItems: MergeIssue["items"];
}) {
  const t = useT();
  const rows = useMemo(() => mergeRows(record.items, issueItems), [record.items, issueItems]);
  const [qty, setQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.key, String(row.packageQty)])),
  );

  const parcelLabel = record.shipgermanParcelId ? `ShipGerman ${record.shipgermanParcelId}` : record.trackingNumber ?? "—";
  const qtyOf = (key: string) => {
    const value = Number.parseInt(qty[key] ?? "", 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };
  const differences = rows.filter((row) => liveState(qtyOf(row.key), row.orderQty) !== "match").length;
  const canFillFromOrder = rows.some((row) => row.orderQty > 0 && qtyOf(row.key) !== row.orderQty);

  const fillFromOrder = () => {
    // Prevzame količine iz naročila za kose, ki jih naročilo pričakuje; morebitne
    // dodatke v paketu (ki jih v naročilu ni) pusti pri miru.
    setQty((previous) => Object.fromEntries(rows.map((row) => [row.key, row.orderQty > 0 ? String(row.orderQty) : previous[row.key] ?? "0"])));
  };

  return (
    <div className="border-b px-4 py-3.5 last:border-b-0" style={{ borderColor: "var(--separator)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <span className="mono text-[12.5px] font-medium">{parcelLabel}</span>
          {record.customerName && <span className="ml-2 text-[12px] text-label-2">· {record.customerName}</span>}
          {record.weightLabel && <span className="ml-2 mono text-[11.5px] text-label-3">· {record.weightLabel}</span>}
        </div>
        {record.stockedAtLabel && <span className="mono text-[11px] text-label-3">{record.stockedAtLabel}</span>}
      </div>

      <form action={mergeShipgStockIntoIssue}>
        <input type="hidden" name="shipgReturnId" value={record.id} />
        <input type="hidden" name="issueId" value={issueId} />

        <div className="mt-2.5 overflow-x-auto">
          <table className="merge-diff">
            <thead><tr>
              <th>{t("shipg.merge.item")}</th>
              <th style={{ textAlign: "right" }}>{t("shipg.merge.inPackage")}</th>
              <th style={{ textAlign: "right" }}>{t("shipg.merge.inOrder")}</th>
              <th style={{ textAlign: "right" }}>{t("shipg.merge.state")}</th>
            </tr></thead>
            <tbody>
              {rows.map((row) => {
                const state = liveState(qtyOf(row.key), row.orderQty);
                return (
                  <tr key={row.key} data-state={state}>
                    <td>{row.label}</td>
                    <td style={{ textAlign: "right" }}>
                      <input
                        name={`qty.${row.key}`}
                        type="number"
                        min={0}
                        max={9999}
                        value={qty[row.key] ?? ""}
                        onChange={(event) => setQty((previous) => ({ ...previous, [row.key]: event.target.value }))}
                        className="field mono"
                        style={{ width: "64px", textAlign: "right", display: "inline-block" }}
                        aria-label={`${t("shipg.merge.inPackage")}: ${row.label}`}
                      />
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>{row.orderQty || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="merge-tag" data-state={state}>{t(`shipg.merge.tag.${state}` as TranslationKey)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <MergeSubmit label={t("shipg.merge.action")} />
          <button type="button" onClick={fillFromOrder} disabled={!canFillFromOrder} className="btn btn-sm">
            <ArrowDownToLine size={13} /> {t("shipg.merge.takeFromOrder")}
          </button>
          <span className="text-[11.5px] text-label-3">
            {differences === 0 ? t("shipg.merge.clean") : t("shipg.merge.differences", { count: differences })}
          </span>
        </div>
      </form>
    </div>
  );
}

function MergeSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
      <PackageCheck size={14} />{pending ? "…" : label}
    </button>
  );
}
