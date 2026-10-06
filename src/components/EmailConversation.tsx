"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Clock3, Download, Eye, Languages, Mail, Paperclip, RefreshCw, Reply, SendHorizontal, Sparkles, X } from "lucide-react";

import { formatDateTime } from "@/lib/format";
import type { ReturnIntent } from "@/lib/email-summary";
import { useLocale, useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { pluralSuffix } from "@/lib/i18n/shared";
import { MailComposer, type MailComposeConfig } from "./MailComposer";
import { Sheet } from "./Sheet";
import { Notice } from "./ui";

type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  preview: "image" | "pdf" | "text" | "none";
};

type Message = {
  id: string;
  sentAt: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  source: "customer" | "shopify";
  direction: "incoming" | "outgoing";
  attachments: Attachment[];
  translatedSubject?: string | null;
  translatedBody?: string | null;
  detectedLanguage?: string | null;
};

type Result = {
  account: string;
  messages: Message[];
  truncated: boolean;
  fingerprint: string;
  translated?: boolean;
  translationAvailable?: boolean;
  summaryAvailable?: boolean;
};

type Summary = {
  overview: string;
  customerRequest: string;
  returnIntent: ReturnIntent;
  facts: string[];
  // Povzetki pred uvedbo poteka ga nimajo.
  timeline?: string[];
  commitments: string[];
  currentState: string;
  nextStep: string;
  warnings: string[];
};

type SummaryResult = {
  summary: Summary;
  fingerprint: string;
  generatedAt: string;
  cached: boolean;
};

type AiChatEntry = { role: "user" | "assistant"; content: string };

type EmailLookup = {
  issueKey?: string;
  customerEmail: string;
  orderNumber?: string;
  customerName?: string | null;
};

export function EmailConversation({
  issueKey,
  customerEmail,
  orderNumber,
  customerName = null,
  disabled = false,
  label,
  compose,
}: EmailLookup & {
  disabled?: boolean;
  /** Krajši napis, kadar skupina okoli gumba že pove, čigav je pogovor. */
  label?: string;
  /**
   * Na strani ticketa: ob niti se da tudi pisati. Brez tega (nov ticket, ShipG
   * obrazec) je okno samo za branje — ticketa še ni in pismo ne bi imelo kam.
   */
  compose?: MailComposeConfig;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Desni stolpec: AI povzetek ali odgovor. Odgovor ostane naložen, ko enkrat
  // odpreš — preklop na povzetek ne sme pobrisati napisanega.
  const [pane, setPane] = useState<"summary" | "reply">("reply");
  const [composerMounted, setComposerMounted] = useState(false);
  const [replyRequest, setReplyRequest] = useState(0);
  const [composerDirty, setComposerDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // Ozek zaslon nima prostora za dva stolpca: kaže se eno ali drugo.
  const [mobileView, setMobileView] = useState<"thread" | "side">("thread");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const summaryRequest = useRef<string | null>(null);
  const lookupVersion = useRef(0);
  const lookupKey = `${issueKey ?? "preview"}:${customerEmail}:${orderNumber ?? ""}:${customerName ?? ""}`;

  const load = useCallback(async (translate = false) => {
    const version = lookupVersion.current;
    if (translate) setTranslating(true);
    else setLoading(true);
    setError(null);
    setTranslationError(null);
    try {
      const response = await fetch(conversationUrl({ issueKey, customerEmail, orderNumber, customerName }, translate), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = (await response.json()) as Result & { error?: string };
      if (!response.ok) throw new Error(data.error || "unavailable");
      if (version !== lookupVersion.current) return;
      setResult(data);
      setShowTranslated(Boolean(data.translated));
    } catch (reason) {
      if (version !== lookupVersion.current) return;
      const code = reason instanceof Error ? reason.message : "unavailable";
      const message = code === "not_configured" ? t("email.notConfigured") : code === "auth" ? t("email.authError") : t("email.error");
      if (translate) setTranslationError(t("email.translationError"));
      else setError(message);
    } finally {
      if (version === lookupVersion.current) {
        if (translate) setTranslating(false);
        else setLoading(false);
      }
    }
  }, [customerEmail, customerName, issueKey, orderNumber, t]);


  useEffect(() => {
    lookupVersion.current += 1;
    setLoading(false);
    setTranslating(false);
    setResult(null);
    setError(null);
    setTranslationError(null);
    setShowTranslated(false);
    setSummaryResult(null);
    setSummaryError(null);
    summaryRequest.current = null;
  }, [lookupKey]);

  useEffect(() => {
    if (open && !result && !loading && !error) void load();
  }, [error, load, loading, open, result]);


  function showReply(withAi: boolean) {
    setComposerMounted(true);
    setPane("reply");
    setMobileView("side");
    if (withAi) setReplyRequest((value) => value + 1);
  }

  function showSummary() {
    setPane("summary");
    setMobileView("side");
  }

  /** Napisano pismo ni nikjer shranjeno — zapiranje najprej vpraša. */
  function requestClose() {
    if (composerDirty) {
      setConfirmClose(true);
      return;
    }
    closeNow();
  }

  function closeNow() {
    setOpen(false);
    setConfirmClose(false);
    setComposerDirty(false);
    setComposerMounted(false);
    setPane("reply");
    setMobileView("thread");
  }

  const onComposerDirty = useCallback((dirty: boolean) => setComposerDirty(dirty), []);
  const onSent = useCallback(() => {
    // Poslano pismo se pokaže v niti, stran pa dobi nov vpis v zgodovini.
    void load(false);
    router.refresh();
  }, [load, router]);

  const hasMessages = Boolean(result && result.messages.length > 0);
  // Brez pošte (prvo pismo stranki) ali kadar nabiralnika ni mogoče prebrati,
  // povzetka ni — okno se odpre naravnost na odgovor.
  useEffect(() => {
    if (!open || !compose || loading || composerMounted) return;
    if (error || (result && result.messages.length === 0)) {
      setComposerMounted(true);
      setPane("reply");
    }
  }, [open, compose, loading, error, result, composerMounted]);

  const showSide = Boolean(compose) ? Boolean(result || error) && !loading : hasMessages && !loading && !error;

  return (
    <>
      <button
        type="button"
        className="btn btn-sm"
        disabled={disabled}
        title={disabled ? t("email.previewNeedsLookup") : undefined}
        onClick={() => setOpen(true)}
      >
        <Mail size={14} />
        {label ?? t("email.seeConversation")}
      </button>

      {open && (
        <Sheet
          title={t("email.title")}
          subtitle={t("email.subtitle", { email: customerEmail })}
          onClose={requestClose}
          width={1180}
        >
          <div className="border-t" style={{ borderColor: "var(--rule)" }}>
            {compose && (
              <nav className="email-mobile-tabs segmented" aria-label={t("email.title")}>
                <button type="button" data-active={mobileView === "thread" ? "true" : undefined} onClick={() => setMobileView("thread")}>
                  {t("email.tab.thread")}
                </button>
                <button type="button" data-active={mobileView === "side" && pane === "reply" ? "true" : undefined} onClick={() => showReply(false)}>
                  {t("email.tab.reply")}
                </button>
              </nav>
            )}
            <div
              className="email-conversation-layout"
              data-pane={compose && pane === "reply" ? "reply" : undefined}
              data-mobile={compose ? mobileView : undefined}
            >
              <div className="email-conversation-thread scroll-thin flex flex-col">
                {loading && <EmailLoading label={t("email.loading")} />}

                {!loading && error && (
                  <div className="m-5">
                    <Notice kind="error">{error}</Notice>
                    <button type="button" className="btn btn-sm mt-3" onClick={() => void load()}>
                      <RefreshCw size={13} /> {t("email.retry")}
                    </button>
                  </div>
                )}

                {!loading && !error && result?.messages.length === 0 && (
                  <div className="m-auto max-w-[420px] px-6 py-16 text-center">
                    <Mail size={24} className="mx-auto text-label-3" strokeWidth={1.5} />
                    <h3 className="mt-3 text-[15px] font-semibold">{t("email.empty")}</h3>
                    <p className="mt-1 text-[12.5px] text-label-2">{t("email.emptyHint")}</p>
                  </div>
                )}

                {!loading && !error && result && result.messages.length > 0 && (
                  <div className="relative px-5 py-4 sm:px-6">
                    <div className="email-rail" aria-hidden="true" />
                    <ol className="grid grid-cols-[minmax(0,1fr)] gap-4">
                      {result.messages.map((message) => (
                        <EmailMessage
                          key={message.id}
                          lookup={{ issueKey, customerEmail, orderNumber, customerName }}
                          message={message}
                          locale={locale}
                          translated={showTranslated}
                        />
                      ))}
                    </ol>
                    {result.truncated && <p className="mt-4 text-[11.5px] text-label-3">{t("email.truncated")}</p>}
                  </div>
                )}
              </div>

              {showSide && (
                <div className="email-summary-panel email-side scroll-thin">
                  {compose && (
                    <div className="email-side-tabs sticky top-0 z-[2] flex border-b bg-surface-2" style={{ borderColor: "var(--rule-strong)" }} role="tablist">
                      <button type="button" role="tab" aria-selected={pane === "reply"} data-active={pane === "reply" ? "true" : undefined} onClick={() => showReply(false)}>
                        <Reply size={13} /> {t("email.tab.reply")}
                      </button>
                    </div>
                  )}
                  {compose && composerMounted && (
                    <div hidden={pane !== "reply"}>
                      <MailComposer
                        config={compose}
                        customerEmail={customerEmail}
                        replyRequest={replyRequest}
                        onDirtyChange={onComposerDirty}
                        onSent={onSent}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {confirmClose && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2.5" style={{ borderColor: "var(--warning)", background: "var(--surface-2)" }} role="alert">
                <span className="text-[12.5px]">{t("email.discardQuestion")}</span>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-sm" onClick={() => setConfirmClose(false)}>{t("email.keepWriting")}</button>
                  <button type="button" className="btn btn-sm btn-destructive" onClick={closeNow}>{t("email.discardAndClose")}</button>
                </div>
              </div>
            )}

            {result && !loading && (
              <div className="border-t bg-surface-2 px-5 py-2.5" style={{ borderColor: "var(--rule)" }}>
                {translationError && <Notice kind="error">{translationError}</Notice>}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-label-2">
                  <span>{t(`email.count.${pluralSuffix(locale, result.messages.length)}` as TranslationKey, { count: result.messages.length })}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn-sm" onClick={() => void load(false)}>
                      <RefreshCw size={13} /> {t("email.refresh")}
                    </button>
                    {compose && result.messages.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => showReply(false)}
                      >
                        <Reply size={13} /> {t("email.reply")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

function EmailLoading({ label }: { label: string }) {
  return (
    <div className="m-auto flex items-center gap-2 px-6 py-16 text-[12.5px] text-label-2" role="status">
      <RefreshCw size={14} className="animate-spin" /> {label}
    </div>
  );
}

function EmailMessage({ lookup, message, locale, translated }: { lookup: EmailLookup; message: Message; locale: "sl" | "en"; translated: boolean }) {
  const t = useT();
  const [activeAttachment, setActiveAttachment] = useState<string | null>(null);
  const attachmentButtons = useRef(new Map<string, HTMLButtonElement>());
  const previewId = useId();
  const outgoing = message.direction === "outgoing";
  const DirectionIcon = outgoing ? ArrowUpRight : ArrowDownLeft;
  const subject = translated ? message.translatedSubject || message.subject : message.subject;
  const body = translated ? message.translatedBody || message.body : message.body;
  const closeAttachment = () => {
    const attachmentId = activeAttachment;
    setActiveAttachment(null);
    if (attachmentId) requestAnimationFrame(() => attachmentButtons.current.get(attachmentId)?.focus());
  };
  return (
    <li className="relative pl-9">
      <span className="email-marker" data-direction={message.direction} aria-hidden="true">
        <DirectionIcon size={13} />
      </span>
      <article className="border bg-surface" style={{ borderColor: "var(--rule-strong)" }}>
        <header className="border-b px-4 py-3" style={{ borderColor: "var(--rule)" }}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{subject || t("email.noSubject")}</span>
              {message.source === "shopify" && <span className="pill">Shopify</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-label-2">
              <span className="break-words">
                {outgoing ? t("email.to") : t("email.from")}: {outgoing ? message.to : message.from}
              </span>
              <time className="mono inline-flex shrink-0 items-center gap-1.5 text-label" dateTime={message.sentAt}>
                <Clock3 size={12} aria-hidden="true" />
                {t(outgoing ? "email.sentAt" : "email.receivedAt", { date: formatDateTime(new Date(message.sentAt), locale) })}
              </time>
            </div>
          </div>
        </header>
        <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] px-4 py-3 text-[12.5px] leading-[1.6] text-label-2">
          {body || t("email.noBody")}
        </div>
        {message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t px-4 py-2.5" style={{ borderColor: "var(--rule)" }}>
            {message.attachments.map((attachment) => {
              const href = attachmentUrl(lookup, message.id, attachment.id);
              if (attachment.preview === "none") {
                return (
                  <a
                    key={attachment.id}
                    className="email-attachment-button"
                    href={downloadUrl(href)}
                    aria-label={`${t("email.attachment.download")}: ${attachment.filename}`}
                    title={`${t("email.attachment.download")}: ${attachment.filename}`}
                  >
                    <Download size={12} />
                    <span className="truncate">{attachment.filename}</span>
                    {attachment.size > 0 && <span className="mono shrink-0 text-label-3">{formatBytes(attachment.size, locale)}</span>}
                  </a>
                );
              }
              return (
                <button
                  key={attachment.id}
                  type="button"
                  className="email-attachment-button"
                  ref={(node) => {
                    if (node) attachmentButtons.current.set(attachment.id, node);
                    else attachmentButtons.current.delete(attachment.id);
                  }}
                  aria-label={`${t("email.attachment.preview")}: ${attachment.filename}`}
                  aria-controls={previewId}
                  aria-expanded={activeAttachment === attachment.id}
                  onClick={() => setActiveAttachment((current) => current === attachment.id ? null : attachment.id)}
                  title={`${t("email.attachment.preview")}: ${attachment.filename}`}
                >
                  {activeAttachment === attachment.id ? <X size={12} /> : <Eye size={12} />}
                  <span className="truncate">{attachment.filename}</span>
                  {attachment.size > 0 && <span className="mono shrink-0 text-label-3">{formatBytes(attachment.size, locale)}</span>}
                </button>
              );
            })}
          </div>
        )}
        {activeAttachment && (() => {
          const attachment = message.attachments.find((item) => item.id === activeAttachment);
          return attachment ? (
            <AttachmentPreview
              lookup={lookup}
              messageId={message.id}
              attachment={attachment}
              locale={locale}
              id={previewId}
              onClose={closeAttachment}
            />
          ) : null;
        })()}
      </article>
    </li>
  );
}

function conversationUrl(lookup: EmailLookup, translate: boolean): string {
  if (lookup.issueKey) {
    return `/api/orders/${encodeURIComponent(lookup.issueKey)}/emails${translate ? "?translate=1" : ""}`;
  }
  const params = new URLSearchParams({
    customerEmail: lookup.customerEmail,
    orderNumber: lookup.orderNumber ?? "",
  });
  if (translate) params.set("translate", "1");
  return `/api/emails/preview?${params.toString()}`;
}

function attachmentUrl(lookup: EmailLookup, messageId: string, attachmentId: string): string {
  if (lookup.issueKey) {
    return `/api/orders/${encodeURIComponent(lookup.issueKey)}/emails/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`;
  }
  const params = new URLSearchParams({
    customerEmail: lookup.customerEmail,
    orderNumber: lookup.orderNumber ?? "",
  });
  return `/api/emails/preview/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}?${params.toString()}`;
}

function downloadUrl(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}

function formatBytes(size: number, locale: "sl" | "en"): string {
  if (size < 1_024) return `${size} B`;
  const units = ["KB", "MB", "GB"];
  let value = size / 1_024;
  let unit = units[0];
  for (let index = 1; value >= 1_024 && index < units.length; index += 1) {
    value /= 1_024;
    unit = units[index];
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: value >= 10 ? 0 : 1 }).format(value)} ${unit}`;
}

function AttachmentPreview({
  lookup,
  messageId,
  attachment,
  locale,
  id,
  onClose,
}: {
  lookup: EmailLookup;
  messageId: string;
  attachment: Attachment;
  locale: "sl" | "en";
  id: string;
  onClose: () => void;
}) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const url = attachmentUrl(lookup, messageId, attachment.id);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setLoading(true);
    setError(false);
    setBlobUrl(null);
    setTextContent(null);

    void fetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("attachment_unavailable");
        if (attachment.preview === "text") {
          setTextContent(await response.text());
        } else {
          objectUrl = URL.createObjectURL(await response.blob());
          setBlobUrl(objectUrl);
        }
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, attachment.preview, url]);

  return (
    <section id={id} className="email-attachment-preview" aria-label={`${t("email.attachment.preview")}: ${attachment.filename}`}>
      <header className="flex items-center justify-between gap-3 border-b px-3 py-2" style={{ borderColor: "var(--rule)" }}>
        <div className="flex min-w-0 items-center gap-2 text-[11.5px]">
          <Paperclip size={12} className="shrink-0 text-label-3" />
          <span className="truncate font-medium" title={attachment.filename}>{attachment.filename}</span>
          {attachment.size > 0 && <span className="mono shrink-0 text-label-3">{formatBytes(attachment.size, locale)}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a className="btn btn-sm px-1.5" href={downloadUrl(url)} aria-label={t("email.attachment.download")} title={t("email.attachment.download")}>
            <Download size={13} />
          </a>
          <button type="button" className="btn btn-sm px-1.5" onClick={onClose} aria-label={t("email.attachment.close")} title={t("email.attachment.close")}>
            <X size={13} />
          </button>
        </div>
      </header>
      <div className="email-attachment-canvas">
        {loading && <p className="flex items-center gap-2 text-[12px] text-label-2"><RefreshCw size={13} className="animate-spin" /> {t("email.attachment.loading")}</p>}
        {!loading && error && <Notice kind="error">{t("email.attachment.error")}</Notice>}
        {!loading && !error && attachment.preview === "image" && blobUrl && <img src={blobUrl} alt={attachment.filename} />}
        {!loading && !error && attachment.preview === "pdf" && blobUrl && <iframe src={blobUrl} title={attachment.filename} sandbox="" referrerPolicy="no-referrer" />}
        {!loading && !error && attachment.preview === "text" && textContent !== null && <pre>{textContent}</pre>}
      </div>
    </section>
  );
}
