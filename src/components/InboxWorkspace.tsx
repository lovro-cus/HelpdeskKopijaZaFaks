"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Bot, Check, Inbox, Languages, Link2, Loader2, Mail, MailWarning, MapPin, RefreshCw, Repeat2, Send } from "lucide-react";

import { linkInboxConversation, markInboxSeen, refreshInbox, sendInboxReply, updateInboxConversation } from "@/lib/actions/inbox";
import { AutoTextarea } from "./AutoTextarea";

type Person = { id: string; name: string; color: string };
type Conversation = {
  id: string; subject: string; customerName: string | null; customerEmail: string; lastMessageAt: string;
  lastSnippet: string | null; lastDirection: string; status: string; unread: boolean; assignee: Person | null;
  issue: { key: string; orderNumber: string; priority: string } | null; unlinkedReason: string | null;
  /** Mail je znova odprl zaprt ticket, odziva še ni bilo. */
  reopenCue?: boolean;
};
type Message = { id: string; sentAt: string; from: string; to: string; subject: string; body: string; translatedSubject?: string | null; translatedBody?: string | null; direction: string; source: string; attachments: Array<{ id: string; filename: string; size: number }> };
type Selected = {
  id: string; subject: string; status: string; assignee: Person | null; customerEmail: string; customerName: string | null; unlinkedReason: string | null;
  issue: null | { id: number; key: string; orderNumber: string; customerName: string | null; customerEmail: string | null; customerPhone: string | null; customerAddress: string | null; type: string; status: string; priority: string; amount: number | null; currency: string; items: Array<{ id: number; name: string; variant: string | null; qty: number; resolution: string }>; parcels: Array<{ id: number; number: string; direction: string; state: string }> };
};
type QuickReplies = { returnInstructions: string; returnInstructionsWithChoice: string };

const labels = {
  sl: { title: "Prejeto", open: "Odprto", mine: "Moje", unassigned: "Nedodeljeno", waiting: "Čakamo", done: "Zaključeno", all: "Vse", refresh: "Osveži pošto", empty: "Ni pogovorov v tem pogledu.", take: "Prevzemi", release: "Odstrani dodelitev", ai: "Pripravi odgovor z AI", aiHint: "Neobvezno navodilo za osnutek", send: "Pošlji kot Ana", quickReplies: "Hitri odgovori", returnInstructions: "Navodila za vračilo", returnWithChoice: "Vračilo + refund/menjava", order: "Naročilo", ticket: "Odpri ticket", customer: "Stranka", items: "Izdelki", parcels: "Pošiljke", noMail: "Izberi pogovor na levi.", loading: "Nalagam celoten pogovor …", summary: "AI povzetek", summarize: "Povzemi", changed: "Stranka je med pisanjem poslala nov mail. Pogovor smo osvežili; odgovor preglej še enkrat.", sent: "Odgovor je bil poslan iz podpora@kroj.example.", syncing: "Osveževanje teče v ozadju. Seznam se bo čez nekaj sekund sam posodobil.", error: "Pošiljanje ni uspelo. Osnutek je ostal v urejevalniku.", reply: "Odgovor", translate: "Prevedi", translating: "Prevajam …", showOriginal: "Izvirnik", showTranslation: "Prevod", translationError: "Pogovora trenutno ni mogoče prevesti. Izvirnik ostaja viden.", translationNeedsSetup: "Prevajanje ni nastavljeno.", loadAll: "Naloži vse maile", reopenCue: "Stranka je pisala po zaključku — ticket je znova odprt", loadingAll: "Nalagam vse …", loadedAll: "Naložen je celoten povezani pogovor", loadAllError: "Vseh povezanih mailov ni bilo mogoče naložiti. Trenutni pogovor ostaja viden.", unlinked: "Brez ticketa", unlinkedTitle: "Brez ticketa", unlinkedHint: "Desk za ta mail ni odprl ticketa. Poveži ga z naročilom — če naročilo ticketa še nima, se odpre in dodeli tebi.", orderNumber: "Številka naročila", link: "Poveži z naročilom", replyNeedsLink: "Da lahko odgovoriš, pogovor najprej poveži z naročilom.", linked: "Pogovor je povezan z naročilom.", reasons: { no_order: "V mailu ni številke naročila", many_orders: "Mail omenja več naročil", many_tickets: "Stranka ima več ticketov", order_not_found: "Naročila v Shopifyju ni", email_mismatch: "E-naslov se ne ujema z naročilom" }, linkErrors: { link_invalid: "Vpiši veljavno številko naročila.", link_order_not_found: "Naročila s to številko v Shopifyju ni." } },
  en: { title: "Inbox", open: "Open", mine: "Mine", unassigned: "Unassigned", waiting: "Waiting", done: "Done", all: "All", refresh: "Sync mail", empty: "No conversations in this view.", take: "Assign to me", release: "Unassign", ai: "Draft reply with AI", aiHint: "Optional instruction for the draft", send: "Send as Ana", quickReplies: "Quick replies", returnInstructions: "Return instructions", returnWithChoice: "Return + refund/exchange", order: "Order", ticket: "Open ticket", customer: "Customer", items: "Items", parcels: "Parcels", noMail: "Select a conversation on the left.", loading: "Loading the complete thread …", summary: "AI summary", summarize: "Summarize", changed: "The customer sent a new email while you were writing. Review the refreshed thread before sending.", sent: "Reply sent from podpora@kroj.example.", syncing: "Mail is syncing in the background. The list will refresh automatically in a few seconds.", error: "Sending failed. Your draft remains in the editor.", reply: "Reply", translate: "Translate", translating: "Translating …", showOriginal: "Original", showTranslation: "Translation", translationError: "The conversation could not be translated. The original remains visible.", translationNeedsSetup: "Translation is not configured.", loadAll: "Load all emails", reopenCue: "The customer wrote after closing — the ticket was reopened", loadingAll: "Loading all …", loadedAll: "The complete linked conversation is loaded", loadAllError: "All linked emails could not be loaded. The current conversation remains visible.", unlinked: "No ticket", unlinkedTitle: "No ticket", unlinkedHint: "Desk did not open a ticket for this email. Link it to an order — if the order has no ticket yet, one opens and is assigned to you.", orderNumber: "Order number", link: "Link to order", replyNeedsLink: "Link the conversation to an order before replying.", linked: "The conversation is linked to the order.", reasons: { no_order: "No order number in the email", many_orders: "The email mentions several orders", many_tickets: "The customer has several tickets", order_not_found: "The order is not in Shopify", email_mismatch: "The email address does not match the order" }, linkErrors: { link_invalid: "Enter a valid order number.", link_order_not_found: "No order with this number in Shopify." } },
} as const;

export function InboxWorkspace({ me, view, result, unlinkedCount, conversations, selected, users, initialBody, draftId }: { me: { id: string; locale: "sl" | "en" }; view: string; result: string | null; unlinkedCount: number; conversations: Conversation[]; selected: Selected | null; users: Person[]; initialBody: string; draftId: number | null }) {
  const t = labels[me.locale];
  const reasonLabel = (reason: string | null) => t.reasons[(reason ?? "no_order") as keyof typeof t.reasons] ?? t.reasons.no_order;
  const linkError = result && result in t.linkErrors ? t.linkErrors[result as keyof typeof t.linkErrors] : result?.startsWith("link_") ? reasonLabel(result.slice(5)) : null;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(Boolean(selected));
  const [body, setBody] = useState(initialBody);
  const [quickReplies, setQuickReplies] = useState<QuickReplies | null>(null);
  const [instruction, setInstruction] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [translationAvailable, setTranslationAvailable] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [loadAllError, setLoadAllError] = useState<string | null>(null);
  const activeConversationId = useRef<string | null>(selected?.id ?? null);

  useEffect(() => {
    const controller = new AbortController();
    activeConversationId.current = selected?.id ?? null;
    setBody(initialBody); setQuickReplies(null); setMessages([]); setSummary(null); setInstruction(""); setAiError(null);
    setTranslationAvailable(false); setTranslated(false); setShowTranslated(false); setTranslating(false); setTranslationError(null);
    setLoadingAll(false); setAllLoaded(false); setLoadAllError(null);
    if (!selected) { setLoading(false); return; }
    setLoading(true);
    markInboxSeen(selected.id).catch(() => {});
    fetch(`/api/inbox/${encodeURIComponent(selected.id)}`, { cache: "no-store", signal: controller.signal })
      .then((r) => r.ok ? r.json() : Promise.reject()).then((data) => {
        setMessages(data.messages || []);
        setQuickReplies(data.quickReplies || null);
        // Povezan pogovor pride že v celoti; gumb "Naloži vse" ostane samo za
        // primer, ko je strežnik moral pasti nazaj na eno nit.
        setAllLoaded(data.scope === "all");
        if (!draftId && data.initialBody) {
          setBody((current) => current === initialBody ? data.initialBody : current);
        }
        setTranslationAvailable(Boolean(data.translationAvailable));
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setMessages([]);
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selected?.id, initialBody]);

  useEffect(() => {
    if (result !== "syncing") return;
    const timer = window.setTimeout(() => window.location.replace("/inbox"), 8_000);
    return () => window.clearTimeout(timer);
  }, [result]);

  async function loadAllMessages() {
    if (!selected || loadingAll) return;
    const conversationId = selected.id;
    const params = new URLSearchParams({ all: "1" });
    if (translated) params.set("translate", "1");
    setLoadingAll(true);
    setLoadAllError(null);
    try {
      const response = await fetch(`/api/inbox/${encodeURIComponent(conversationId)}?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "unavailable");
      if (activeConversationId.current !== conversationId) return;
      setMessages(data.messages || []);
      setQuickReplies(data.quickReplies || null);
      setTranslated(Boolean(data.translated));
      setAllLoaded(true);
      setShowTranslated(Boolean(data.translated));
    } catch {
      if (activeConversationId.current === conversationId) setLoadAllError(t.loadAllError);
    } finally {
      if (activeConversationId.current === conversationId) setLoadingAll(false);
    }
  }

  const filters = ["open", "mine", "unassigned", "waiting", "unlinked", "done", "all"] as const;
  const translatedSubject = messages.findLast((message) => message.translatedSubject)?.translatedSubject;
  return (
    <div className="inbox-shell mx-auto grid min-h-[calc(100vh_/_var(--ui-zoom)_-_50px)] max-w-[1600px] lg:h-[calc(100dvh_/_var(--ui-zoom)_-_50px)] lg:min-h-0 lg:overflow-hidden lg:grid-cols-[320px_minmax(420px,1fr)_330px]">
      <aside className={`inbox-list border-r border-separator lg:h-full lg:min-h-0 lg:overflow-y-auto ${selected ? "hidden lg:block" : "block"}`}>
        <div className="inbox-register-head sticky top-[50px] z-10 bg-surface lg:top-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <h1 className="flex min-w-0 items-center gap-2 text-[17px] font-semibold tracking-[-0.015em]">
              <Inbox size={17} strokeWidth={1.75} aria-hidden />
              <span>{t.title}</span>
              <span className="mono border-l pl-2 text-[10.5px] font-normal text-label-3" style={{ borderColor: "var(--rule-strong)" }} aria-hidden="true">
                {conversations.length}
              </span>
            </h1>
            <form action={refreshInbox}>
              <button className="btn btn-plain h-7 w-7 px-0" aria-label={t.refresh} title={t.refresh}>
                <RefreshCw size={14} />
              </button>
            </form>
          </div>
          <nav className="inbox-filter-grid" aria-label={t.title}>
            {filters.map((filter) => (
              <Link
                key={filter}
                href={`/inbox?view=${filter}`}
                data-active={view === filter || undefined}
                aria-current={view === filter ? "page" : undefined}
              >
                {t[filter]}
                {filter === "unlinked" && unlinkedCount > 0 && <span className="mono ml-1 text-[10px]" style={{ color: "var(--warning)" }}>{unlinkedCount}</span>}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-separator">{conversations.length === 0 ? <p className="p-6 text-[13px] text-label-3">{t.empty}</p> : conversations.map((c) => (
          <Link key={c.id} href={`/inbox?view=${view}&thread=${c.id}`} className={`block border-b border-separator px-4 py-3 hover:bg-fill ${selected?.id === c.id ? "bg-fill" : ""}`}>
            <div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 ${c.unread ? "bg-accent" : "bg-transparent"}`} /><p className={`min-w-0 flex-1 truncate text-[13px] ${c.unread ? "font-semibold" : "font-medium"}`}>{c.customerName || c.customerEmail}</p><time className="mono text-[10px] text-label-3">{new Intl.DateTimeFormat(me.locale, { day: "2-digit", month: "2-digit" }).format(new Date(c.lastMessageAt))}</time></div>
            <p className="mt-1 truncate text-[12px] font-medium">{c.subject}</p><p className="mt-0.5 line-clamp-2 text-[11.5px] text-label-2">{c.lastDirection === "outgoing" ? "↗ " : ""}{c.lastSnippet}</p>
            <div className="mt-2 flex items-center gap-2">{c.issue ? <span className="mono inline-flex items-center gap-1 text-[10px] text-label-3">#{c.issue.orderNumber}{c.reopenCue && <MailWarning size={12} strokeWidth={2.25} style={{ color: "var(--stamp)" }} aria-label={t.reopenCue} role="img"><title>{t.reopenCue}</title></MailWarning>}</span> : <span className="text-[10.5px]" style={{ color: "var(--warning)" }}>{reasonLabel(c.unlinkedReason)}</span>}{c.assignee && <span className="ml-auto flex items-center gap-1 text-[10px] text-label-3"><span className="h-2 w-2" style={{ background: c.assignee.color }} />{c.assignee.name}</span>}</div>
          </Link>
        ))}</div>
      </aside>

      <section className={`${selected ? "flex" : "hidden lg:flex"} min-h-[calc(100vh_/_var(--ui-zoom)_-_50px)] min-w-0 flex-col bg-bg lg:h-full lg:min-h-0`}>
        {!selected ? <div className="m-auto text-center text-label-3"><Mail className="mx-auto mb-3" size={24} /><p>{t.noMail}</p></div> : <>
          <header className="sticky top-[50px] z-10 shrink-0 border-b border-separator bg-surface px-4 py-3 sm:px-5 lg:static"><div className="flex flex-wrap items-center gap-2 sm:gap-3"><Link href={`/inbox?view=${view}`} className="btn btn-sm px-2 lg:hidden"><ArrowLeft size={15} /></Link><div className="min-w-0 flex-[1_1_180px]"><h2 className="truncate text-[15px] font-semibold">{showTranslated ? translatedSubject || selected.subject : selected.subject}</h2><p className="truncate text-[11.5px] text-label-2">{selected.customerName || selected.customerEmail}{selected.issue ? ` · #${selected.issue.orderNumber}` : ` · ${t.unlinkedTitle}`}</p></div>
            {!allLoaded && <button type="button" className="btn btn-sm shrink-0 px-2" onClick={loadAllMessages} disabled={loading || loadingAll || translating} aria-label={loadingAll ? t.loadingAll : t.loadAll} title={loadingAll ? t.loadingAll : t.loadAll}>{loadingAll ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}<span className="hidden xl:inline">{loadingAll ? t.loadingAll : t.loadAll}</span></button>}
            <form action={updateInboxConversation}><input type="hidden" name="conversationId" value={selected.id} /><select key={selected.id} name="assigneeId" aria-label={t.take} defaultValue={selected.assignee?.id || "none"} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="field h-7 max-w-[135px] text-[11.5px]"><option value="none">{t.unassigned}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></form>
            <form action={updateInboxConversation}><input type="hidden" name="conversationId" value={selected.id} /><input type="hidden" name="status" value={selected.status === "done" ? "open" : "done"} /><button className="btn btn-sm px-2" title={t.done}><Check size={15} /></button></form>
          </div></header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5 lg:min-h-0">{translationError && <p role="alert" className="border border-separator bg-surface px-3 py-2 text-[12px] text-label-2">{translationError}</p>}{loadAllError && <p role="alert" className="border border-separator bg-surface px-3 py-2 text-[12px] text-label-2">{loadAllError}</p>}{allLoaded && !loadAllError && <p role="status" className="text-center text-[11px] text-label-3">{t.loadedAll}</p>}{loading ? <p className="flex items-center gap-2 text-[12px] text-label-3"><Loader2 className="animate-spin" size={14} />{t.loading}</p> : messages.map((m) => <article key={m.id} className={`max-w-[82%] border border-separator bg-surface p-3 ${m.direction === "outgoing" ? "ml-auto border-l-[3px] border-l-accent" : "border-l-[3px] border-l-orange"}`}><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="truncate text-[11.5px] font-semibold">{m.from}</p><p className="mt-0.5 text-[10.5px] text-label-3">{new Intl.DateTimeFormat(me.locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(m.sentAt))}</p></div>{m.source === "shopify" && <span className="caption bg-fill px-1.5 py-0.5">Shopify</span>}</div><div className="mt-3 whitespace-pre-wrap break-words text-[12.5px] leading-5">{(showTranslated ? m.translatedBody || m.body : m.body) || "—"}</div>{m.attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{m.attachments.map((a) => selected.issue
              ? <a key={a.id} className="link caption bg-fill px-2 py-1" href={`/api/orders/${encodeURIComponent(selected.issue.key)}/emails/${encodeURIComponent(m.id)}/attachments/${encodeURIComponent(a.id)}`}>{a.filename}</a>
              : <span key={a.id} className="caption bg-fill px-2 py-1">{a.filename}</span>)}</div>}</article>)}</div>
          {!selected.issue ? <div className="shrink-0 border-t border-separator bg-surface px-4 py-3 text-[12.5px] text-label-2 sm:px-5">{t.replyNeedsLink}</div> : <div className="shrink-0 border-t border-separator bg-surface p-4 sm:p-5">{result && !linkError && <p role="status" className={`mb-3 px-3 py-2 text-[12px] ${result === "sent" || result === "linked" ? "bg-green-50 text-green-800" : result === "syncing" ? "bg-fill text-label-2" : "bg-red-50 text-red-800"}`}>{result === "sent" ? t.sent : result === "linked" ? t.linked : result === "syncing" ? t.syncing : result === "changed" ? t.changed : draftId ? (me.locale === "sl" ? "Pošiljanje ni uspelo. Tvoj osnutek je ohranjen spodaj; preveri povezavo in poskusi znova." : "Sending failed. Your draft is preserved below; check the connection and try again.") : t.error}</p>}{aiError && <p role="alert" className="mb-3 bg-fill px-3 py-2 text-[12px] text-label-2">{aiError}</p>}{quickReplies && <div className="mb-2 flex flex-wrap items-center gap-1.5"><span className="caption mr-1 text-label-3">{t.quickReplies}</span><button type="button" className="btn btn-sm" onClick={() => setBody(quickReplies.returnInstructions)}><MapPin size={14} />{t.returnInstructions}</button><button type="button" className="btn btn-sm" onClick={() => setBody(quickReplies.returnInstructionsWithChoice)}><Repeat2 size={14} />{t.returnWithChoice}</button></div>}<form action={sendInboxReply}><input type="hidden" name="conversationId" value={selected.id} />{draftId && <input type="hidden" name="draftId" value={draftId} />}<textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={7} maxLength={4000} required className="field w-full resize-y font-mono text-[12px] leading-5" aria-label={t.reply} /><div className="mt-2 flex justify-end"><InboxSendButton label={t.send} /></div></form></div>}
        </>}
      </section>

      <aside className={`${selected ? "block" : "hidden"} border-l border-separator bg-surface p-4 sm:p-5 lg:block lg:h-full lg:min-h-0 lg:overflow-y-auto`}>
        {selected && !selected.issue && <div className="space-y-4">
          <div>
            <p className="caption" style={{ color: "var(--warning)" }}>{t.unlinkedTitle}</p>
            <p className="mt-1.5 text-[13px] font-medium">{reasonLabel(selected.unlinkedReason)}</p>
            <p className="mt-2 text-[12px] leading-5 text-label-2">{t.unlinkedHint}</p>
          </div>
          <div className="hairline" />
          <div><p className="caption mb-2">{t.customer}</p><p className="text-[13px] font-medium">{selected.customerName || "—"}</p><p className="mt-1 break-all text-[11.5px] text-label-2">{selected.customerEmail}</p></div>
          <div className="hairline" />
          <form action={linkInboxConversation} className="space-y-2">
            <input type="hidden" name="conversationId" value={selected.id} />
            <label className="field-label" htmlFor="inbox-link-order">{t.orderNumber}</label>
            <input id="inbox-link-order" name="orderNumber" required maxLength={41} inputMode="numeric" autoComplete="off" placeholder="#3301" className="field mono" />
            {linkError && <p role="alert" className="text-[12px]" style={{ color: "var(--stamp)" }}>{linkError}</p>}
            <InboxSendButton label={t.link} icon="link" />
          </form>
        </div>}
        {selected?.issue && <div className="space-y-5"><div><div className="flex items-center justify-between"><p className="caption">{t.order}</p><Link className="link text-[11.5px]" href={`/orders/${selected.issue.key}`}>{t.ticket}</Link></div><p className="mono mt-1 text-[22px] font-semibold">#{selected.issue.orderNumber}</p><div className="mt-2 flex gap-1"><span className="caption bg-fill px-2 py-1">{selected.issue.type}</span><span className="caption bg-fill px-2 py-1">{selected.issue.status}</span><span className="caption bg-fill px-2 py-1">{selected.issue.priority}</span></div>{selected.issue.amount != null && <p className="mt-2 text-[14px] font-semibold">{new Intl.NumberFormat(me.locale, { style: "currency", currency: selected.issue.currency }).format(selected.issue.amount)}</p>}</div><div className="hairline" />
          <div><p className="caption mb-2">{t.customer}</p><p className="text-[13px] font-medium">{selected.issue.customerName || "—"}</p><p className="mt-1 break-all text-[11.5px] text-label-2">{selected.issue.customerEmail}</p>{selected.issue.customerPhone && <p className="mt-1 text-[11.5px] text-label-2">{selected.issue.customerPhone}</p>}{selected.issue.customerAddress && <p className="mt-2 text-[11.5px] leading-4 text-label-2">{selected.issue.customerAddress}</p>}</div>
          <div className="hairline" /><div><p className="caption mb-2">{t.items}</p>{selected.issue.items.map((i) => <div key={i.id} className="mb-2 text-[12px]"><p className="font-medium">{i.qty}× {i.name}</p><p className="text-label-3">{[i.variant, i.resolution].filter(Boolean).join(" · ")}</p></div>)}</div>
          {selected.issue.parcels.length > 0 && <><div className="hairline" /><div><p className="caption mb-2">{t.parcels}</p>{selected.issue.parcels.map((p) => <p key={p.id} className="mono mb-1 text-[11px]">{p.number} · {p.state}</p>)}</div></>}
        </div>}
      </aside>
    </div>
  );
}

function InboxSendButton({ label, icon = "send" }: { label: string; icon?: "send" | "link" }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-primary">{icon === "link" ? <Link2 size={14} /> : <Send size={14} />}{pending ? <Loader2 className="animate-spin" size={14} /> : label}</button>;
}
