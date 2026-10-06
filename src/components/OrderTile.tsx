"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, ChevronDown, Clock3, LoaderCircle, Mail, MailWarning, MessageSquare, Paperclip, Plane } from "lucide-react";

import { daysOpen } from "@/lib/format";
import { useTypeLabel } from "@/lib/config/client";
import { Avatar, LevelPill, PriorityDot, StateMark, TypePill } from "./ui";
import { useLocale, useT } from "@/lib/i18n/client";
import { StarButton } from "./StarButton";
import { ThreadPreview, type ThreadEvent } from "./Thread";

export type TileIssue = {
  id: number;
  key: string;
  orderNumber: string;
  type: string;
  status: string;
  priority: string;
  level: number;
  title: string | null;
  customerName: string | null;
  waitingUntil: Date | null;
  waitingReplySince: Date | null;
  /** Naročilo čaka, ker je vračilo na poti k nam (parcelHolds v domain.ts). */
  awaitingParcel?: boolean;
  createdAt: Date;
  updatedAt: Date;
  assignee: { id: string; name: string; color: string } | null;
  items: { name: string; variant: string | null; resolution: string }[];
  _count: { events: number; attachments: number; items: number };
  /** Mailov s stranko v povezanih Gmail nitih. */
  emailCount?: number;
  /** Stranka je odgovorila in ticket je prišel nazaj iz čakanja; nihče se ga še ni dotaknil. */
  replyCue?: boolean;
  /** Mail stranke je znova odprl zaprt ticket in se nanj še nihče ni odzval. */
  reopenCue?: boolean;
  /** Osebna zvezdica prijavljenega uporabnika. */
  starred?: boolean;
};

/**
 * List v registru.
 *
 * Vodilni podatek je številka naročila: po PRODUCT.md je to vezni ključ med
 * mailom, Shopifyjem in Deskom, in tisto, kar podpora bere prvo. Zato je
 * največja stvar na listu, v mono pisavi, pod lastno glavo — vse ostalo se
 * bere šele za njo.
 */
export function OrderTile({
  issue,
  meId,
  showMineCue = false,
  selecting = false,
  selected = false,
  onToggle,
}: {
  issue: TileIssue;
  meId: string;
  showMineCue?: boolean;
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const typeLabel = useTypeLabel(issue.type);
  // Filter potuje s klikom naprej: odprt ticket mora vedeti, iz katerega kupa
  // je prišel, da mu trak ob strani pokaže prav ta naročila.
  const params = useSearchParams().toString();
  const filterQuery = params ? `?${params}` : "";
  const mine = issue.assignee?.id === meId;
  const highlightMine = mine && showMineCue;
  const closed = issue.status === "closed";
  const age = daysOpen(issue.createdAt);
  const stale = !closed && Date.now() - +new Date(issue.updatedAt) > 7 * 86_400_000;
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<ThreadEvent[] | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Na listu je prostor za en artikel: pokažemo tistega, ki je sporen.
  const affected = issue.items.filter((item) => item.resolution !== "none");
  const shown = affected.length > 0 ? affected : issue.items;
  const lead = shown[0] ? [shown[0].name, shown[0].variant].filter(Boolean).join(" ") : null;
  const rest = issue._count.items - (lead ? 1 : 0);

  // Ticket, ki čaka odgovor ali paket, nima nujno datuma — povej, kaj ga bo zbudilo.
  const waitingLabel =
    issue.status !== "waiting"
      ? null
      : issue.waitingReplySince
        ? t("issue.waitReplyShort")
        : issue.awaitingParcel
          ? t("issue.waitParcelShort")
          : issue.waitingUntil
            ? new Date(issue.waitingUntil).toLocaleDateString(locale, { day: "numeric", month: "short" })
            : null;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <StateMark status={issue.status} />
          <span className="mono truncate text-[19px] font-semibold leading-none tracking-[-0.02em]">
            {issue.orderNumber}
          </span>
          {issue.reopenCue && (
            <MailWarning
              size={18}
              strokeWidth={2.25}
              className="shrink-0"
              style={{ color: "var(--stamp)" }}
              aria-label={t("issue.reopenCue")}
              role="img"
            >
              <title>{t("issue.reopenCue")}</title>
            </MailWarning>
          )}
          {issue.replyCue && (
            <span
              className="mono shrink-0 text-[19px] font-bold leading-none"
              style={{ color: "var(--stamp)" }}
              title={t("issue.replyCue")}
              aria-label={t("issue.replyCue")}
              role="img"
            >
              !
            </span>
          )}
          {/* Čakanje je jantarno, znak pa pove, kaj ga bo končalo: ovojnica z
              uro za odgovor stranke, letalo za paket na poti, sicer ura. */}
          {issue.status === "waiting" && (
            issue.waitingReplySince ? (
              <span className="wait-mark wait-mark-mail" role="img" aria-label={t("issue.waitReply")} title={t("issue.waitReply")} />
            ) : issue.awaitingParcel ? (
              <span className="inline-flex shrink-0" title={t("issue.waitParcel")}>
                <Plane size={16} strokeWidth={2} style={{ color: "var(--warning)" }} role="img" aria-label={t("issue.waitParcel")} />
              </span>
            ) : (
              <Clock3 size={16} strokeWidth={2} className="shrink-0" style={{ color: "var(--warning)" }} role="img" aria-label={t("status.waiting")} />
            )
          )}
          <PriorityDot priority={issue.priority} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {highlightMine && <span className="pill mine-mark">{t("orders.mineBadge")}</span>}
          {selecting && (
            <span
              aria-hidden
              className="inline-flex h-[22px] w-[22px] items-center justify-center border"
              style={{
                borderColor: selected ? "var(--petrol)" : "var(--rule-strong)",
                background: selected ? "var(--petrol)" : "var(--sheet)",
                color: "var(--sheet)",
              }}
            >
              {selected && <Check size={14} strokeWidth={2.5} />}
            </span>
          )}
          {/* Zvezdica je gumb nad povezavo lista (gumb ne sme biti v <a>). */}
          {!selecting && (
            <StarButton issueId={issue.id} starred={Boolean(issue.starred)} className="pointer-events-auto relative z-[1] h-[22px] w-[22px]" />
          )}
          <Avatar
            name={issue.assignee?.name}
            color={issue.assignee?.color}
            size={22}
            accent={highlightMine}
          />
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        <TypePill type={issue.type} />
        <LevelPill level={issue.level} muted={closed} />
      </div>

      <div className="my-2.5 h-px w-full" style={{ background: "var(--rule)" }} />

      <p className="line-clamp-2 text-[13px] font-medium leading-[1.4]">
        {issue.title ?? `${typeLabel} — ${t("issue.order")} #${issue.orderNumber}`}
      </p>

      {(issue.customerName || lead) && (
        <p className="mt-1 truncate text-[12px] text-label-2">
          {[issue.customerName, lead].filter(Boolean).join(" · ")}
          {rest > 0 && <span className="mono text-label-3"> +{rest}</span>}
        </p>
      )}

      <div className="mono mt-auto flex items-center gap-2 pt-3 text-[11px] text-label-3">
        <span className="truncate">{issue.key}</span>

        <span className="ml-auto flex items-center gap-2">
          {(issue.emailCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5" title={t("issue.emails", { count: issue.emailCount ?? 0 })}>
              <Mail size={11} />
              {issue.emailCount}
            </span>
          )}
          {issue._count.attachments > 0 && (
            <span className="flex items-center gap-0.5" title={t("issue.attachments", { count: issue._count.attachments })}>
              <Paperclip size={11} />
              {issue._count.attachments}
            </span>
          )}
          {issue._count.events > 1 && (
            <span className="flex items-center gap-0.5" title={t("issue.entries", { count: issue._count.events })}>
              <MessageSquare size={11} />
              {issue._count.events}
            </span>
          )}
          {/* Zastalo naročilo dobi rdeče pero — edini kraj, kjer se na listu
              pojavi barva. */}
          <span
            title={t("issue.openDays", { days: age })}
            style={stale ? { color: "var(--stamp)", fontWeight: 600 } : undefined}
          >
            {waitingLabel ?? `${age}d`}
          </span>
        </span>
      </div>
    </>
  );

  if (selecting) {
    return (
      <button
        type="button"
        className="tile group w-full"
        data-mine={highlightMine || undefined}
        data-closed={closed}
        data-selected={selected || undefined}
        aria-pressed={selected}
        aria-label={t("orders.bulkToggle", { order: issue.orderNumber })}
        onClick={onToggle}
      >
        {content}
      </button>
    );
  }

  const togglePreview = async () => {
    const next = !expanded;
    setExpanded(next);
    if (!next || preview !== null || previewLoading) return;

    setPreviewLoading(true);
    setPreviewError(false);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(issue.key)}/thread-preview`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("preview_unavailable");
      const data = await response.json() as { events?: Array<Omit<ThreadEvent, "createdAt"> & { createdAt: string }> };
      setPreview((data.events ?? []).map((event) => ({ ...event, createdAt: new Date(event.createdAt) })));
    } catch {
      setPreviewError(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <article
      className="tile group relative self-start p-0"
      data-mine={highlightMine || undefined}
      data-closed={closed}
    >
      {/* Povezava prekrije list; vsebina nad njo ne lovi klikov, razen zvezdice. */}
      <div className="relative">
        <Link
          href={`/orders/${issue.key}${filterQuery}`}
          className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--petrol)]"
          aria-label={`${issue.orderNumber} · ${issue.title ?? typeLabel}`}
        />
        <div className="pointer-events-none relative flex min-h-[147px] flex-col px-3 pb-2.5 pt-[11px]">
          {content}
        </div>
      </div>

      {expanded && (
        <div
          id={`ticket-preview-${issue.id}`}
          className="border-t px-3 py-3"
          style={{ borderColor: "var(--rule)" }}
        >
          {previewLoading ? (
            <div className="flex min-h-12 items-center justify-center text-label-3" role="status">
              <LoaderCircle size={15} className="animate-spin" aria-hidden />
              <span className="sr-only">{t("orders.threadPreviewLoading")}</span>
            </div>
          ) : previewError ? (
            <p className="text-[12px] text-label-3" role="alert">{t("orders.threadPreviewError")}</p>
          ) : preview?.length ? (
            <ThreadPreview events={preview} />
          ) : (
            <p className="text-[12px] text-label-3">{t("orders.threadPreviewEmpty")}</p>
          )}
        </div>
      )}

      <button
        type="button"
        className="flex h-6 w-full items-center justify-center border-t text-label-3 transition-colors hover:text-label focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--petrol)]"
        style={{ borderColor: "var(--rule)" }}
        aria-expanded={expanded}
        aria-controls={`ticket-preview-${issue.id}`}
        aria-label={t(expanded ? "orders.threadPreviewHide" : "orders.threadPreviewShow")}
        title={t(expanded ? "orders.threadPreviewHide" : "orders.threadPreviewShow")}
        onClick={togglePreview}
      >
        <ChevronDown
          size={15}
          aria-hidden
          className={`transition-transform duration-150 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
        />
      </button>
    </article>
  );
}
