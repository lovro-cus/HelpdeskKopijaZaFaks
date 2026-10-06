import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "./db";
import { countThreadMessages, getEmailConversation, gmailConfigured, getInboxThreads, getRecentInboxThreads, type EmailConversationMessage, type GmailInboxThread } from "./gmail";
import { PENDING_RESOLUTION, SYSTEM_LEVEL, SYSTEM_TYPE } from "./domain";
import { customerMailOnIssue, reopenClosedWithReplies } from "./inbox-reply";
import { chooseInboxIssue, contactDetails, inboxOrderNumbers, orderMatchesContact, senderName, unlinkedReasonFor, type ContactIdentity, type UnlinkedReason } from "./inbox-association";
import { orderNumberKey } from "./order-number";
import { issueFieldsFromOrder, itemsFromOrder } from "./order-ticket";
import { priorityForPayment } from "./payment";
import { findOrder, findOrderNumbersByEmail, searchOrderContacts } from "./shopify";

let running: Promise<{ synced: number; skipped: number; created: number }> | null = null;
const SYNC_ID = "gmail";
const OVERLAP_MS = 10 * 60_000;

const snippet = (message: EmailConversationMessage) =>
  (message.body || message.subject).replace(/\s+/g, " ").trim().slice(0, 240) || null;
const threadText = (messages: EmailConversationMessage[]) => messages.map((message) => `${message.subject}\n${message.body}`).join("\n");

type LinkedIssue = { id: number; orderNumber: string; customerEmail: string | null; customerName: string | null };
export type OpenTicketResult = { issue: LinkedIssue } | { reason: UnlinkedReason };

/**
 * Ticket za naročilo iz maila: obstoječi ali nov iz Shopifyja.
 *
 * Brez `by` teče samodejno (sinhronizacija Prejeto) in velja sistemska
 * politika: naročilo mora imeti e-naslov, telefon ali ime pošiljatelja, ticket gre v sistemsko vrsto.
 * Z `by` je naročilo potrdil človek (`customerEmails: null` preskoči primerjavo
 * naslova), zato ticket dobi njega kot prijavitelja in prevzemnika. Vrsto in
 * rešitev artiklov v obeh primerih izbere človek.
 */
export async function openTicketForOrder(
  orderNumber: string,
  input: {
    customerEmails: string[] | null;
    subject: string;
    by?: { id: string; level: number };
    /** Telefon in ime pošiljatelja: naročilo je njegovo tudi, ko je e-naslov drug. */
    contact?: { phones: string[]; names: string[] };
  },
): Promise<OpenTicketResult> {
  const normalized = orderNumberKey(orderNumber);
  const existing = await db.issue.findUnique({ where: { orderNumberKey: normalized } });
  if (existing) return { issue: existing };
  const order = await findOrder(orderNumber).catch(() => null);
  if (!order) return { reason: "order_not_found" };
  // Ne ustvarimo ticketa, če je nekdo v mail samo napisal tujo številko:
  // naročilo mora imeti pošiljateljev e-naslov, telefon ali polno ime.
  if (input.customerEmails && !orderMatchesContact(
    { emails: [order.customerEmail], phones: [order.customerPhone], names: [order.customerName] },
    { emails: input.customerEmails, phones: input.contact?.phones ?? [], names: input.contact?.names ?? [] },
  )) {
    return { reason: "email_mismatch" };
  }
  const by = input.by;
  try {
    const issue = await db.$transaction(async (tx) => {
      const created = await tx.issue.create({
        data: {
          key: `PENDING-${randomUUID()}`,
          orderNumber: order.orderNumber,
          orderNumberKey: orderNumberKey(order.orderNumber),
          // Sistemska politika: vrste ne ugibamo in ticket ne gre na prvi nivo,
          // ampak v sistemsko vrsto, dokler ga človek ne razvrsti in prevzame.
          type: SYSTEM_TYPE,
          status: "open",
          priority: priorityForPayment("medium", order.payment.brand),
          level: by ? by.level : SYSTEM_LEVEL,
          source: by ? "person" : "system",
          reporterId: by?.id ?? null,
          assigneeId: by?.id ?? null,
          title: input.subject.slice(0, 200) || null,
          ...issueFieldsFromOrder(order),
          // Kaj stranka hoče, Desk ne ve: rešitev izbere človek.
          items: { create: itemsFromOrder(order, PENDING_RESOLUTION) },
        },
      });
      const key = `KRJ-${created.id}`;
      await tx.issue.update({ where: { id: created.id }, data: { key } });
      await tx.event.create({
        data: by
          ? { issueId: created.id, kind: "created", field: "customer_email", body: "Ticket odprt iz pogovora v Prejeto.", authorId: by.id }
          : { issueId: created.id, kind: "created", field: "customer_email", body: "Ticket samodejno ustvarjen iz preverjenega e-poštnega sporočila." },
      });
      return { ...created, key };
    });
    return { issue };
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) throw error;
    const raced = await db.issue.findUnique({ where: { orderNumberKey: normalized } });
    return raced ? { issue: raced } : { reason: "order_not_found" };
  }
}

async function performSync() {
  if (!gmailConfigured()) return { synced: 0, skipped: 0, created: 0 };
  const startedAt = new Date();
  const state = await db.inboxSyncState.findUnique({ where: { id: SYNC_ID } });
  const after = state?.lastSyncedAt ? new Date(state.lastSyncedAt.getTime() - OVERLAP_MS) : null;
  let threads;
  try {
    threads = await getRecentInboxThreads({ after, maxMessages: 20 });
  } catch (error) {
    await db.inboxSyncState.upsert({
      where: { id: SYNC_ID },
      create: { id: SYNC_ID, lastError: error instanceof Error ? error.message.slice(0, 500) : "Gmail unavailable" },
      update: { lastError: error instanceof Error ? error.message.slice(0, 500) : "Gmail unavailable" },
    });
    throw error;
  }

  const result = await linkThreads(threads);
  await db.inboxSyncState.upsert({
    where: { id: SYNC_ID },
    create: { id: SYNC_ID, lastSyncedAt: startedAt, lastError: null },
    update: { lastSyncedAt: startedAt, lastError: null },
  });
  await backfillMessageCounts().catch((error) => console.error("Inbox message count backfill failed", error));
  await recheckUnlinked().catch((error) => console.error("Inbox unlinked recheck failed", error));
  await reopenClosedOnce().catch((error) => console.error("Inbox reopen of closed tickets failed", error));
  return result;
}

type LinkOutcome = "synced" | "skipped";

/**
 * Telefon in imena iz drugih mailov iste stranke. Stranka pogosto najprej
 * izpolni Shopifyjev kontaktni obrazec (tam sta telefon in polno ime), številko
 * naročila pa pošlje šele v ločenem odgovoru — z drugega naslova, kot ga ima
 * naročilo. Obrazec pride od Shopifyja, zato ga najde le iskanje po naslovu
 * stranke (isto kot okno pošte). Vrne tudi pogovore brez številke naročila, ki
 * jih je smiselno pripeti istemu ticketu.
 */
async function siblingContact(thread: GmailInboxThread): Promise<{ phones: string[]; names: string[]; unlinkedThreadIds: string[] }> {
  const email = thread.customerEmails[0];
  if (!email) return { phones: [], names: [], unlinkedThreadIds: [] };
  const conversation = await getEmailConversation({ customerEmail: email, customerName: null, orderNumber: "" }).catch(() => null);
  const phones = new Set<string>();
  const names = new Set<string>();
  for (const message of conversation?.messages ?? []) {
    if (message.direction !== "incoming") continue;
    const details = contactDetails(`${message.subject}
${message.body}`);
    details.phones.forEach((phone) => phones.add(phone));
    details.names.forEach((name) => names.add(name));
    const name = message.source === "customer" ? senderName(message.from) : null;
    if (name) names.add(name);
  }
  const rows = await db.inboxConversation.findMany({
    where: { customerEmail: { in: thread.customerEmails }, gmailThreadId: { not: thread.threadId }, issueId: null, unlinkedReason: "no_order" },
    select: { gmailThreadId: true },
  });
  return {
    phones: [...phones],
    names: [...names],
    unlinkedThreadIds: rows.map((row) => row.gmailThreadId),
  };
}

/**
 * Naročila pošiljatelja v Shopifyju: najprej po e-naslovu, sicer široko po
 * telefonu in imenu (kot Shopifyjev iskalnik). Zadetek šteje le, če se
 * naročilo res ujema s telefonom ali polnim imenom. Napaka Shopifyja ni
 * razlog za ugibanje.
 */
async function ordersForContact(contact: ContactIdentity): Promise<string[]> {
  const found = new Set<string>();
  for (const email of contact.emails.slice(0, 2)) {
    for (const order of await findOrderNumbersByEmail(email).catch(() => [])) found.add(order);
  }
  if (found.size > 0) return [...found];
  for (const term of [...contact.phones.slice(0, 2), ...contact.names.slice(0, 2)]) {
    const hits = await searchOrderContacts(term).catch(() => []);
    for (const hit of hits) if (orderMatchesContact(hit, { emails: [], phones: contact.phones, names: contact.names })) found.add(hit.orderNumber);
  }
  return [...found];
}

async function teamEmails(): Promise<Set<string>> {
  const users = await db.user.findMany({ where: { email: { not: null } }, select: { email: true } });
  return new Set(users.map((user) => user.email!.trim().toLowerCase()));
}

/**
 * Niti iz Gmaila poveže s ticketi (ali odpre ticket) in zapiše pogovor v
 * Prejeto. Isto pot uporabljata sinhronizacija in ponovni pregled mailov brez
 * ticketa. Notranja obvestila Deska ekipi niso pogovori s strankami.
 */
async function linkThreads(threads: GmailInboxThread[]) {
  const team = await teamEmails();
  for (const thread of threads) thread.customerEmails = thread.customerEmails.filter((email) => !team.has(email));

  const allEmails = [...new Set(threads.flatMap((thread) => thread.customerEmails))];
  const allNumbers = [...new Set(threads.flatMap((thread) => inboxOrderNumbers(threadText(thread.messages))))];
  const issues: LinkedIssue[] = await db.issue.findMany({
    where: { OR: [
      ...(allEmails.length ? [{ customerEmail: { in: allEmails } }] : []),
      ...(allNumbers.length ? [{ orderNumberKey: { in: allNumbers.map(orderNumberKey) } }] : []),
    ] },
    select: { id: true, orderNumber: true, customerEmail: true, customerName: true },
  });

  let synced = 0;
  let skipped = 0;
  let created = 0;
  for (const thread of threads) {
    try {
      const outcome = await linkThread(thread, issues);
      if (outcome.created) created++;
      if (outcome.result === "synced") synced++;
      else skipped++;
    } catch (error) {
      skipped++;
      console.error(`Inbox thread sync failed for ${thread.threadId}`, error);
    }
  }
  return { synced, skipped, created };
}

async function linkThread(thread: GmailInboxThread, issues: LinkedIssue[]): Promise<{ result: LinkOutcome; created: boolean }> {
  let created = false;
  const messages = thread.messages;
  const last = messages.at(-1);
  if (!last) return { result: "skipped", created };
  const text = threadText(messages);
  const existingConversation = await db.inboxConversation.findUnique({
    where: { gmailThreadId: thread.threadId },
    include: { issue: { select: { id: true, orderNumber: true, customerEmail: true, customerName: true } } },
  });
  let issue: LinkedIssue | null = existingConversation?.issue || null;
  let reason: UnlinkedReason | null = null;
  if (!issue) {
    const details = contactDetails(text);
    const senders = messages.filter((message) => message.direction === "incoming").flatMap((message) => senderName(message.from) ?? []);
    const contact: ContactIdentity = { emails: thread.customerEmails, phones: details.phones, names: [...new Set([...details.names, ...senders])] };
    const numbers = inboxOrderNumbers(text);
    const normalizedNumbers = numbers.map(orderNumberKey);
    const byNumber = issues.filter((candidate) => normalizedNumbers.includes(orderNumberKey(candidate.orderNumber)));
    const emailSet = new Set(thread.customerEmails);
    const byEmail = issues.filter((candidate) => candidate.customerEmail && emailSet.has(candidate.customerEmail.trim().toLowerCase()));
    issue = chooseInboxIssue(byNumber.length ? byNumber : byEmail, text);
    if (!issue && numbers.length === 1) {
      let opened = await openTicketForOrder(numbers[0]!, { customerEmails: thread.customerEmails, subject: last.subject, contact });
      let siblingThreads: string[] = [];
      if ("reason" in opened && opened.reason === "email_mismatch") {
        // Naslov se z naročilom ne ujema: poskusimo še s telefonom in imenom
        // iz drugih pogovorov iste stranke (npr. kontaktni obrazec).
        const extra = await siblingContact(thread);
        if (extra.phones.length || extra.names.length) {
          opened = await openTicketForOrder(numbers[0]!, {
            customerEmails: thread.customerEmails,
            subject: last.subject,
            contact: { phones: [...contact.phones, ...extra.phones], names: [...new Set([...contact.names, ...extra.names])] },
          });
          siblingThreads = extra.unlinkedThreadIds;
        }
      }
      if ("issue" in opened) {
        issue = opened.issue;
        issues.push(issue);
        created = true;
        // Pogovori iste stranke brez številke so o istem naročilu.
        if (siblingThreads.length) {
          await db.inboxConversation.updateMany({
            where: { gmailThreadId: { in: siblingThreads }, issueId: null },
            data: { issueId: issue.id, unlinkedReason: null },
          });
        }
      } else {
        reason = opened.reason;
      }
    } else if (!issue && numbers.length === 0 && byEmail.length === 0) {
      // Stranka številke ni napisala in ticketa še nima: če ima v Shopifyju
      // natanko eno naročilo, je mail o njem.
      const orders = await ordersForContact(contact);
      if (orders.length === 1) {
        const opened = await openTicketForOrder(orders[0]!, { customerEmails: thread.customerEmails, subject: last.subject, contact });
        if ("issue" in opened) {
          issue = opened.issue;
          issues.push(issue);
          created = true;
        } else {
          reason = opened.reason;
        }
      } else {
        reason = "no_order";
      }
    } else if (!issue) {
      reason = unlinkedReasonFor(numbers, byEmail.length);
    }
  }

  const subject = last.subject || messages.find((message) => message.subject)?.subject || "(brez zadeve)";
  const common = {
    subject,
    lastMessageId: last.id,
    lastMessageAt: new Date(last.sentAt),
    lastSnippet: snippet(last),
    lastDirection: last.direction,
    messageCount: thread.messageCount,
  };
  let data;
  if (issue && (issue.customerEmail || thread.customerEmails[0])) {
    // Naročilo brez e-naslova (npr. s Facebooka): ticket dobi naslov iz maila,
    // saj se je naročilo s pošiljateljem že ujemalo po telefonu ali imenu.
    let customerEmail = issue.customerEmail;
    if (!customerEmail) {
      customerEmail = thread.customerEmails[0]!;
      await db.issue.updateMany({ where: { id: issue.id, customerEmail: null }, data: { customerEmail } });
      issue.customerEmail = customerEmail;
    }
    data = { ...common, issueId: issue.id, unlinkedReason: null, customerEmail, customerName: issue.customerName };
  } else if (!issue && thread.customerEmails[0]) {
    // Mail brez ticketa ostane v Prejeto, v pogledu »Brez ticketa«.
    const incoming = messages.findLast((message) => message.direction === "incoming");
    data = {
      ...common,
      issueId: null,
      unlinkedReason: reason ?? "no_order",
      customerEmail: thread.customerEmails[0],
      customerName: incoming ? senderName(incoming.from) : null,
    };
  } else {
    return { result: "skipped", created };
  }

  if (!existingConversation) {
    await db.inboxConversation.create({ data: { gmailThreadId: thread.threadId, ...data, status: last.direction === "incoming" ? "open" : "waiting" } });
  } else {
    await db.inboxConversation.update({
      where: { id: existingConversation.id },
      data: { ...data, ...(existingConversation.lastMessageId !== last.id && last.direction === "incoming" ? { status: "open" } : {}) },
    });
  }
  // Nov mail stranke na ticket: zaprtega znova odpre, prevzemnika obvesti.
  if (data.issueId && last.direction === "incoming" && last.source === "customer" && existingConversation?.lastMessageId !== last.id) {
    await customerMailOnIssue(data.issueId, { sentAt: new Date(last.sentAt), snippet: common.lastSnippet });
  }
  return { result: "synced", created };
}

const REOPEN_ID = "reopen-closed-v1";

/** Enkrat: arhivirani ticketi z mailom stranke po zaprtju se znova odprejo. */
async function reopenClosedOnce() {
  const done = await db.inboxSyncState.findUnique({ where: { id: REOPEN_ID } });
  if (done?.lastSyncedAt) return;
  const reopened = await reopenClosedWithReplies();
  console.log(`[Inbox] Reopened ${reopened} closed ticket(s) with a customer mail after closing.`);
  await db.inboxSyncState.upsert({ where: { id: REOPEN_ID }, create: { id: REOPEN_ID, lastSyncedAt: new Date() }, update: { lastSyncedAt: new Date() } });
}

const RECHECK_ID = "unlinked-recheck-v7";

/**
 * Enkraten ponovni pregled mailov brez ticketa po spremembi povezovanja (v2:
 * beseda za »order« ni več številka; v3: brez številke pomaga edino naročilo
 * stranke v Shopifyju; v4: tudi po telefonu in imenu; v5: ticket brez
 * e-naslova dobi naslov iz maila; v6: telefon in ime tudi iz drugih pogovorov
 * iste stranke; v7: ista lastna domena naslova). Teče po sinhronizaciji,
 * dokler ne uspe.
 */
async function recheckUnlinked() {
  const done = await db.inboxSyncState.findUnique({ where: { id: RECHECK_ID } });
  if (done?.lastSyncedAt) return;
  const unlinked = await db.inboxConversation.findMany({ where: { issueId: null }, select: { gmailThreadId: true } });
  if (unlinked.length > 0) {
    const threads = await getInboxThreads(unlinked.map((row) => row.gmailThreadId));
    // Nobena nit ni prišla: Gmail je nedosegljiv, poskusimo ob naslednjem krogu.
    if (threads.length === 0) return;
    const result = await linkThreads(threads);
    const team = await teamEmails();
    // Obvestila Deska ekipi (npr. »Naročilo lahko gre iz ShipGermana«) niso pogovori.
    const internal = await db.inboxConversation.deleteMany({ where: { issueId: null, customerEmail: { in: [...team] } } });
    console.log(`[Inbox] Rechecked ${threads.length} unlinked conversation(s): ${result.created} ticket(s) opened, ${internal.count} internal removed.`);
  }
  await db.inboxSyncState.upsert({ where: { id: RECHECK_ID }, create: { id: RECHECK_ID, lastSyncedAt: new Date() }, update: { lastSyncedAt: new Date() } });
}

const BACKFILL_BATCH = 40;

/**
 * Pogovori iz časa pred štetjem mailov dobijo število postopoma, nekaj na krog
 * sinhronizacije — sicer bi razvrščanje po mailih starejše tickete postavilo
 * na dno. Nit, ki je Gmail ne vrne več (izbrisana), dobi nič, da ne blokira
 * vrste; če ne uspe nobena, je Gmail nedosegljiv in poskusimo naslednjič.
 */
async function backfillMessageCounts() {
  const pending = await db.inboxConversation.findMany({
    where: { messageCount: null },
    orderBy: { lastMessageAt: "desc" },
    take: BACKFILL_BATCH,
    select: { id: true, gmailThreadId: true },
  });
  if (pending.length === 0) return;
  const counts = await countThreadMessages(pending.map((conversation) => conversation.gmailThreadId));
  if (counts.size === 0) return;
  for (const conversation of pending) {
    await db.inboxConversation.update({
      where: { id: conversation.id },
      data: { messageCount: counts.get(conversation.gmailThreadId) ?? 0 },
    });
  }
}

export function syncInbox() {
  if (!running) running = performSync().finally(() => { running = null; });
  return running;
}
