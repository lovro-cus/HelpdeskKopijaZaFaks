"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, FilePlus2, Mail, MessageSquare, Package, PencilLine, ShieldAlert, Truck, UserRound } from "lucide-react";

import Link from "next/link";

import { formatDateTime } from "@/lib/format";
import { useSettings } from "@/lib/config/client";
import { getStatus } from "@/lib/domain";
import { editComment, recloseAfterReply } from "@/lib/actions/issues";
import { ImageGrid, type Att } from "./ImageGrid";
import { Avatar, OutsiderTag } from "./ui";
import { useLocale, useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const URL_RE = /(https?:\/\/[^\s]+)/g;

/** Besedilo komentarja z URL-ji, pretvorjenimi v klikabilne povezave. Prelomi
 *  in presledki se ohranijo (nadrejeni element ima whitespace-pre-wrap). Vežemo
 *  samo http(s), da se izognemo nevarnim shemam. */
function linkify(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  URL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_RE.exec(text)) !== null) {
    const start = match.index;
    let url = match[0];
    // Zaključna ločila so verjetno del stavka, ne URL-ja — jih odreži.
    const trailing = url.match(/[.,;:!?)\]]+$/)?.[0] ?? "";
    if (trailing) url = url.slice(0, -trailing.length);
    if (start > last) nodes.push(text.slice(last, start));
    nodes.push(
      <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="link break-all">{url}</a>,
    );
    if (trailing) nodes.push(trailing);
    last = start + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export type ThreadEvent = {
  id: number;
  kind: string;
  body: string | null;
  field: string | null;
  fromValue: string | null;
  toValue: string | null;
  outsider: boolean;
  createdAt: Date;
  author: { name: string; color: string; level: number; isAdmin: boolean } | null;
  attachments: Att[];
  /** Samo v celotni niti: kdo je avtor (za urejanje) in zgodovina popravkov. */
  authorId?: string | null;
  editedAt?: Date | null;
  revisions?: { id: number; body: string; writtenAt: Date }[];
};

/**
 * `recloseEventId`: dogodek ponovnega odprtja po mailu stranke, pri katerem
 * je še mogoče ticket z enim klikom zapreti nazaj (strežnik ga izbere).
 */
export function Thread({ events, issueId, recloseEventId, meId }: {
  events: ThreadEvent[];
  issueId?: number;
  recloseEventId?: number | null;
  /** Prijavljeni uporabnik: svoje komentarje lahko popravi. */
  meId?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const groups = groupByDay(events, locale, t("thread.today"), t("thread.yesterday"));

  return (
    <div>
      {groups.map(([day, items]) => (
        <section key={day}>
          <div className="sticky top-[48px] z-10 -mx-1 px-1 py-2">
            <span
              className="pill"
              style={{
                background: "var(--bg)",
                borderColor: "var(--border)",
                color: "var(--text-2)",
                height: 21,
              }}
            >
              {day}
            </span>
          </div>

          <div className="relative">
            <div className="timeline-rail" />
            {items.map((e) => (
              <Row key={e.id} event={e} meId={meId} reclose={issueId && e.id === recloseEventId ? issueId : undefined} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Zgoščen izrez niti za seznam naročil. Uporablja isti zapis dogodkov kot
 *  celotna nit, zato predogled in odprti ticket ne razlagata dogodka različno. */
export function ThreadPreview({ events }: { events: ThreadEvent[] }) {
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <Row key={event.id} event={event} compact />
      ))}
    </div>
  );
}

function Row({ event, compact = false, reclose, meId }: { event: ThreadEvent; compact?: boolean; reclose?: number; meId?: string }) {
  const locale = useLocale();
  const time = new Date(event.createdAt).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className={compact ? "group relative flex gap-2" : "group relative flex gap-3 pb-5"}>
      <Marker event={event} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <div className="min-w-0 flex-1 text-[13.5px] leading-relaxed">
            <Body event={event} meId={meId} />
          </div>
          {event.outsider && <OutsiderTag />}
          <time
            className="mono shrink-0 text-[11.5px] text-label-3"
            title={formatDateTime(event.createdAt, locale)}
          >
            {time}
          </time>
        </div>

        {event.kind !== "comment" && event.body && (
          <p className="mt-1 whitespace-pre-wrap text-[13px] text-label-2">{event.body}</p>
        )}

        {reclose && <RecloseButton issueId={reclose} />}

        <ImageGrid attachments={event.attachments} />
      </div>
    </article>
  );
}

/**
 * Komentar v niti. Avtor ga lahko popravi; popravljen komentar nosi oznako
 * "urejeno", ki odpre vse prejšnje različice — nit ostane verodostojen zapis.
 */
function CommentBody({ event, who, level, canEdit }: {
  event: ThreadEvent;
  who: string;
  level: string | null;
  canEdit: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(event.body ?? "");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const revisions = event.revisions ?? [];

  function begin() {
    setDraft(event.body ?? "");
    setError(null);
    setEditing(true);
  }

  function save() {
    const fd = new FormData();
    fd.set("eventId", String(event.id));
    fd.set("body", draft);
    start(async () => {
      const result = await editComment(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="font-semibold">{who}</span>
        {level && <span className="text-[12px] text-label-3">{level}</span>}
        {event.editedAt && (
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
            title={t("thread.comment.editedAt", { date: formatDateTime(event.editedAt, locale) })}
            className="text-[12px] text-label-3 underline decoration-dotted underline-offset-2 hover:text-label"
          >
            ({t("thread.comment.edited")})
          </button>
        )}
        {canEdit && !editing && (
          <button
            type="button"
            onClick={begin}
            // Viden samo ob prehodu miške (ali fokusu s tipkovnico), da ne moti branja.
            className="inline-flex items-center gap-1 text-[12px] text-label-3 opacity-0 transition-opacity hover:text-label focus-visible:opacity-100 group-hover:opacity-100"
          >
            <PencilLine size={11} aria-hidden />
            {t("thread.comment.edit")}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
              if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
            }}
            rows={Math.min(12, Math.max(3, draft.split("\n").length + 1))}
            maxLength={10000}
            autoFocus
            disabled={pending}
            className="field w-full"
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2">
            {error && <span className="mr-auto text-[12px]" style={{ color: "var(--stamp)" }} role="alert">{error}</span>}
            <button type="button" onClick={() => setEditing(false)} disabled={pending} className="btn btn-sm">
              {t("common.cancel")}
            </button>
            <button type="button" onClick={save} disabled={pending} className="btn btn-sm btn-primary">
              {pending ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </div>
      ) : (
        event.body && <p className="mt-0.5 whitespace-pre-wrap text-label">{linkify(event.body)}</p>
      )}

      {historyOpen && event.editedAt && (
        <div className="mt-2 border px-3 py-2" style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}>
          <p className="caption mb-1.5">{t("thread.comment.history")}</p>
          <ol className="space-y-2">
            {revisions.map((revision) => (
              <li key={revision.id} className="border-l-2 pl-2" style={{ borderColor: "var(--separator-strong)" }}>
                <p className="mono text-[11px] text-label-3">
                  {t("thread.comment.version", { date: formatDateTime(revision.writtenAt, locale) })}
                </p>
                <p className="whitespace-pre-wrap text-[12.5px] text-label-2">
                  {revision.body || <span className="text-label-3">{t("thread.comment.empty")}</span>}
                </p>
              </li>
            ))}
            <li className="border-l-2 pl-2" style={{ borderColor: "var(--accent)" }}>
              <p className="mono text-[11px] text-label-3">
                {t("thread.comment.current", { date: formatDateTime(event.editedAt, locale) })}
              </p>
              <p className="whitespace-pre-wrap text-[12.5px]">
                {event.body || <span className="text-label-3">{t("thread.comment.empty")}</span>}
              </p>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

/** Ena vrstica povzetka; gumb "Podrobnosti" se pokaže ob prehodu miške in
 *  odpre celoten zapis. Odprt ostane, dokler ga ne zapreš. */
function Collapsed({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <span className="text-label-2">
      {summary}{" "}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`inline-flex items-center gap-0.5 align-baseline text-[12px] text-label-3 transition-opacity hover:text-label focus-visible:opacity-100 group-hover:opacity-100 ${open ? "" : "opacity-0"}`}
      >
        {t(open ? "thread.hideDetails" : "thread.details")}
        <ChevronDown size={11} aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <span className="mono mt-1.5 block space-y-0.5 border-l-2 pl-2.5 text-[11.5px] leading-relaxed text-label-2" style={{ borderColor: "var(--separator-strong)" }}>
          {children}
        </span>
      )}
    </span>
  );
}

function DetailLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="block">
      <span className="text-label-3">{label}:</span> {children}
    </span>
  );
}

/** Mail po zaključku ne zahteva ničesar: ticket gre nazaj med zaključene. */
function RecloseButton({ issueId }: { issueId: number }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-sm"
        disabled={pending}
        onClick={() => start(async () => {
          const result = await recloseAfterReply(issueId);
          if (result.error) setError(result.error);
          else router.refresh();
        })}
      >
        <Check size={13} />{t("thread.reclose")}
      </button>
      <span className="text-[11.5px] text-label-3">{t("thread.recloseHint")}</span>
      {error && <span className="basis-full text-[12px]" style={{ color: "var(--stamp)" }} role="alert">{error}</span>}
    </div>
  );
}

function Marker({ event }: { event: ThreadEvent }) {
  if (event.kind === "comment" && event.author) {
    return (
      <div className="z-[1] shrink-0">
        <Avatar name={event.author.name} color={event.author.color} size={26} ring />
      </div>
    );
  }

  const map: Record<string, { icon: React.ElementType; color: string }> = {
    created: { icon: FilePlus2, color: "var(--text-3)" },
    comment: { icon: MessageSquare, color: "var(--accent)" },
    status: { icon: ArrowRight, color: "var(--green)" },
    assign: { icon: UserRound, color: "var(--violet)" },
    field: { icon: PencilLine, color: "var(--text-3)" },
    parcel: { icon: Package, color: "var(--blue)" },
    system: { icon: ShieldAlert, color: "var(--red)" },
    // Odprema naročila je Shopifyjeva novica, ne naša napaka.
    shopify: { icon: Truck, color: "var(--petrol)" },
  };
  // Pismo stranki je edini dogodek v niti, ki je šel iz sistema navzven. Zato
  // ne nosi sistemskega opozorila, ampak pošto — poslano v petrolu, barvi
  // dejanj, zavrženo pa pridušeno, ker se ni zgodilo nič.
  const outgoing = event.kind === "system" && event.field === "customer_email"
    ? { icon: Mail, color: event.toValue === "sent" ? "var(--petrol)" : "var(--text-3)" }
    : null;
  const { icon: Icon, color } = outgoing ?? map[event.kind] ?? map.field;

  return (
    <div
      className="z-[1] flex h-[26px] w-[26px] shrink-0 items-center justify-center border bg-surface"
      style={{ color, borderColor: "var(--border)", boxShadow: "0 0 0 3px var(--bg)" }}
    >
      <Icon size={13} />
    </div>
  );
}

function Body({ event, meId }: { event: ThreadEvent; meId?: string }) {
  const t = useT();
  const { parcelStaleHours: staleHours } = useSettings();
  const who = event.author?.name ?? t("thread.system");
  const level = event.author
    ? event.author.isAdmin
      ? t("thread.admin")
      : t("nav.level", { level: event.author.level })
    : null;

  if (event.kind === "comment") {
    return <CommentBody event={event} who={who} level={level} canEdit={Boolean(meId && event.authorId === meId)} />;
  }

  if (event.kind === "assign") {
    // "Ana je predala od Ana → Sara" bi bilo odveč; prejšnjega prevzemnika
    // navedemo samo, kadar predaja ni bila lastna.
    const showFrom = event.fromValue && event.fromValue !== who;
    return (
      <span className="text-label-2">
        <Who name={who} /> {t("thread.assigned")}
        {showFrom && (
          <>
            {" "}
            {t("thread.from")} <Chip>{event.fromValue}</Chip>
          </>
        )}{" "}
        <ArrowRight size={11} className="inline align-middle text-label-3" />{" "}
        <Chip strong>{event.toValue}</Chip>
      </span>
    );
  }

  if (event.kind === "status") {
    return (
      <span className="text-label-2">
        <span>
          <Who name={who} /> {t("thread.statusChanged")}{" "}
          <Chip strong>{t(`status.${getStatus(event.toValue ?? "open").id}` as TranslationKey)}</Chip>
        </span>
        {event.field === "tracking_stale" && (
          <span className="mt-1 block text-[12px] text-label-3">
            {t("thread.trackingStaleMoved", { hours: staleHours })}
          </span>
        )}
        {event.field === "reply_received" && (
          <span className="mt-1 block text-[12px] text-label-3">{t("thread.replyReceived")}</span>
        )}
        {event.field === "reply_after_close" && (
          <span className="mt-1 block text-[12px] text-label-3">{t("thread.replyAfterClose")}</span>
        )}
        {event.field === "reply_acknowledged" && (
          <span className="mt-1 block text-[12px] text-label-3">{t("thread.replyAcknowledged")}</span>
        )}
        {(event.field === "deadline_passed" || event.field === "deadline_no_reply") && (
          <span className="mt-1 block text-[12px] text-label-3">
            {t(event.field === "deadline_no_reply" ? "thread.deadlineNoReply" : "thread.deadlinePassed")}
          </span>
        )}
        {event.field === "supplier_shipped" && (
          <span className="mt-1 block text-[12px] text-label-3">{t("thread.supplierShippedWoke")}</span>
        )}
        {event.field === "order_fulfilled" && (
          <span className="mt-1 block text-[12px] text-label-3">{t("thread.orderFulfilledWoke")}</span>
        )}
      </span>
    );
  }

  // Stanje naročila pri Shopifyju: dogodek brez avtorja, ki ga zapiše dnevno
  // preverjanje. Zanima nas prehod, zato oboje — prej in potem.
  if (event.kind === "shopify" && event.field === "delivery") {
    return (
      <span className="text-label-2">
        <span className="font-medium" style={{ color: "var(--stamp)" }}>{t("thread.deliveryFailed")}</span>
        {event.body && <>{" "}<Chip>{event.body}</Chip></>}
        {event.fromValue && <span className="ml-1.5 text-[12px] text-label-3">{t("thread.deliveryReopened")}</span>}
      </span>
    );
  }

  if (event.kind === "shopify") {
    return (
      <span className="text-label-2">
        <span className="font-medium text-label">{t("thread.orderFulfilled")}</span>{" "}
        {event.fromValue && (
          <>
            <Chip>{t(`orderFul.${event.fromValue}` as TranslationKey)}</Chip>{" "}
            <ArrowRight size={11} className="inline align-middle text-label-3" />{" "}
          </>
        )}
        <Chip strong>{t(`orderFul.${event.toValue ?? "FULFILLED"}` as TranslationKey)}</Chip>
      </span>
    );
  }

  // Artikli in napačno poslan kos imajo dolge nazive: v niti ostane ena
  // vrstica, podrobnosti se odprejo na zahtevo.
  if (event.kind === "field" && event.field === "wrongItem") {
    return (
      <Collapsed
        summary={<><Who name={who} /> {event.toValue ? t("thread.wrongItemShort") : t("thread.wrongItemRemovedShort")}</>}
      >
        {event.toValue ? (
          <>
            <DetailLine label={t("thread.wrongItemOrdered")}>{event.fromValue ?? "—"}</DetailLine>
            <DetailLine label={t("thread.wrongItemReceived")}>{event.toValue}</DetailLine>
          </>
        ) : (
          <DetailLine label={t("thread.wrongItemOrdered")}>{event.fromValue ?? "—"}</DetailLine>
        )}
      </Collapsed>
    );
  }

  if (event.kind === "field" && event.field === "items") {
    // Seznam artiklov je predolg za zapis "prej → potem"; prejšnje stanje je
    // itak zapisano v prejšnjem dogodku.
    return (
      <Collapsed summary={<><Who name={who} /> {t("thread.editedItems")}</>}>
        {event.toValue ? (
          event.toValue.split(", ").map((line, index) => <span key={index} className="block">{line}</span>)
        ) : (
          <span className="block text-label-3">{t("thread.empty")}</span>
        )}
      </Collapsed>
    );
  }

  if (event.kind === "field") {
    return (
      <span className="text-label-2">
        <Who name={who} /> {t("thread.edited")} <span className="font-medium text-label">{fieldLabel(event.field, t)}</span>:{" "}
        {event.fromValue ? <Chip>{event.fromValue}</Chip> : <span className="text-label-3">{t("thread.empty")}</span>}{" "}
        <ArrowRight size={11} className="inline align-middle text-label-3" />{" "}
        {event.toValue ? <Chip strong>{event.toValue}</Chip> : <span className="text-label-3">{t("thread.empty")}</span>}
      </span>
    );
  }

  if (event.kind === "parcel") {
    // toValue je "stanje" ali "stanje:razlog" (glej sync.ts).
    const [state, reason] = (event.toValue ?? "").split(":");

    if (state === "removed") {
      return (
        <span className="text-label-2">
          <Who name={who} /> {t("thread.parcelRemoved")} <Chip>{event.field}</Chip>
        </span>
      );
    }

    // Prvi zapis nima prejšnjega stanja — takrat gre za začetek spremljanja.
    if (!event.fromValue) {
      return (
        <span className="text-label-2">
          <Who name={who} /> {t("thread.parcelAdded")} <Chip strong>{event.field}</Chip>
        </span>
      );
    }

    return (
      <span className="text-label-2">
        <span className="font-medium text-label">{t("thread.parcelUpdate")}</span>{" "}
        <Chip>{event.field}</Chip>{" "}
        <ArrowRight size={11} className="inline align-middle text-label-3" />{" "}
        <Chip strong>{t(`parcel.state.${state}` as TranslationKey)}</Chip>
        {reason && (
          <span className="ml-1.5 text-[12px] text-label-3">
            {t(`parcel.reason.${reason}` as TranslationKey, { hours: staleHours })}
          </span>
        )}
      </span>
    );
  }

  if (event.kind === "system" && event.field === "shipg") {
    const action = !event.fromValue
      ? "added"
      : event.toValue === "deleted"
        ? "deleted"
        : event.toValue === "linked"
          ? "linked"
        : event.toValue === "stocked"
          ? "stocked"
          : event.toValue === "exception"
            ? "exception"
            : event.toValue === "shipped"
              ? "shipped"
              : "check";
    return (
      <span className="text-label-2">
        <Who name={who} /> {t(`thread.shipg.${action}` as TranslationKey)}
        {(action === "shipped" || action === "linked") && event.body && <span className="mono ml-1.5 text-[12px] text-label-3">{event.body}</span>}
      </span>
    );
  }

  if (event.kind === "system" && event.field === "exchange_round") {
    const [round, fault] = (event.toValue ?? "").split(":");
    return (
      <span className="text-label-2">
        <Who name={who} /> {t("thread.exchangeRound", { round: round ?? "" })}
        {(fault === "ours" || fault === "customer") && (
          <span className="ml-1.5 text-[12px] text-label-3">{t(`round.fault.${fault}` as TranslationKey)}</span>
        )}
      </span>
    );
  }

  if (event.kind === "system" && event.field === "shipg_allocation") {
    const action = event.toValue === "reserved" ? "reserved"
      : event.toValue === "released" ? "released"
        : event.toValue === "shipped" ? "shipped"
          : "dispatching";
    return (
      <span className="text-label-2">
        <Who name={who} /> {t(`thread.shipgAllocation.${action}` as TranslationKey)}
        {event.body ? <span className="ml-1.5 mono text-[11.5px] text-label-3">{event.body}</span> : null}
      </span>
    );
  }

  if (event.kind === "system" && (event.field === "supplier_order" || event.field === "supplier_address")) {
    const action = event.field === "supplier_address" ? "address"
      : event.toValue === "shipped" ? "shipped"
        : "cancelled";
    return (
      <span className="text-label-2">
        <Who name={who} /> {t(`thread.supplierOrder.${action}` as TranslationKey)}
        {event.body ? <span className="ml-1.5 mono text-[11.5px] text-label-3">{event.body}</span> : null}
        {action === "address" && event.toValue ? <span className="mt-1 block text-[12px] text-label-3">{event.toValue}</span> : null}
      </span>
    );
  }

  if (event.kind === "system" && event.field === "customer_email") {
    return (
      <span className="text-label-2">
        <Who name={who} /> {t(event.toValue === "sent" ? "thread.customerEmail.sent" : "thread.customerEmail.discarded")}
        {event.body ? <span className="ml-1.5 text-[11.5px] text-label-3">{event.body}</span> : null}
      </span>
    );
  }

  if (event.kind === "system" && event.field === "shipgerman_link") {
    // Klik na ID paketa gre skozi razreševalno pot: ta ob kliku pogleda, ali je
    // paket še v zalogi ali že odposlan, in pelje na pravo mesto.
    const parcel = event.toValue ?? event.fromValue;
    return (
      <span className="text-label-2">
        <Who name={who} /> {t(event.toValue ? "thread.shipgermanLink.linked" : "thread.shipgermanLink.unlinked")}
        {parcel ? (
          <Link
            href={`/shipg/parcel/${encodeURIComponent(parcel)}`}
            className="link mono ml-1.5 text-[11.5px]"
            title={t("thread.shipgermanLink.open")}
          >
            ShipGerman {parcel}
          </Link>
        ) : null}
      </span>
    );
  }

  if (event.kind === "created") {
    return (
      <span className="text-label-2">
        <Who name={who} /> {t("thread.opened")}
      </span>
    );
  }

  return <span className="text-label-2">{event.body}</span>;
}

function Who({ name }: { name: string }) {
  return <strong className="font-semibold text-label">{name}</strong>;
}

function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className="mono border px-1.5 py-px text-[11.5px]"
      style={{
        background: strong ? "var(--ink)" : "transparent",
        borderColor: strong ? "var(--ink)" : "var(--rule-strong)",
        color: strong ? "var(--sheet)" : "var(--ink-2)",
      }}
    >
      {children}
    </span>
  );
}

function fieldLabel(field: string | null, t: ReturnType<typeof useT>): string {
  if (!field) return "—";
  // itemName/itemSize/itemQty se ne urejajo več, a ostajajo v starih dogodkih.
  const known = ["orderNumber", "title", "priority", "customerName", "customerEmail", "items", "itemName", "itemSize", "itemQty", "amount", "returnTracking", "replacementTracking", "orderPlacedAt", "waitingUntil"];
  return known.includes(field) ? t(`field.${field}` as TranslationKey) : field;
}

function groupByDay(events: ThreadEvent[], locale: string, todayLabel: string, yesterdayLabel: string): [string, ThreadEvent[]][] {
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const label = (d: Date) => {
    const today = new Date();
    const yest = new Date(Date.now() - 86_400_000);
    if (same(d, today)) return todayLabel;
    if (same(d, yest)) return yesterdayLabel;
    return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  };

  const out: [string, ThreadEvent[]][] = [];
  for (const e of events) {
    const key = label(new Date(e.createdAt));
    const last = out[out.length - 1];
    if (last && last[0] === key) last[1].push(e);
    else out.push([key, [e]]);
  }
  return out;
}
