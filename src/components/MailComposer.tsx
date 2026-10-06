"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Languages, Pencil, PenLine, Plus, Reply, Send, Sparkles, Trash2, Undo2 } from "lucide-react";

import { AutoTextarea } from "./AutoTextarea";
import {
  aiDraftCustomerEmail,
  aiReplyCustomerEmail,
  aiReviseCustomerEmail,
  previewCustomerEmail,
  previewTemplateEmail,
  sendComposedCustomerEmail,
  translateDraftForCheck,
  type TemplatePreview,
} from "@/lib/actions/customer-email";
import {
  aiTranslateTemplate,
  aiWriteTemplateText,
  deleteMailTemplate,
  listMailTemplates,
  saveMailTemplate,
} from "@/lib/actions/mail-templates";
import { customerLanguages, DRAFT_KINDS, type DraftKind } from "@/lib/customer-email";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { MailTemplateView, TemplateText, TemplateTexts } from "@/lib/mail-template";
import { Sheet } from "./Sheet";
import { Notice } from "./ui";

/** Izbrano pismo: vgrajena vrsta ali lastna predloga ekipe. */
type Choice = { kind: DraftKind } | { templateId: number };
type Editing = { id: number | null; name: string; texts: TemplateTexts };

/** Kar okno pošte potrebuje, da ob niti ponudi tudi odgovor. */
export type MailComposeConfig = {
  issueId: number;
  hasExchange: boolean;
  aiEnabled: boolean;
  /** Google prevajalnik je nastavljen — gumb za preverjanje pisma je smiseln. */
  translateEnabled: boolean;
  account: string;
};

/**
 * Pisanje pisma stranki, ob niti v oknu Pošta. Namenoma ne pošilja nič samo
 * od sebe in v bazi ne pusti sledi, dokler človek ne pritisne Pošlji — dokler
 * se premišljuje, je to samo list papirja. Izjema so lastne predloge, ki jih
 * ekipa tu dodaja in ureja.
 *
 * `replyRequest` je števec: vsako povečanje pomeni »AI, napiši odgovor na nit«
 * (gumb Pripravi odgovor pod nitjo).
 */
export function MailComposer({ config, customerEmail, replyRequest, onDirtyChange, onSent }: {
  config: MailComposeConfig;
  customerEmail: string;
  replyRequest: number;
  onDirtyChange: (dirty: boolean) => void;
  onSent: () => void;
}) {
  const { issueId, hasExchange, aiEnabled, translateEnabled, account } = config;
  const t = useT();
  // Obvestilo o odpremi ima smisel le, kadar je kaj za zamenjati.
  const kinds = DRAFT_KINDS.filter((kind) => kind !== "exchangeShipped" || hasExchange);
  const [choice, setChoice] = useState<Choice>({ kind: replyRequest > 0 ? "custom" : kinds[0] });
  const [templates, setTemplates] = useState<MailTemplateView[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [language, setLanguage] = useState<string>("");
  const [missing, setMissing] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  // Besedilo, kakršno je prišlo iz predloge: od njega naprej je pismo »napisano«.
  const [baseline, setBaseline] = useState("");
  const [instruction, setInstruction] = useState("");
  // Besedilo pred zadnjim posegom AI — en klik nazaj, če popravek ni tak, kot je bil mišljen.
  const [undo, setUndo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, startLoad] = useTransition();
  const [thinking, startThinking] = useTransition();
  const [sending, startSending] = useTransition();
  // Prevod za preverjanje. Stoji ob pismu in se ne da urejati — pošlje se
  // besedilo zgoraj, v jeziku stranke, ne to.
  const [check, setCheck] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();
  // Odgovor AI počaka, da se naloži zadnje zahtevano prazno pismo — sicer bi
  // ga predogled, ki pride za njim, prepisal. Števca in ne zastavica: med
  // preklopom predloge je »naloženo« še vedno res, a za prejšnjo predlogo.
  const requestedLoad = useRef(0);
  const [appliedLoad, setAppliedLoad] = useState(0);
  const handledReply = useRef(0);

  const dirty = body.trim() !== baseline.trim();
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => {
    listMailTemplates().then(setTemplates).catch(() => {});
  }, []);

  const load = useCallback((next: Choice, nextLanguage: string) => {
    const seq = ++requestedLoad.current;
    startLoad(async () => {
      const preview = "kind" in next
        ? await previewCustomerEmail(issueId, next.kind, nextLanguage)
        : await previewTemplateEmail(issueId, next.templateId, nextLanguage);
      if (!preview) {
        setError("draft.ai.error.gone");
        return;
      }
      setError(null);
      setLanguage(preview.language);
      setMissing("templateId" in next ? (preview as TemplatePreview).missing : null);
      setSubject(preview.subject);
      setBody(preview.body);
      setBaseline(preview.body);
      setUndo(null);
      setCheck(null);
      setAppliedLoad(seq);
    });
  }, [issueId]);

  useEffect(() => { load(choice, language); }, [choice, load]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickLanguage(next: string) {
    setLanguage(next);
    load(choice, next);
  }

  function generate() {
    startThinking(async () => {
      const result = await aiDraftCustomerEmail(issueId, language, instruction);
      if (result.ok) {
        setError(null);
        applyAi(result.body);
      } else {
        setError(`draft.ai.error.${result.error.replace(/^ai_/, "")}`);
      }
    });
  }

  /** Besedilo, ki ga je napisal AI, zamenja pismo; prejšnje ostane za »Razveljavi«. */
  function applyAi(next: string) {
    setUndo(body);
    setBody(next);
    setCheck(null);
    setSent(false);
  }

  /**
   * Popravek napisanega pisma: AI spremeni samo to, kar piše v navodilu
   * (»zamenjaj pozdrav«, »skrajšaj drugi odstavek«), ostalo pusti.
   */
  function revise() {
    startThinking(async () => {
      const result = await aiReviseCustomerEmail(issueId, language, body, instruction);
      if (!result.ok) {
        setError(`draft.ai.error.${result.error.replace(/^ai_/, "")}`);
        return;
      }
      setError(null);
      applyAi(result.body);
      // Navodilo je opravljeno; naslednji popravek se začne s praznim poljem.
      setInstruction("");
    });
  }

  /**
   * Odgovor na pošto: model prebere nit, naročilo in hišna pravila. Brez
   * izrecno izbranega jezika piše v jeziku, v katerem je stranka pisala.
   */
  function replyToThread(chosenLanguage: string | null) {
    setSent(false);
    startThinking(async () => {
      const result = await aiReplyCustomerEmail(issueId, chosenLanguage, instruction);
      if (!result.ok) {
        setError(`draft.ai.error.${result.error.replace(/^ai_/, "")}`);
        return;
      }
      setError(null);
      applyAi(result.body);
      if (result.language !== language) {
        // Zadeva mora biti v jeziku pisma; besedilo predogleda ne sme povoziti odgovora.
        const preview = await previewCustomerEmail(issueId, "custom", result.language);
        setLanguage(result.language);
        if (preview) setSubject(preview.subject);
      }
    });
  }

  // Gumb »Pripravi odgovor« pod nitjo: preklopi na »Drugo« in sestavi odgovor.
  useEffect(() => {
    if (replyRequest === handledReply.current) return;
    if ("templateId" in choice || choice.kind !== "custom") {
      setChoice({ kind: "custom" });
      return;
    }
    if (appliedLoad === 0 || appliedLoad !== requestedLoad.current || !aiEnabled) return;
    handledReply.current = replyRequest;
    replyToThread(null);
  }, [replyRequest, choice, appliedLoad, aiEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Predloga nima stranke jezika: prevod gre v predlogo, da ga naslednjič ni treba. */
  function translateMissing() {
    if (!("templateId" in choice) || !missing) return;
    const source = templates.find((template) => template.id === choice.templateId)?.texts[language];
    if (!source) return;
    const target = missing;
    startThinking(async () => {
      const result = await aiTranslateTemplate({ templateId: choice.templateId, from: language, subject: source.subject, body: source.body, to: [target] });
      if (result.templates) setTemplates(result.templates);
      if (result.error) setError(`draft.ai.error.${result.error}`);
      else load(choice, target);
    });
  }

  /** Prevod v angleščino, da se pismo da prebrati pred pošiljanjem. */
  function checkTranslation() {
    startChecking(async () => {
      const result = await translateDraftForCheck(body);
      if (result.ok) {
        setError(null);
        setCheck(result.text);
      } else {
        setCheck(null);
        setError(`draft.check.error.${result.error}`);
      }
    });
  }

  function send(fd: FormData) {
    startSending(async () => {
      const result = await sendComposedCustomerEmail(fd);
      if (!result.ok) {
        setError(`draft.feedback.${result.error}`);
        return;
      }
      setError(null);
      setSent(true);
      setInstruction("");
      // Poslano pismo ni več »napisano«: okno se lahko zapre brez vprašanja.
      setBaseline(body);
      setCheck(null);
      onSent();
    });
  }

  function openEditor(templateId: number | null) {
    const template = templates.find((item) => item.id === templateId);
    setEditing(template ? { id: template.id, name: template.name, texts: template.texts } : { id: null, name: "", texts: {} });
  }

  const busy = loading || thinking || sending;
  const templateId = "templateId" in choice ? choice.templateId : null;

  return (
    <>
      {editing && (
        <Sheet
          title={t(editing.id === null ? "template.newTitle" : "template.editTitle")}
          subtitle={t("template.editorSubtitle")}
          onClose={() => setEditing(null)}
          width={720}
        >
          <TemplateEditor
            initial={editing}
            startLanguage={language}
            aiEnabled={aiEnabled}
            onCancel={() => setEditing(null)}
            onSaved={(next, id) => {
              setTemplates(next);
              setEditing(null);
              setChoice({ templateId: id });
            }}
            onDeleted={(next) => {
              setTemplates(next);
              setEditing(null);
              setChoice({ kind: kinds[0] });
            }}
          />
        </Sheet>
      )}

      <form action={send} className="px-4 py-4">
        <input type="hidden" name="issueId" value={issueId} />
        <input type="hidden" name="kind" value={"kind" in choice ? choice.kind : "custom"} />
        <input type="hidden" name="language" value={language} />
        {templateId !== null && <input type="hidden" name="templateId" value={templateId} />}

        <div className="flex flex-wrap items-center gap-1.5">
          {kinds.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setChoice({ kind: option })}
              className="shipgerman-filter-chip"
              data-active={"kind" in choice && choice.kind === option ? "true" : "false"}
            >
              {t(`draft.kind.${option}` as TranslationKey)}
            </button>
          ))}
        </div>

        {/* Lastne predloge ekipe: izbira, urejanje in nova predloga v isti vrsti. */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3" style={{ borderColor: "var(--rule)" }}>
          <span className="field-label mb-0 mr-1">{t("template.mine")}</span>
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setChoice({ templateId: template.id })}
              className="shipgerman-filter-chip"
              data-active={templateId === template.id ? "true" : "false"}
            >
              {template.name}
            </button>
          ))}
          <button type="button" onClick={() => openEditor(null)} className="btn btn-sm btn-plain">
            <Plus size={13} />{t("template.new")}
          </button>
          {templateId !== null && (
            <button type="button" onClick={() => openEditor(templateId)} className="btn btn-sm ml-auto">
              <Pencil size={13} />{t("template.edit")}
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="field-label mb-0 mr-1">{t("draft.language")}</span>
          {customerLanguages().map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => pickLanguage(option)}
              className="shipgerman-filter-chip mono uppercase"
              data-active={language === option ? "true" : "false"}
            >
              {option}
            </button>
          ))}
        </div>

        {missing && (
          <div
            className="mt-3 flex flex-wrap items-center justify-between gap-2 border px-3 py-2 text-[12px]"
            style={{ borderColor: "var(--warning)" }}
          >
            <span>{t("template.missing", { language: missing.toUpperCase(), source: language.toUpperCase() })}</span>
            <button type="button" onClick={translateMissing} disabled={!aiEnabled || thinking} className="btn btn-sm">
              <Languages size={13} />
              {thinking ? t("template.translating") : t("template.translateOne", { language: missing.toUpperCase() })}
            </button>
          </div>
        )}

        <div className="mt-3 grid gap-1 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-baseline sm:gap-x-3">
          <span className="field-label">{t("draft.to")}</span>
          <span className="mono truncate text-[12px]">{customerEmail}</span>
          <span className="field-label">{t("draft.subject")}</span>
          <span className="text-[12.5px]">{subject || "—"}</span>
        </div>
        <p className="mt-1 text-[11.5px] text-label-3">{t("draft.subjectHint")}</p>

        {/* Navodilo za AI: pri »Drugo« lahko napiše pismo, popravi pa vsakega. */}
        <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--rule)" }}>
          <label className="field-label" htmlFor="ai-instruction">{t("draft.aiInstruction")}</label>
          <AutoTextarea
            id="ai-instruction"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            maxLength={1000}
            placeholder={t("draft.aiPlaceholder")}
            className="field mt-1 w-full text-[12.5px]"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {"kind" in choice && choice.kind === "custom" && (
              <>
                <button
                  type="button"
                  onClick={() => replyToThread(language)}
                  disabled={!aiEnabled || thinking}
                  className="btn btn-sm"
                  title={aiEnabled ? t("draft.replyTitle") : t("draft.ai.error.not_configured")}
                >
                  <Reply size={13} />{thinking ? t("draft.aiWorking") : t("draft.reply")}
                </button>
                <button
                  type="button"
                  onClick={generate}
                  disabled={!aiEnabled || thinking || !instruction.trim()}
                  className="btn btn-sm"
                  title={aiEnabled ? undefined : t("draft.ai.error.not_configured")}
                >
                  <Sparkles size={13} />{t("draft.aiGenerate")}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={revise}
              disabled={!aiEnabled || thinking || !instruction.trim() || !body.trim()}
              className="btn btn-sm"
              title={aiEnabled ? t("draft.reviseTitle") : t("draft.ai.error.not_configured")}
            >
              <PenLine size={13} />{t("draft.revise")}
            </button>
          </div>
          <p className="mt-1.5 text-[11.5px] text-label-3">
            {aiEnabled ? t("draft.replyHint") : t("draft.ai.error.not_configured")}
          </p>
        </div>

        {error && (
          <div className="mt-3">
            <Notice kind="error">{t(error as TranslationKey)}</Notice>
          </div>
        )}
        {sent && !error && (
          <div className="mt-3">
            <Notice kind="ok">{t("draft.feedback.sent")}</Notice>
          </div>
        )}

        <label className="mt-3 block">
          <span className="flex items-center justify-between gap-2">
            <span className="field-label mb-0">{t("draft.body")}</span>
            <span className="flex items-center gap-2">
              {undo !== null && (
                <button type="button" onClick={() => { setBody(undo); setUndo(null); setCheck(null); }} className="btn btn-sm btn-plain" title={t("draft.undoTitle")}>
                  <Undo2 size={13} />{t("draft.undo")}
                </button>
              )}
              {/* Prevod je pomoč pri branju, ne del pisma — zato stoji ob naslovu
                  polja in ne med gumbi za pošiljanje. */}
              <button
                type="button"
                onClick={checkTranslation}
                disabled={!translateEnabled || checking || !body.trim()}
                title={translateEnabled ? undefined : t("draft.check.error.not_configured")}
                className="btn btn-sm"
              >
                <Languages size={13} />
                {checking ? t("draft.checkWorking") : t("draft.check")}
              </button>
            </span>
          </span>
          <textarea
            name="body"
            rows={12}
            maxLength={4000}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setSent(false);
              // Po ročnem popravku bi »Razveljavi« pobrisal tudi tipkano.
              setUndo(null);
              // Popravljeno pismo pomeni, da prevod ni več njegov prevod.
              setCheck(null);
            }}
            className="field mt-1 text-[12.5px] leading-relaxed"
            placeholder={loading ? t("draft.loading") : undefined}
          />
        </label>

        {check !== null && (
          <div className="mt-2 border px-3 py-2.5" style={{ borderColor: "var(--rule)", background: "var(--surface-2)" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="caption" style={{ color: "var(--ink-2)" }}>{t("draft.checkTitle")}</span>
              <button type="button" onClick={() => setCheck(null)} className="text-[11.5px] text-label-3 hover:text-label">
                {t("common.close")}
              </button>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-label-2">{check}</p>
            <p className="mt-2 text-[11.5px] text-label-3">{t("draft.checkHint")}</p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[300px] text-[11.5px] text-label-3">{t("draft.hint", { account })}</p>
          <button disabled={busy || !body.trim()} className="btn btn-primary btn-sm">
            <Send size={13} />{sending ? t("draft.sending") : t("draft.send")}
          </button>
        </div>
      </form>
    </>
  );
}

const EMPTY_TEXT: TemplateText = { subject: "", body: "" };

/**
 * Urejevalnik lastne predloge. Besedilo se piše po jezikih; AI napiše besedilo
 * v izbranem jeziku ali ga prevede v jezike, ki ga še nimajo. Shrani se šele
 * s klikom — prej je vse samo v oknu.
 */
function TemplateEditor({ initial, startLanguage, aiEnabled, onCancel, onSaved, onDeleted }: {
  initial: Editing;
  startLanguage: string;
  aiEnabled: boolean;
  onCancel: () => void;
  onSaved: (templates: MailTemplateView[], id: number) => void;
  onDeleted: (templates: MailTemplateView[]) => void;
}) {
  const t = useT();
  const languages = customerLanguages();
  const [name, setName] = useState(initial.name);
  const [texts, setTexts] = useState<TemplateTexts>(initial.texts);
  const [lang, setLang] = useState(() => {
    if (initial.texts[startLanguage] || (languages.includes(startLanguage) && Object.keys(initial.texts).length === 0)) return startLanguage;
    return Object.keys(initial.texts)[0] ?? languages[0] ?? "en";
  });
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  const current = texts[lang] ?? EMPTY_TEXT;
  const hasText = (code: string) => Boolean(texts[code]?.body.trim());
  const untranslated = languages.filter((code) => code !== lang && !hasText(code));

  const patch = (language: string, fields: Partial<TemplateText>) =>
    setTexts((all) => ({ ...all, [language]: { ...(all[language] ?? EMPTY_TEXT), ...fields } }));

  function write() {
    const target = lang;
    start(async () => {
      const result = await aiWriteTemplateText(target, instruction);
      if (result.ok) {
        setError(null);
        patch(target, { body: result.body });
      } else {
        setError(`draft.ai.error.${result.error}`);
      }
    });
  }

  function translate() {
    start(async () => {
      const result = await aiTranslateTemplate({ templateId: null, from: lang, subject: current.subject, body: current.body, to: untranslated });
      setTexts((all) => ({ ...all, ...result.texts }));
      setError(result.error ? `draft.ai.error.${result.error}` : null);
    });
  }

  function save() {
    start(async () => {
      const result = await saveMailTemplate({ id: initial.id, name, texts });
      if (result.ok) onSaved(result.templates, result.id);
      else setError(`template.error.${result.error}`);
    });
  }

  function remove() {
    if (initial.id === null) return;
    const id = initial.id;
    start(async () => onDeleted(await deleteMailTemplate(id)));
  }

  return (
    <div className="px-6 py-5">
      <label className="block">
        <span className="field-label">{t("template.name")}</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          placeholder={t("template.namePlaceholder")}
          className="field mt-1"
          autoFocus={initial.id === null}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="field-label mb-0 mr-1">{t("template.language")}</span>
        {languages.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className="shipgerman-filter-chip mono uppercase"
            data-active={lang === code ? "true" : "false"}
            title={hasText(code) ? undefined : t("template.noText")}
          >
            {code}
            {hasText(code) && <span aria-hidden className="ml-1.5 inline-block h-1.5 w-1.5" style={{ background: "var(--petrol)" }} />}
          </button>
        ))}
        <button
          type="button"
          onClick={translate}
          disabled={!aiEnabled || pending || !current.body.trim() || untranslated.length === 0}
          className="btn btn-sm ml-auto"
          title={aiEnabled ? undefined : t("draft.ai.error.not_configured")}
        >
          <Languages size={13} />{pending ? t("template.translating") : t("template.translate")}
        </button>
      </div>

      <label className="mt-4 block">
        <span className="field-label">{t("template.subject")}</span>
        <input
          value={current.subject}
          onChange={(event) => patch(lang, { subject: event.target.value })}
          maxLength={300}
          placeholder={t("template.subjectPlaceholder")}
          className="field mt-1"
        />
      </label>

      <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--rule)" }}>
        <label className="field-label" htmlFor="template-ai">{t("template.aiInstruction")}</label>
        <div className="mt-1 flex flex-wrap items-start gap-2">
          <AutoTextarea
            id="template-ai"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            maxLength={1000}
            placeholder={t("template.aiPlaceholder")}
            className="field min-w-[220px] flex-1 text-[12.5px]"
          />
          <button type="button" onClick={write} disabled={!aiEnabled || pending || !instruction.trim()} className="btn btn-sm">
            <Sparkles size={13} />{pending ? t("draft.aiWorking") : t("template.aiWrite")}
          </button>
        </div>
        {!aiEnabled && <p className="mt-1.5 text-[11.5px] text-label-3">{t("draft.ai.error.not_configured")}</p>}
      </div>

      <label className="mt-4 block">
        <span className="field-label">{t("template.body")}</span>
        <textarea
          rows={10}
          maxLength={3000}
          value={current.body}
          onChange={(event) => patch(lang, { body: event.target.value })}
          className="field mt-1 text-[12.5px] leading-relaxed"
        />
      </label>
      <p className="mt-1 text-[11.5px] text-label-3">{t("template.bodyHint")}</p>

      {error && (
        <div className="mt-4">
          <Notice kind="error">{t(error as TranslationKey)}</Notice>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {initial.id !== null && (confirmDelete ? (
            <>
              <span className="text-[12px] text-label-2">{t("template.deleteConfirm")}</span>
              <button type="button" onClick={remove} disabled={pending} className="btn btn-sm btn-destructive">
                <Trash2 size={13} />{t("template.delete")}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn btn-sm">{t("common.cancel")}</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-sm btn-plain">
              <Trash2 size={13} />{t("template.delete")}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] text-label-3">{t("template.shared")}</span>
          <button type="button" onClick={onCancel} className="btn btn-sm">{t("common.cancel")}</button>
          <button type="button" onClick={save} disabled={pending} className="btn btn-primary btn-sm">
            {pending ? t("common.saving") : t("template.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
