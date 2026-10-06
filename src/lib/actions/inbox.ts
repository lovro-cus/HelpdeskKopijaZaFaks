"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserStrict } from "../auth";
import { ensureCatalog } from "../catalog-server";
import { customerLanguage } from "../customer-email";
import { db } from "../db";
import { findThreadReplyTarget, getEmailThread, GmailError, sendGmailMessage } from "../gmail";
import { openTicketForOrder, syncInbox } from "../inbox-sync";

const inboxUrl = (id: string, result?: string) => `/inbox?thread=${encodeURIComponent(id)}${result ? `&result=${result}` : ""}`;

export async function refreshInbox(): Promise<void> {
  await requireUserStrict();
  // Dolgotrajno delo ne sme držati odprtega uporabnikovega HTTP zahtevka.
  // Dockerjev Node proces ostane živ in skupna varovalka prepreči dvojni obhod.
  void syncInbox().catch((error) => console.error("Manual inbox refresh failed", error));
  revalidatePath("/inbox");
  redirect("/inbox?result=syncing");
}

export async function markInboxSeen(conversationId: string): Promise<void> {
  const me = await requireUserStrict();
  const conversation = await db.inboxConversation.findUnique({ where: { id: conversationId }, select: { lastMessageId: true } });
  if (!conversation) return;
  await db.inboxSeen.upsert({
    where: { conversationId_userId: { conversationId, userId: me.id } },
    create: { conversationId, userId: me.id, seenMessageId: conversation.lastMessageId },
    update: { seenMessageId: conversation.lastMessageId, seenAt: new Date() },
  });
  revalidatePath("/inbox");
}

export async function updateInboxConversation(fd: FormData): Promise<void> {
  const me = await requireUserStrict();
  const id = String(fd.get("conversationId") || "").slice(0, 40);
  const conversation = await db.inboxConversation.findUnique({ where: { id }, select: { issueId: true } });
  if (!conversation) redirect("/inbox");
  const rawStatus = String(fd.get("status") || "");
  const status = ["open", "waiting", "done"].includes(rawStatus) ? rawStatus : undefined;
  const rawAssignee = String(fd.get("assigneeId") || "");
  let assigneeId: string | null | undefined = rawAssignee === "me" ? me.id : rawAssignee === "none" ? null : undefined;
  if (assigneeId === undefined && rawAssignee) {
    assigneeId = await db.user.findFirst({ where: { id: rawAssignee.slice(0, 40), active: true }, select: { id: true } }).then((user) => user?.id);
  }
  const issueId = conversation.issueId;
  await db.$transaction([
    ...(status ? [db.inboxConversation.update({ where: { id }, data: { status } })] : []),
    // Pogovor brez ticketa dodelimo samo sebi; s ticketom se dodelitev deli.
    ...(assigneeId !== undefined && issueId === null ? [db.inboxConversation.update({ where: { id }, data: { assigneeId } })] : []),
    ...(assigneeId !== undefined && issueId !== null ? [db.inboxConversation.updateMany({ where: { issueId }, data: { assigneeId } })] : []),
    ...(assigneeId !== undefined && issueId !== null ? [db.issue.update({ where: { id: issueId }, data: { assigneeId } })] : []),
  ]);
  revalidatePath("/inbox");
  redirect(inboxUrl(id));
}

/**
 * Poveže pogovor brez ticketa z naročilom. Človek je naročilo potrdil sam, zato
 * e-naslova ne primerjamo s Shopifyjem. Če naročilo še nima ticketa, se odpre
 * in dodeli tistemu, ki ga je povezal.
 */
export async function linkInboxConversation(fd: FormData): Promise<void> {
  const me = await requireUserStrict();
  const id = String(fd.get("conversationId") || "").slice(0, 40);
  const orderNumber = String(fd.get("orderNumber") || "").trim().replace(/^#/, "").slice(0, 40);
  const conversation = await db.inboxConversation.findUnique({ where: { id }, select: { id: true, issueId: true, subject: true } });
  if (!conversation) redirect("/inbox");
  if (conversation.issueId !== null) redirect(inboxUrl(id));
  if (!/^[A-Za-z0-9\-_.]{1,40}$/.test(orderNumber)) redirect(`/inbox?view=unlinked&thread=${encodeURIComponent(id)}&result=link_invalid`);

  const opened = await openTicketForOrder(orderNumber, { customerEmails: null, subject: conversation.subject, by: me });
  if ("reason" in opened) redirect(`/inbox?view=unlinked&thread=${encodeURIComponent(id)}&result=link_${opened.reason}`);

  await db.inboxConversation.update({
    where: { id },
    data: {
      issueId: opened.issue.id,
      unlinkedReason: null,
      customerEmail: opened.issue.customerEmail ?? undefined,
      customerName: opened.issue.customerName,
      status: "open",
    },
  });
  revalidatePath("/inbox");
  revalidatePath("/orders");
  redirect(`/inbox?view=open&thread=${encodeURIComponent(id)}&result=linked`);
}

export async function sendInboxReply(fd: FormData): Promise<void> {
  const me = await requireUserStrict();
  await ensureCatalog();
  const id = String(fd.get("conversationId") || "").slice(0, 40);
  const body = String(fd.get("body") || "").trim().slice(0, 4_000);
  if (!body) redirect(inboxUrl(id, "empty"));
  const conversation = await db.inboxConversation.findUnique({
    where: { id },
    include: { issue: { include: { items: { orderBy: { position: "asc" } } } } },
  });
  if (!conversation?.issue?.customerEmail) redirect(inboxUrl(id, "missing"));

  let preservedDraftId: number | null = null;
  try {
    const fresh = await getEmailThread({
      threadId: conversation.gmailThreadId,
      customerEmail: conversation.issue.customerEmail,
      customerName: conversation.issue.customerName,
      orderNumber: conversation.issue.orderNumber,
    });
    const latest = fresh.messages.at(-1);
    if (!latest || latest.id !== conversation.lastMessageId) {
      await syncInbox();
      redirect(inboxUrl(id, "changed"));
    }
    const target = await findThreadReplyTarget(conversation.gmailThreadId);
    const subject = target?.subject ? (/^re:/i.test(target.subject) ? target.subject : `Re: ${target.subject}`) : `Re: ${conversation.subject}`;
    const requestedDraftId = Number(fd.get("draftId"));
    const reusable = Number.isInteger(requestedDraftId) && requestedDraftId > 0
      ? await db.customerEmailDraft.findFirst({ where: { id: requestedDraftId, issueId: conversation.issue.id, status: "draft" } })
      : null;
    const draft = reusable ? await db.customerEmailDraft.update({ where: { id: reusable.id }, data: { body, subject } }) : await db.customerEmailDraft.create({
      data: {
        issueId: conversation.issue.id,
        kind: "custom",
        language: customerLanguage(conversation.issue.customerCountryCode),
        toEmail: conversation.issue.customerEmail,
        subject,
        body,
        threadId: conversation.gmailThreadId,
        inReplyTo: target?.inReplyTo,
        createdById: me.id,
      },
    });
    preservedDraftId = draft.id;
    const sent = await sendGmailMessage({
      to: conversation.issue.customerEmail,
      subject,
      body,
      threadId: conversation.gmailThreadId,
      inReplyTo: target?.inReplyTo,
    });
    const sentAt = new Date();
    await db.$transaction([
      db.customerEmailDraft.update({ where: { id: draft.id }, data: { status: "sent", sentMessageId: sent.id, sentById: me.id, sentAt: new Date() } }),
      db.inboxConversation.updateMany({ where: { issueId: conversation.issue.id }, data: { assigneeId: conversation.assigneeId || me.id } }),
      db.inboxConversation.update({ where: { id }, data: { status: "waiting", lastMessageId: sent.id, lastMessageAt: sentAt, lastSnippet: body.replace(/\s+/g, " ").slice(0, 240), lastDirection: "outgoing" } }),
      db.inboxSeen.upsert({
        where: { conversationId_userId: { conversationId: id, userId: me.id } },
        create: { conversationId: id, userId: me.id, seenMessageId: sent.id, seenAt: sentAt },
        update: { seenMessageId: sent.id, seenAt: sentAt },
      }),
      db.issue.update({ where: { id: conversation.issue.id }, data: { assigneeId: conversation.issue.assigneeId || me.id } }),
      db.event.create({ data: { issueId: conversation.issue.id, kind: "system", field: "customer_email", toValue: "sent", body: `${conversation.issue.customerEmail} · ${subject}`, authorId: me.id } }),
    ]);
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Inbox send failed", error);
    const result = error instanceof GmailError ? `error_${error.code}` : "error";
    redirect(`${inboxUrl(id, result)}${preservedDraftId ? `&draft=${preservedDraftId}` : ""}`);
  }
  revalidatePath("/inbox");
  revalidatePath(`/orders/${conversation.issue.key}`);
  redirect(inboxUrl(id, "sent"));
}
