"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Languages, Mail, Send } from "lucide-react";

import {
  planBulkMailAction,
  sendBulkMail,
  translateBulkMail,
  type BulkMailPlan,
  type BulkMailState,
} from "@/lib/actions/bulk-mail";
import { BULK_MAIL_KINDS, type BulkMailKind } from "@/lib/bulk-mail";
import type { CustomerLanguage } from "@/lib/customer-email";
import { useLocale, useT } from "@/lib/i18n/client";
import { pluralSuffix } from "@/lib/i18n/shared";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { Notice } from "./ui";
import { Sheet } from "./Sheet";

const initial: BulkMailState = {};

type Text = { subject: string; body: string };

/**
 * Eno pismo celemu kupu naročil, vsakemu v njegovem jeziku.
 *
 * Pregled je ostal, kar je bil — pismo gre skozi človeka, preden odide. Novo je
 * le, da se pregleda enkrat na jezik: skupine so tu izpisane s prejemniki vred,
 * da se pred pošiljanjem vidi, kdo bo dobil kateri list.
 */
export function BulkMailPanel({
  issueIds,
  onClose,
  onSent,
}: {
  issueIds: number[];
  onClose: () => void;
  onSent: (sent: number, failed: string[]) => void;
}) {
  const t = useT();
  const locale = useLocale();
  // Sklon se pri enem prejemniku in pri sedmih razlikuje; kup je pogosto oboje.
  const recipients = (count: number) =>
    t(`bulkMail.recipients.${pluralSuffix(locale, count)}` as TranslationKey, { count });
  const [kind, setKind] = useState<BulkMailKind>("custom");
  const [plan, setPlan] = useState<BulkMailPlan | null>(null);
  const [texts, setTexts] = useState<Record<string, Text>>({});
  const [translating, setTranslating] = useState<string | null>(null);
  const [translated, setTranslated] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [state, action] = useActionState(sendBulkMail, initial);

  // Kdo dobi pismo, pove strežnik: e-naslov in država sta v bazi, list v
  // seznamu ju ne nosi. Ob menjavi vrste pisma se predloga izpiše na novo.
  useEffect(() => {
    let current = true;
    setPlan(null);
    startTransition(async () => {
      const next = await planBulkMailAction(issueIds, kind);
      if (!current) return;
      setPlan(next);
      setTexts(Object.fromEntries(next.groups.map((group) => [group.language, { subject: group.subject, body: group.body }])));
      setTranslated(false);
      setAiError(null);
    });
    return () => { current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    if (state.ok) onSent(state.sent ?? 0, state.failed ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const edit = (language: string, patch: Partial<Text>) => {
    setTexts((current) => ({ ...current, [language]: { ...current[language], ...patch } }));
  };

  /** Prevede besedilo te skupine v vse ostale jezike kupa. */
  const translate = (from: CustomerLanguage) => {
    if (!plan) return;
    const source = texts[from];
    if (!source?.body.trim()) return;
    setAiError(null);
    setTranslating(from);
    startTransition(async () => {
      for (const group of plan.groups) {
        if (group.language === from) continue;
        const result = await translateBulkMail(from, group.language, source.subject, source.body);
        if (result.ok) {
          edit(group.language, { subject: result.subject, body: result.body });
        } else {
          setAiError(result.error);
          break;
        }
      }
      setTranslating(null);
      setTranslated(true);
    });
  };

  const total = plan?.total ?? 0;

  return (
    <Sheet
      title={t("bulkMail.title", { count: total || issueIds.length })}
      subtitle={t("bulkMail.subtitle")}
      onClose={onClose}
      width={640}
    >
      <form action={action} className="border-t" style={{ borderColor: "var(--rule)" }}>
        {issueIds.map((id) => (
          <input key={id} type="hidden" name="issueId" value={id} />
        ))}
        <input type="hidden" name="kind" value={kind} />

        <div className="grid gap-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="field-label">{t("bulkMail.kind")}</span>
            {BULK_MAIL_KINDS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                className="shipgerman-filter-chip"
                data-active={kind === option ? "true" : "false"}
              >
                {t(`bulkMail.kind.${option}` as TranslationKey)}
              </button>
            ))}
          </div>

          {plan === null ? (
            <p className="text-[12.5px] text-label-3">{t("bulkMail.loading")}</p>
          ) : (
            <>
              <p className="mono text-[11.5px] text-label-2">
                {recipients(plan.total)}
                {plan.noEmail > 0 && <> · {t("bulkMail.noEmail", { count: plan.noEmail })}</>}
                {plan.repeatedAddresses > 0 && <> · {t("bulkMail.repeated", { count: plan.repeatedAddresses })}</>}
              </p>

              {plan.groups.map((group) => (
                <div key={group.language} className="border p-3" style={{ borderColor: "var(--rule)" }}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="pill pill-petrol mono uppercase">{group.language}</span>
                    <span className="mono text-[11px] text-label-2">
                      {recipients(group.count)}
                    </span>
                    <span className="mono truncate text-[11px] text-label-3">
                      {group.orders.map((order) => `#${order}`).join(" · ")}
                      {group.count > group.orders.length ? ` · +${group.count - group.orders.length}` : ""}
                    </span>
                    {plan.aiReady && plan.groups.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm ml-auto"
                        disabled={translating !== null || !texts[group.language]?.body.trim()}
                        onClick={() => translate(group.language)}
                        title={t("bulkMail.translateHint")}
                      >
                        <Languages size={13} />
                        {translating === group.language ? t("bulkMail.translating") : t("bulkMail.translate")}
                      </button>
                    )}
                  </div>

                  <label className="block">
                    <span className="field-label">{t("bulkMail.subject")}</span>
                    <input
                      name={`subject:${group.language}`}
                      value={texts[group.language]?.subject ?? ""}
                      onChange={(e) => edit(group.language, { subject: e.target.value })}
                      maxLength={300}
                      className="field mt-1 text-[12.5px]"
                    />
                  </label>

                  <label className="mt-2 block">
                    <span className="field-label">{t("bulkMail.text")}</span>
                    <textarea
                      name={`body:${group.language}`}
                      value={texts[group.language]?.body ?? ""}
                      onChange={(e) => edit(group.language, { body: e.target.value })}
                      rows={6}
                      maxLength={4000}
                      placeholder={t("bulkMail.textPlaceholder")}
                      className="field mt-1 text-[12.5px] leading-relaxed"
                    />
                  </label>
                </div>
              ))}

              <p className="text-[11.5px] text-label-3">{t("bulkMail.tokenHint")}</p>
              {translated && !aiError && (
                <Notice kind="ok">{t("bulkMail.translated")}</Notice>
              )}
              {aiError && (
                <Notice kind="error">
                  {t(`draft.ai.error.${aiError.replace(/^ai_/, "")}` as TranslationKey)}
                </Notice>
              )}
              {/* Ista poved dvakrat je šum: strežnikova napaka prevlada nad
                  opozorilom, ki smo ga izpisali vnaprej. */}
              {state.error
                ? <Notice kind="error">{state.error}</Notice>
                : !plan.gmailReady && <Notice kind="error">{t("bulkMail.error.gmail")}</Notice>}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: "var(--rule)" }}>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <SendButton count={total} disabled={plan === null || total === 0 || !plan.gmailReady} />
        </div>
      </form>
    </Sheet>
  );
}

function SendButton({ count, disabled }: { count: number; disabled: boolean }) {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn btn-primary btn-sm">
      {pending ? <Mail size={14} /> : <Send size={14} />}
      {pending ? t("bulkMail.sending") : t("bulkMail.send", { count })}
    </button>
  );
}
