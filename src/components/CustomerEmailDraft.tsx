import { Mail, PenLine, Send, Trash2 } from "lucide-react";

import {
  composeCustomerEmailDraft,
  discardCustomerEmailDraft,
  sendCustomerEmailDraft,
  setCustomerEmailDraftLanguage,
} from "@/lib/actions/customer-email";
import { customerLanguages } from "@/lib/customer-email";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/shared";
import { Notice } from "./ui";

const OK_FEEDBACK = ["sent", "discarded", "language", "composed"];

/**
 * Pismo stranki, ki ga je sistem sestavil sam in čaka na človeka. Namenoma ni
 * gumb "pošlji obvestilo": besedilo je vidno in popravljivo, ker gre navzven z
 * imenom podjetja — pregled je del poteka, ne opcija.
 */
export async function CustomerEmailDraftCard({ issueId, customerEmail, hasExchange, locale, feedback }: {
  issueId: number;
  customerEmail: string | null;
  hasExchange: boolean;
  locale: Locale;
  feedback?: string;
}) {
  const [draft, shippedPackages, sentLetters] = await Promise.all([
    db.customerEmailDraft.findFirst({ where: { issueId, status: "draft" }, orderBy: { id: "desc" } }),
    db.shipgAllocation.count({ where: { exchangeIssueId: issueId, status: "shipped" } }),
    db.customerEmailDraft.count({ where: { issueId, status: "sent" } }),
  ]);

  const notice = feedback && (
    <div className="mb-3">
      <Notice kind={OK_FEEDBACK.includes(feedback) ? "ok" : "error"}>
        {t(locale, `draft.feedback.${feedback}` as TranslationKey)}
      </Notice>
    </div>
  );

  if (!draft) {
    // Menjava je odšla, pisma pa ni — ker je bila odpremljena pred to funkcijo
    // ali ker je bil osnutek zavržen. Ponudimo ga sestaviti, a nikoli tam, kjer
    // je pismo že odšlo: dve enaki obvestili sta slabši od nobenega.
    const offerCompose = hasExchange && Boolean(customerEmail) && shippedPackages > 0 && sentLetters === 0;
    if (!offerCompose) return notice || null;

    return (
      <>
        {notice}
        <form action={composeCustomerEmailDraft} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <input type="hidden" name="issueId" value={issueId} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13px] font-semibold"><Mail size={14} />{t(locale, "draft.missingTitle")}</p>
            <p className="mt-1 max-w-[460px] text-[11.5px] text-label-3">{t(locale, "draft.missingHint")}</p>
          </div>
          <button className="btn btn-sm"><PenLine size={13} />{t(locale, "draft.compose")}</button>
        </form>
      </>
    );
  }

  const account = "podpora@kroj.example";

  return (
    <>
      {notice}
      <form action={sendCustomerEmailDraft} className="card overflow-hidden">
        <input type="hidden" name="draftId" value={draft.id} />

        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5" style={{ background: "var(--sheet-2)" }}>
          <p className="flex items-center gap-2 text-[13px] font-semibold">
            <Mail size={14} />{t(locale, "draft.title")}
          </p>
          <span className="pill pill-petrol">{t(locale, "draft.pending")}</span>
        </div>

        <div className="grid gap-3 p-4">
          <div className="grid gap-1.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-baseline sm:gap-x-3">
            <span className="field-label">{t(locale, "draft.to")}</span>
            <span className="mono text-[12px]">{draft.toEmail}</span>
            <span className="field-label">{t(locale, "draft.subject")}</span>
            <span className="text-[12.5px]">{draft.subject}</span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="field-label">{t(locale, "draft.language")}</span>
              {customerLanguages().map((language) => (
                <button
                  key={language}
                  formAction={setCustomerEmailDraftLanguage.bind(null, language)}
                  className="shipgerman-filter-chip mono uppercase"
                  data-active={draft.language === language ? "true" : "false"}
                  title={t(locale, "draft.languageHint")}
                >
                  {language}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11.5px] text-label-3">{t(locale, "draft.languageHint")}</p>
          </div>

          <label>
            <span className="field-label">{t(locale, "draft.body")}</span>
            <textarea
              name="body"
              rows={10}
              maxLength={4000}
              defaultValue={draft.body}
              className="field mt-1 text-[12.5px] leading-relaxed"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="max-w-[420px] text-[11.5px] text-label-3">{t(locale, "draft.hint", { account })}</p>
          <div className="flex items-center gap-2">
            <button formAction={discardCustomerEmailDraft} className="btn btn-sm">
              <Trash2 size={13} />{t(locale, "draft.discard")}
            </button>
            <button className="btn btn-primary btn-sm">
              <Send size={13} />{t(locale, "draft.send")}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
