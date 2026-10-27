"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";

import { resetDemoIssue } from "@/lib/actions/demo-reset";
import { useT } from "@/lib/i18n/client";

/**
 * Samo na testni kopiji: naročilo vrne v prvotno (demo) stanje. Pred tem
 * vpraša, ker se izgubijo vse spremembe.
 */
export function DemoResetButton({ issueId }: { issueId: number }) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button type="button" className="btn btn-sm" title={t("demoReset.title")} onClick={() => setConfirming(true)}>
        <RotateCcw size={14} />
        {t("demoReset.button")}
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label={t("demoReset.confirm")} className="flex flex-wrap items-center gap-2">
      <span className="text-[12px]">{error ?? t("demoReset.confirm")}</span>
      <button type="button" className="btn btn-sm" disabled={pending} onClick={() => { setConfirming(false); setError(null); }}>
        {t("common.cancel")}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-destructive"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await resetDemoIssue(issueId);
            if (result.error) {
              setError(result.error);
              return;
            }
            // Polja na strani hranijo svoje stanje; svež nalog strani jih nastavi znova.
            window.location.reload();
          })
        }
      >
        <RotateCcw size={14} />
        {pending ? t("demoReset.busy") : t("demoReset.do")}
      </button>
    </div>
  );
}
