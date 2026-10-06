"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ChevronDown, Languages, Plus, X } from "lucide-react";

import { createLanguage, deleteLanguage, retranslateLanguage, saveLanguage, type LanguageState } from "@/lib/actions/languages";
import {
  CANONICAL_COLORS,
  CANONICAL_GENDERS,
  DRAFT_KINDS,
  type LanguageInfo,
} from "@/lib/language-registry";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { Notice } from "../ui";

const initial: LanguageState = {};

export type AdminLanguage = LanguageInfo & {
  products: number;
  unknown: { color: string[]; gender: string[] };
};

/**
 * Jeziki strank. Vsak jezik je list: v glavi, kar se vidi na prvi pogled (države,
 * izdelki, neprepoznane besede), pod njo urejanje osnov, besed, pisem in
 * prepoznave maila.
 */
export function AdminLanguages({ languages, aiReady }: { languages: AdminLanguage[]; aiReady: boolean }) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(() => languages.find((language) => language.unknown.color.length + language.unknown.gender.length > 0)?.code ?? null);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] text-label-2">{t("languages.intro")}</p>
        <button type="button" className="btn btn-sm" onClick={() => setAdding((value) => !value)} aria-expanded={adding}>
          <Plus size={14} />
          {t("languages.add")}
        </button>
      </div>

      {adding && <AddLanguage aiReady={aiReady} onDone={(code) => { setAdding(false); setOpen(code); }} onCancel={() => setAdding(false)} />}

      <div className="grid gap-3">
        {languages.map((language) => (
          <LanguageCard
            key={language.code}
            language={language}
            aiReady={aiReady}
            open={open === language.code}
            onToggle={() => setOpen((current) => (current === language.code ? null : language.code))}
          />
        ))}
      </div>
    </div>
  );
}

function AddLanguage({ aiReady, onDone, onCancel }: { aiReady: boolean; onDone: (code: string) => void; onCancel: () => void }) {
  const t = useT();
  const router = useRouter();
  const [state, action] = useActionState(createLanguage, initial);

  useEffect(() => {
    if (!state.ok || !state.code) return;
    router.refresh();
    onDone(state.code);
  }, [state, router, onDone]);

  return (
    <form action={action} className="card p-4" style={{ borderTop: "2px solid var(--petrol)" }}>
      <div className="grid gap-3 sm:grid-cols-[90px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label>
          <span className="field-label">{t("languages.add.code")}</span>
          <input name="code" required maxLength={2} autoFocus placeholder="nl" className="field mono lowercase" />
        </label>
        <label>
          <span className="field-label">{t("languages.field.name")}</span>
          <input name="name" required maxLength={60} placeholder="Nederlands" className="field" />
        </label>
        <label>
          <span className="field-label">{t("languages.field.englishName")}</span>
          <input name="englishName" required maxLength={60} placeholder="Dutch" className="field" />
        </label>
        <label>
          <span className="field-label">{t("languages.field.countries")}</span>
          <input name="countries" maxLength={200} placeholder="NL, BE" className="field mono uppercase" />
        </label>
      </div>
      <p className="mt-2.5 max-w-[70ch] text-[12px] text-label-2">{aiReady ? t("languages.add.hintAi") : t("languages.add.hintNoAi")}</p>
      {state.error && <div className="mt-3"><Notice kind="error">{state.error}</Notice></div>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="btn btn-sm" onClick={onCancel}>{t("common.cancel")}</button>
        <Submit label={t("languages.add.submit")} busy={aiReady ? t("languages.add.busy") : t("common.saving")} />
      </div>
    </form>
  );
}

function LanguageCard({ language, aiReady, open, onToggle }: { language: AdminLanguage; aiReady: boolean; open: boolean; onToggle: () => void }) {
  const t = useT();
  const unknown = language.unknown.color.length + language.unknown.gender.length;
  const bodyId = `language-${language.code}`;

  return (
    <section className="card overflow-hidden" style={{ borderTop: "2px solid var(--rule-ink)" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-left"
      >
        <span className="mono inline-flex h-[22px] min-w-[34px] items-center justify-center border px-1.5 text-[11px] uppercase tracking-[0.08em]" style={{ borderColor: "var(--rule-strong)" }}>
          {language.code}
        </span>
        <span className="text-[15px] font-semibold tracking-[-0.012em]">{language.name}</span>
        <span className="text-[12px] text-label-3">{language.englishName}</span>
        <span className="mono text-[11.5px] text-label-2">{language.countries.join(" · ") || "—"}</span>
        <span className="mono text-[11.5px] text-label-3">{t("languages.products", { count: language.products })}</span>
        {!language.active && <span className="pill">{t("languages.inactive")}</span>}
        {unknown > 0 && <span className="text-[12px] font-medium" style={{ color: "var(--warning)" }}>{t("languages.unknown", { count: unknown })}</span>}
        <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-label-2">
          {open ? t("languages.close") : t("languages.edit")}
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
      </button>
      {open && <LanguageEditor id={bodyId} language={language} aiReady={aiReady} />}
    </section>
  );
}

function LanguageEditor({ id, language, aiReady }: { id: string; language: AdminLanguage; aiReady: boolean }) {
  const t = useT();
  const router = useRouter();
  const [state, action] = useActionState(saveLanguage, initial);
  const [pending, startTransition] = useTransition();
  const [extra, setExtra] = useState<LanguageState | null>(null);
  const [confirm, setConfirm] = useState<"retranslate" | "delete" | null>(null);
  const handled = useRef<LanguageState | null>(null);

  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    router.refresh();
  }, [state, router]);

  const runExtra = (fn: () => Promise<LanguageState>) => startTransition(async () => {
    const result = await fn();
    setExtra(result);
    setConfirm(null);
    if (result.ok) router.refresh();
  });

  const templates = language.templates;

  return (
    <form id={id} action={action} className="border-t" style={{ borderColor: "var(--rule)" }}>
      <input type="hidden" name="code" value={language.code} />

      <Section title={t("languages.section.basics")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="field-label">{t("languages.field.name")}</span>
            <input name="name" defaultValue={language.name} maxLength={60} className="field" />
          </label>
          <label>
            <span className="field-label">{t("languages.field.englishName")}</span>
            <input name="englishName" defaultValue={language.englishName} maxLength={60} className="field" />
          </label>
          <label>
            <span className="field-label">{t("languages.field.countries")}</span>
            <input name="countries" defaultValue={language.countries.join(", ")} maxLength={200} className="field mono uppercase" />
            <span className="mt-1 block text-[11.5px] text-label-3">{t("languages.countriesHint")}</span>
          </label>
          <label className="flex items-center gap-2 self-center text-[13px]">
            <input type="checkbox" name="active" defaultChecked={language.active} className="h-[14px] w-[14px] accent-[var(--petrol)]" />
            {t("languages.field.active")}
          </label>
        </div>
      </Section>

      <Section title={t("languages.section.words")} hint={t("languages.wordsHint")}>
        <div className="grid gap-5 lg:grid-cols-2">
          <WordList
            kind="color"
            title={t("languages.words.color")}
            meanings={CANONICAL_COLORS}
            initial={language.words.color}
            unknown={language.unknown.color}
          />
          <WordList
            kind="gender"
            title={t("languages.words.gender")}
            meanings={CANONICAL_GENDERS}
            initial={language.words.gender}
            unknown={language.unknown.gender}
          />
        </div>
      </Section>

      <Section title={t("languages.section.letters")} hint={t("languages.lettersHint")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="field-label">{t("languages.field.greeting")}</span>
            <input name="greeting" defaultValue={templates.greeting} maxLength={200} className="field" />
          </label>
          <label>
            <span className="field-label">{t("languages.field.greetingAnonymous")}</span>
            <input name="greetingAnonymous" defaultValue={templates.greetingAnonymous} maxLength={200} className="field" />
          </label>
          <label>
            <span className="field-label">{t("languages.field.signOff")}</span>
            <input name="signOff" defaultValue={templates.signOff} maxLength={200} className="field" />
          </label>
        </div>

        <div className="mt-3 border" style={{ borderColor: "var(--rule)" }}>
          {DRAFT_KINDS.map((kind) => {
            const text = templates.kinds[kind];
            const hasOptions = Boolean(text.options?.length);
            return (
              <details key={kind} className="group border-t first:border-t-0" style={{ borderColor: "var(--rule)" }}>
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
                  <ChevronDown size={14} className="text-label-3 transition-transform group-open:rotate-180" aria-hidden />
                  {t(`draft.kind.${kind}` as TranslationKey)}
                  <span className="min-w-0 flex-1 truncate text-[12px] font-normal text-label-3">{text.subject}</span>
                </summary>
                <div className="grid gap-3 px-3 pb-3 pl-[34px]">
                  <label>
                    <span className="field-label">{t("languages.field.subject")}</span>
                    <input name={`kind.${kind}.subject`} defaultValue={text.subject} maxLength={300} className="field" />
                  </label>
                  {kind !== "custom" && (
                    <label>
                      <span className="field-label">{t("languages.field.lead")}</span>
                      <textarea name={`kind.${kind}.lead`} defaultValue={text.lead} rows={text.lead.length > 200 ? 6 : 2} maxLength={1200} className="field" />
                    </label>
                  )}
                  {text.address && (
                    <label>
                      <span className="field-label">{t("languages.field.note")}</span>
                      <textarea name={`kind.${kind}.note`} defaultValue={text.note ?? ""} rows={4} maxLength={1200} className="field" />
                    </label>
                  )}
                  {hasOptions && (
                    <label>
                      <span className="field-label">{t("languages.field.options")}</span>
                      <textarea name={`kind.${kind}.options`} defaultValue={text.options?.join("\n")} rows={2} maxLength={800} className="field" />
                    </label>
                  )}
                  {kind !== "custom" && (
                    <label>
                      <span className="field-label">{t("languages.field.close")}</span>
                      <textarea name={`kind.${kind}.close`} defaultValue={text.close ?? ""} rows={2} maxLength={1200} className="field" />
                    </label>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </Section>

      <Section title={t("languages.section.markers")} hint={t("languages.markersHint")}>
        <textarea name="markers" defaultValue={language.markers.join(", ")} rows={2} maxLength={2000} className="field" />
      </Section>

      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3" style={{ borderColor: "var(--rule)" }}>
        {language.code !== "en" && aiReady && (
          confirm === "retranslate" ? (
            <>
              <span className="text-[12px] text-label-2">{t("languages.retranslateHint")}</span>
              <button type="button" className="btn btn-sm" disabled={pending} onClick={() => runExtra(() => retranslateLanguage(language.code))}>
                {pending ? t("languages.add.busy") : t("languages.retranslateConfirm")}
              </button>
              <button type="button" className="btn btn-sm px-1.5" onClick={() => setConfirm(null)} aria-label={t("common.cancel")}><X size={14} /></button>
            </>
          ) : (
            <button type="button" className="btn btn-sm" onClick={() => setConfirm("retranslate")}>
              <Languages size={14} />
              {t("languages.retranslate")}
            </button>
          )
        )}
        {!language.builtin && (
          confirm === "delete" ? (
            <>
              <button type="button" className="btn btn-sm btn-destructive" disabled={pending} onClick={() => runExtra(() => deleteLanguage(language.code))}>{t("languages.deleteConfirm")}</button>
              <button type="button" className="btn btn-sm px-1.5" onClick={() => setConfirm(null)} aria-label={t("common.cancel")}><X size={14} /></button>
            </>
          ) : (
            <button type="button" className="btn btn-sm btn-plain" onClick={() => setConfirm("delete")}>{t("languages.delete")}</button>
          )
        )}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {state.ok && <span className="text-[12px]" style={{ color: "var(--success)" }} role="status">{t("languages.saved")}</span>}
          <Submit label={t("languages.save")} busy={t("common.saving")} />
        </span>
        {(state.error || extra?.error) && <div className="basis-full"><Notice kind="error">{state.error ?? extra?.error}</Notice></div>}
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-t px-4 py-4 first:border-t-0" style={{ borderColor: "var(--rule)" }}>
      <h3 className="caption" style={{ color: "var(--ink)" }}>{title}</h3>
      {hint && <p className="mt-1 max-w-[70ch] text-[12px] text-label-2">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

type Row = { uid: number; word: string; meaning: string; unknown: boolean };

/** Besede in njihov pomen. Neprepoznane besede iz izdelkov stojijo na vrhu, še brez pomena. */
function WordList({ kind, title, meanings, initial, unknown }: {
  kind: "color" | "gender";
  title: string;
  meanings: readonly string[];
  initial: Record<string, string>;
  unknown: string[];
}) {
  const t = useT();
  const seq = useRef(0);
  const [rows, setRows] = useState<Row[]>(() => [
    ...unknown.map((word) => ({ uid: seq.current++, word, meaning: "", unknown: true })),
    ...Object.entries(initial).map(([word, meaning]) => ({ uid: seq.current++, word, meaning, unknown: false })),
  ]);
  const update = (uid: number, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.uid === uid ? { ...row, ...patch } : row)));
  const meaningLabel = (meaning: string) => t(`languages.${kind}.${meaning}` as TranslationKey);

  return (
    <div>
      <p className="field-label">{title}</p>
      <ul className="grid gap-1.5">
        {rows.map((row) => (
          <li key={row.uid} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
            <input
              name={`${kind}.word`}
              value={row.word}
              onChange={(event) => update(row.uid, { word: event.target.value })}
              maxLength={40}
              aria-label={t("languages.words.word")}
              className="field h-[28px] text-[12.5px]"
              style={row.unknown && !row.meaning ? { borderColor: "var(--warning)" } : undefined}
            />
            <select
              name={`${kind}.meaning`}
              value={row.meaning}
              onChange={(event) => update(row.uid, { meaning: event.target.value })}
              aria-label={t("languages.words.meaning")}
              className="field h-[28px] text-[12.5px]"
            >
              <option value="">{t("languages.words.choose")}</option>
              {meanings.map((meaning) => <option key={meaning} value={meaning}>{meaningLabel(meaning)}</option>)}
            </select>
            <button
              type="button"
              className="btn btn-sm btn-plain px-1.5"
              onClick={() => setRows((current) => current.filter((candidate) => candidate.uid !== row.uid))}
              aria-label={t("languages.words.remove")}
              title={t("languages.words.remove")}
            >
              <X size={13} />
            </button>
          </li>
        ))}
      </ul>
      {unknown.length > 0 && <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--warning)" }}>{t("languages.words.unknown")}</p>}
      <button
        type="button"
        className="btn btn-sm btn-plain -ml-1.5 mt-1.5"
        onClick={() => setRows((current) => [...current, { uid: seq.current++, word: "", meaning: "", unknown: false }])}
      >
        <Plus size={13} />
        {t("languages.words.add")}
      </button>
    </div>
  );
}

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
      {pending ? busy : label}
    </button>
  );
}
