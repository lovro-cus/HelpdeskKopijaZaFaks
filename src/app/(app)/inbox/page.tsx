import type { Prisma } from "@prisma/client";

import { REOPEN_FIELD, replyCueIds } from "@/lib/reply-cue";
import { customerEmailDraft, customerLanguage } from "@/lib/customer-email";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ensureCatalog } from "@/lib/catalog-server";
import { InboxWorkspace } from "@/components/InboxWorkspace";

export const dynamic = "force-dynamic";

const VIEWS = ["open", "mine", "unassigned", "waiting", "unlinked", "done", "all"];

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ thread?: string; view?: string; result?: string; draft?: string }> }) {
  const me = await requireUser();
  await ensureCatalog();
  const query = await searchParams;
  const view = VIEWS.includes(query.view || "") ? query.view! : "open";
  // Mail brez ticketa ima svoj pogled; delovni pogledi so samo pogovori s ticketom.
  const linked: Prisma.InboxConversationWhereInput = { issueId: { not: null } };
  const where: Prisma.InboxConversationWhereInput = view === "mine" ? { ...linked, assigneeId: me.id, status: { not: "done" } }
    : view === "unassigned" ? { ...linked, assigneeId: null, status: { not: "done" } }
      : view === "unlinked" ? { issueId: null, status: { not: "done" } }
        : view === "all" ? {}
          : view === "done" ? { status: "done" }
            : { ...linked, status: view };
  const [conversations, users, unlinkedCount] = await Promise.all([
    db.inboxConversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: 120,
      include: {
        assignee: { select: { id: true, name: true, color: true } },
        issue: { select: { key: true, orderNumber: true, priority: true } },
        seenBy: { where: { userId: me.id }, select: { seenMessageId: true } },
      },
    }),
    db.user.findMany({ where: { active: true }, orderBy: [{ level: "asc" }, { name: "asc" }], select: { id: true, name: true, color: true } }),
    db.inboxConversation.count({ where: { issueId: null, status: { not: "done" } } }),
  ]);
  // Ovojnica s klicajem ob pogovoru, čigar mail je znova odprl zaprt ticket.
  const issueIds = [...new Set(conversations.flatMap((c) => c.issueId ? [c.issueId] : []))];
  const [reopens, human, statuses] = issueIds.length === 0 ? [[], [], []] : await Promise.all([
    db.event.groupBy({ by: ["issueId"], where: { issueId: { in: issueIds }, field: REOPEN_FIELD }, _max: { createdAt: true } }),
    db.event.groupBy({ by: ["issueId"], where: { issueId: { in: issueIds }, authorId: { not: null } }, _max: { createdAt: true } }),
    db.issue.findMany({ where: { id: { in: issueIds } }, select: { id: true, status: true } }),
  ]);
  const reopenCues = replyCueIds(statuses, reopens, human);
  const selectedId = query.thread && conversations.some((c) => c.id === query.thread)
    ? query.thread
    : query.thread || conversations[0]?.id || null;
  const selected = selectedId ? await db.inboxConversation.findUnique({
    where: { id: selectedId },
    include: {
      assignee: { select: { id: true, name: true, color: true } },
      issue: { include: { items: { orderBy: { position: "asc" } }, parcels: { orderBy: { createdAt: "asc" } } } },
    },
  }) : null;
  const requestedDraftId = Number(query.draft);
  const pendingDraft = selected?.issueId && Number.isInteger(requestedDraftId) && requestedDraftId > 0
    ? await db.customerEmailDraft.findFirst({ where: { id: requestedDraftId, issueId: selected.issueId, status: "draft" }, select: { id: true, body: true } })
    : null;
  const initialBody = pendingDraft?.body ?? (selected?.issue ? customerEmailDraft({
    kind: "custom",
    language: customerLanguage(selected.issue.customerCountryCode),
    customerName: selected.issue.customerName,
    orderNumber: selected.issue.orderNumber,
    lines: [],
  }).body : "");
  return <InboxWorkspace
    me={{ id: me.id, locale: me.locale }}
    view={view}
    result={query.result || null}
    unlinkedCount={unlinkedCount}
    conversations={conversations.map((c) => ({
      id: c.id, subject: c.subject, customerName: c.customerName, customerEmail: c.customerEmail,
      lastMessageAt: c.lastMessageAt.toISOString(), lastSnippet: c.lastSnippet, lastDirection: c.lastDirection,
      status: c.status, unread: c.seenBy[0]?.seenMessageId !== c.lastMessageId, assignee: c.assignee,
      issue: c.issue, unlinkedReason: c.unlinkedReason, reopenCue: c.issueId ? reopenCues.has(c.issueId) : false,
    }))}
    selected={selected ? {
      id: selected.id, subject: selected.subject, status: selected.status, assignee: selected.assignee,
      customerEmail: selected.customerEmail, customerName: selected.customerName, unlinkedReason: selected.unlinkedReason,
      issue: selected.issue ? {
        id: selected.issue.id, key: selected.issue.key, orderNumber: selected.issue.orderNumber,
        customerName: selected.issue.customerName, customerEmail: selected.issue.customerEmail,
        customerPhone: selected.issue.customerPhone, customerAddress: selected.issue.customerAddress,
        type: selected.issue.type, status: selected.issue.status, priority: selected.issue.priority,
        amount: selected.issue.amount, currency: selected.issue.currency,
        items: selected.issue.items.map((i) => ({ id: i.id, name: i.name, variant: i.variant, qty: i.qty, resolution: i.resolution })),
        parcels: selected.issue.parcels.map((p) => ({ id: p.id, number: p.number, direction: p.direction, state: p.state })),
      } : null,
    } : null}
    users={users}
    initialBody={initialBody}
    draftId={pendingDraft?.id ?? null}
  />;
}
