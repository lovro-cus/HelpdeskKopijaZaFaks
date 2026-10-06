"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { prepareThankYou, sendThankYou, type ThankYouPreview } from "@/lib/actions/satisfaction-mail";
import { useT } from "@/lib/i18n/client";

export function ThankYouMail({ issueId, status }: { issueId: number; status?: string | null }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<ThankYouPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const blocked = status && status !== "satisfaction_preview" && status !== "sent";
  if (sent || status === "sent") return <p className="text-[12px] text-label-2" role="status">{t("satisfaction.mail.sent")}</p>;
  if (blocked) return <p className="text-[12px] text-label-2" role="status">{t("satisfaction.mail.checkSent")}</p>;

  return (
    <div className="min-w-0 space-y-3">
      {!preview && <button type="button" className="btn btn-sm" disabled={pending} onClick={() => start(async () => {
        setError(null);
        try {
          const result = await prepareThankYou(issueId);
          if (result.preview) setPreview(result.preview);
          else setError(result.error ?? t("satisfaction.mail.prepareFailed"));
        } catch { setError(t("satisfaction.mail.prepareFailed")); }
      })}><Mail size={13} aria-hidden />{t(pending ? "satisfaction.mail.preparing" : "satisfaction.mail.prepare")}</button>}
      {preview && <section className="space-y-3 border-t pt-3" style={{ borderColor: "var(--separator)" }} aria-label={t("satisfaction.mail.preview")}>
        <h3 className="text-[13px] font-semibold">{t("satisfaction.mail.preview")}</h3>
        <p className="break-words text-[12px] text-label-2">{preview.to} · {preview.language}</p>
        <p className="break-words text-[13px] font-medium" lang={preview.languageCode}>{preview.subject}</p>
        <div className="max-h-[360px] overflow-y-auto whitespace-pre-wrap break-words text-[13px] leading-relaxed" lang={preview.languageCode}>{preview.body}</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => start(async () => {
            setError(null);
            try {
              const result = await sendThankYou(preview.id, preview.version);
              if (result.ok) { setSent(true); setPreview(null); }
              else setError(result.error ?? t("satisfaction.mail.sendFailed"));
              router.refresh();
            } catch { setError(t("satisfaction.mail.sendFailed")); router.refresh(); }
          })}>{t(pending ? "draft.sending" : "satisfaction.mail.send")}</button>
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => { setPreview(null); setError(null); }}>{t("common.cancel")}</button>
        </div>
      </section>}
      {error && <p className="text-[12px]" style={{ color: "var(--stamp)" }} role="alert">{error}</p>}
    </div>
  );
}
