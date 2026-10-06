"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Smile } from "lucide-react";

import { markSatisfactionReviewed } from "@/lib/actions/satisfaction";
import { useLocale, useT } from "@/lib/i18n/client";
import { formatDateTime } from "@/lib/format";
import { needsReview, scoreTone } from "@/lib/satisfaction";
import { ThankYouMail } from "./ThankYouMail";
import { Notice } from "./ui";

export type SatisfactionView = {
  score: number;
  reason: string;
  reviewedAt: Date | null;
  reviewer: string | null;
};

const TONE_COLOR = { low: "var(--stamp)", mid: "var(--warning)", high: "var(--petrol)", none: "var(--ink-3)" } as const;

/**
 * Ocena zadovoljstva zaprtega ticketa. Samo za ekipo; nizka ocena čaka, da jo
 * admin pogleda in označi kot pregledano.
 */
export function SatisfactionCard({ issueId, value, below, canReview, canThank, thankYouStatus }: { issueId: number; value: SatisfactionView; below: number; canReview: boolean; canThank: boolean; thankYouStatus: string | null }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const flagged = needsReview(value.score, below);
  const color = TONE_COLOR[scoreTone(value.score, below)];

  return (
    <section
      className="mb-4 border px-4 py-3"
      style={{ borderColor: flagged && !value.reviewedAt ? "var(--stamp)" : "var(--rule)", background: flagged && !value.reviewedAt ? "var(--stamp-wash)" : undefined }}
      aria-label={t("satisfaction.title")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="caption flex items-center gap-1.5" style={{ color: "var(--ink-2)" }}>
          <Smile size={13} aria-hidden /> {t("satisfaction.title")}
        </span>
        <span className="mono text-[15px] font-semibold tabular-nums" style={{ color }}>
          {value.score}/10
        </span>
        {flagged && !value.reviewedAt && <span className="pill" style={{ color: "var(--stamp)" }}>{t("satisfaction.toReview")}</span>}
        {value.reviewedAt && (
          <span className="text-[11.5px] text-label-3">
            {t("satisfaction.reviewedBy", { name: value.reviewer ?? "—", date: formatDateTime(value.reviewedAt, locale) })}
          </span>
        )}
        {flagged && !value.reviewedAt && canReview && (
          <button
            type="button"
            className="btn btn-sm ml-auto"
            disabled={pending}
            onClick={() => start(async () => {
              const result = await markSatisfactionReviewed(issueId);
              if (result.error) setError(result.error);
              else router.refresh();
            })}
          >
            <Check size={13} /> {t("satisfaction.markReviewed")}
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[12.5px] leading-[1.55] text-label-2">{value.reason}</p>
      {canReview && canThank && <div className="mt-3"><ThankYouMail issueId={issueId} status={thankYouStatus} /></div>}
      {error && <div className="mt-2"><Notice kind="error">{error}</Notice></div>}
    </section>
  );
}
