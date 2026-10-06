import "server-only";

import { db } from "./db";

/**
 * Nov mail stranke na obstoječ ticket. Zaprt (arhiviran) ticket se znova odpre,
 * sicer bi mail obvisel v Prejetem, ne da bi ga kdo videl na seznamu ticketov.
 * Na odprtem ticketu prevzemnik dobi obvestilo. Čakajoče tickete zbudi
 * lib/waiting.ts (odgovor prejet), zato jih tu ne zadevamo.
 */
export async function customerMailOnIssue(issueId: number, message: { sentAt: Date; snippet: string | null }) {
  const issue = await db.issue.findUnique({
    where: { id: issueId },
    select: { id: true, key: true, orderNumber: true, status: true, closedAt: true, assigneeId: true, level: true },
  });
  if (!issue) return;

  if (issue.status === "closed") {
    // Mail, ki je prišel pred zaprtjem, ni razlog za ponovno odprtje.
    if (issue.closedAt && message.sentAt <= issue.closedAt) return;
    const reopened = await db.$transaction(async (tx) => {
      const changed = await tx.issue.updateMany({
        where: { id: issue.id, status: "closed" },
        data: { status: "open", closedAt: null, archivedAt: null, waitingUntil: null, waitingReplySince: null },
      });
      if (changed.count !== 1) return false;
      await tx.event.create({
        data: { issueId: issue.id, kind: "status", field: "reply_after_close", fromValue: "closed", toValue: "open" },
      });
      return true;
    });
    if (reopened) await notifyIssueOwners(issue, message.snippet);
    return;
  }

  // Obvestilo samo za svež mail: ponovni pregled starih niti ne sme zvoniti.
  if (issue.status === "open" && issue.assigneeId && Date.now() - message.sentAt.getTime() < 2 * 86_400_000) {
    await notifyIssueOwners(issue, message.snippet);
  }
}

/**
 * Enkrat po namestitvi: arhivirani ticketi, pri katerih je stranka pisala po
 * zaprtju, preden je Desk to znal, se znova odprejo.
 */
export async function reopenClosedWithReplies(): Promise<number> {
  const conversations = await db.inboxConversation.findMany({
    where: { lastDirection: "incoming", issue: { status: "closed" } },
    select: { issueId: true, lastMessageAt: true, lastSnippet: true, issue: { select: { closedAt: true } } },
    orderBy: { lastMessageAt: "desc" },
  });
  const seen = new Set<number>();
  let reopened = 0;
  for (const conversation of conversations) {
    if (!conversation.issueId || seen.has(conversation.issueId)) continue;
    seen.add(conversation.issueId);
    const closedAt = conversation.issue?.closedAt;
    if (!closedAt || conversation.lastMessageAt <= closedAt) continue;
    await customerMailOnIssue(conversation.issueId, { sentAt: conversation.lastMessageAt, snippet: conversation.lastSnippet });
    reopened++;
  }
  return reopened;
}

async function notifyIssueOwners(
  issue: { id: number; key: string; orderNumber: string; assigneeId: string | null; level: number },
  snippet: string | null,
) {
  try {
    const { notify } = await import("./notifications");
    const recipients = issue.assigneeId
      ? [issue.assigneeId]
      : (await db.user.findMany({ where: { active: true, level: Math.max(issue.level, 1) }, select: { id: true } })).map((user) => user.id);
    for (const recipientId of recipients) {
      await notify({
        kind: "reply",
        recipientId,
        issueId: issue.id,
        issueKey: issue.key,
        orderNumber: issue.orderNumber,
        actorName: "Desk",
        preview: snippet,
      });
    }
  } catch (error) {
    console.error("[Inbox] Reply notification failed", error);
  }
}
