"use client";

import { useActionState } from "react";
import { saveThankYouTemplate } from "@/lib/actions/satisfaction-mail";
import { useT } from "@/lib/i18n/client";
import type { ThankYouTemplate } from "@/lib/satisfaction-mail";

export function SatisfactionMailSettings({ template }: { template: ThankYouTemplate }) {
  const t = useT();
  const [state, action, pending] = useActionState(saveThankYouTemplate, {});
  return <form action={action} className="card space-y-3 p-4">
    <div>
      <h2 className="text-[15px] font-semibold">{t("satisfaction.mail.title")}</h2>
      <p className="mt-1 max-w-[75ch] text-[12px] leading-relaxed text-label-2">{t("satisfaction.mail.intro")}</p>
    </div>
    <label className="block space-y-1 text-[12px]">
      <span>{t("satisfaction.mail.subject")}</span>
      <input className="field" name="subject" lang="en" required maxLength={300} defaultValue={template.subject} />
    </label>
    <label className="block space-y-1 text-[12px]">
      <span>{t("satisfaction.mail.body")}</span>
      <textarea className="field min-h-[150px] resize-y" name="body" lang="en" required maxLength={3000} rows={6} defaultValue={template.body} />
    </label>
    <p className="text-[12px] text-label-2">{t("satisfaction.mail.tokens")}</p>
    <div className="flex flex-wrap items-center gap-3">
      <button className="btn btn-sm btn-primary" type="submit" disabled={pending}>{t(pending ? "common.saving" : "common.save")}</button>
      {state.ok && <span className="text-[12px]" role="status">{t("satisfaction.mail.saved")}</span>}
      {state.error && <span className="text-[12px]" style={{ color: "var(--stamp)" }} role="alert">{state.error}</span>}
    </div>
  </form>;
}
