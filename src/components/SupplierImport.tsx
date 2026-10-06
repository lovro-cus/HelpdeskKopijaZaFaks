"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FileUp, Upload } from "lucide-react";

import { applySupplierImport, previewSupplierImport, type ImportState } from "@/lib/actions/supplier-orders";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { useT } from "@/lib/i18n/client";
import type { PreviewRow } from "@/lib/supplier-orders";
import { Notice } from "./ui";

const initial: ImportState = {};

/**
 * Uvoz Excela s trackingom: najprej predogled (kaj se bo zgodilo s katero
 * vrstico), nato potrditev. Ničesar ne zapišemo, dokler človek ne potrdi.
 */
export function SupplierImport({ portalToken }: { portalToken: string | null }) {
  const t = useT();
  const router = useRouter();
  const [state, upload, uploading] = useActionState(previewSupplierImport, initial);
  const [applied, setApplied] = useState<number | null>(null);
  const [applyError, setApplyError] = useState(false);
  const [dismissed, setDismissed] = useState<ImportState | null>(null);
  const [pending, startTransition] = useTransition();

  const preview = state !== dismissed ? state.preview : undefined;
  const rows = preview?.ok ? preview.rows : [];
  const ready = rows.filter((row) => row.verdict === "ready");

  function confirm() {
    startTransition(async () => {
      try {
        const result = await applySupplierImport(
          ready.map((row) => ({ supplierOrderId: row.supplierOrderId!, trackings: row.trackings, carrier: row.carrier })),
          portalToken,
        );
        setApplied(result.applied ?? 0);
        setApplyError(false);
        setDismissed(state);
        router.refresh();
      } catch {
        setApplyError(true);
      }
    });
  }

  return (
    <div>
      <form action={(fd) => { setApplied(null); setApplyError(false); upload(fd); }} className="flex flex-wrap items-center gap-2">
        {portalToken && <input type="hidden" name="portalToken" value={portalToken} />}
        <label className="btn btn-sm cursor-pointer">
          <FileUp size={14} />
          <span>{t("supplier.import.choose")}</span>
          <input
            type="file"
            name="file"
            accept=".xlsx,.csv"
            className="sr-only"
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          />
        </label>
        <span className="text-[11.5px] text-label-3">{uploading ? t("supplier.import.reading") : t("supplier.import.hint")}</span>
      </form>

      {applied !== null && (
        <div className="mt-3"><Notice kind="ok">{t("supplier.import.applied", { count: applied })}</Notice></div>
      )}
      {applyError && <div className="mt-3"><Notice kind="error">{t("supplier.import.applyFailed")}</Notice></div>}
      {preview && !preview.ok && (
        <div className="mt-3"><Notice kind="error">{t(`supplier.import.error.${preview.error}` as TranslationKey)}</Notice></div>
      )}

      {preview?.ok && (
        <div className="mt-3">
          {rows.length === 0 ? (
            <Notice kind="error">{t("supplier.import.noRows")}</Notice>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border" style={{ borderColor: "var(--separator)" }}>
                <table className="w-full text-left text-[12.5px]">
                  <thead className="caption">
                    <tr>
                      <th className="px-3 py-2">{t("supplier.col.line")}</th>
                      <th className="px-3 py-2">{t("supplier.col.request")}</th>
                      <th className="px-3 py-2">{t("supplier.col.order")}</th>
                      <th className="px-3 py-2">{t("supplier.col.recipient")}</th>
                      <th className="px-3 py-2">{t("supplier.col.tracking")}</th>
                      <th className="px-3 py-2">{t("supplier.col.result")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => <PreviewLine key={row.line} row={row} />)}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-sm btn-primary" disabled={!ready.length || pending} onClick={confirm}>
                  <Upload size={14} />
                  {t("supplier.import.confirm", { count: ready.length })}
                </button>
                <button type="button" className="btn btn-sm btn-plain" disabled={pending} onClick={() => setDismissed(state)}>
                  {t("supplier.import.discard")}
                </button>
                <span className="text-[11.5px] text-label-3">{t("supplier.import.confirmHint")}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewLine({ row }: { row: PreviewRow }) {
  const t = useT();
  const ok = row.verdict === "ready" || row.verdict === "merged";
  return (
    <tr className="border-t" style={{ borderColor: "var(--separator)" }}>
      <td className="mono px-3 py-2 text-label-3">{row.line}</td>
      <td className="mono px-3 py-2">{row.code ?? "—"}</td>
      <td className="mono px-3 py-2">{row.orderNumber ? `#${row.orderNumber}` : "—"}</td>
      <td className="px-3 py-2 text-label-2">{row.recipient ?? "—"}</td>
      <td className="mono px-3 py-2">
        {row.trackings.join(", ") || "—"}
        {row.invalid.length > 0 && <span className="block text-[11px]" style={{ color: "var(--stamp)" }}>{row.invalid.join(", ")}</span>}
      </td>
      <td className="px-3 py-2" style={{ color: ok ? "var(--success)" : "var(--stamp)" }}>
        <span className="inline-flex items-center gap-1">
          {ok && <Check size={13} />}
          {t(`supplier.verdict.${row.verdict}` as TranslationKey)}
        </span>
      </td>
    </tr>
  );
}
