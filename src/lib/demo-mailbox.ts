import "server-only";

import { randomBytes } from "node:crypto";

import { db } from "./db";
import type { EmailConversation, EmailConversationMessage, GmailInboxThread, GmailReplyTarget } from "./gmail";

/**
 * Izmišljen nabiralnik za kopijo za faks.
 *
 * V testnem načinu Gmail ni dosegljiv, zato gmail.ts vse branje in pošiljanje
 * preusmeri sem: sporočila živijo v tabeli DemoMail (napolni jih prisma/seed.ts).
 * Odgovor, poslan iz Deska, se zapiše kot odhodno sporočilo v isto nit — nikamor
 * ne odide, v pogovoru pa se pokaže kot pravi.
 */

export const DEMO_ACCOUNT = "podpora@kroj.example";

type Row = {
  id: string;
  threadId: string;
  sentAt: Date;
  fromAddr: string;
  toAddr: string;
  subject: string;
  body: string;
  direction: string;
};

const addresses = (value: string) =>
  [...value.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((match) => match[0]!.toLowerCase());

function toMessage(row: Row): EmailConversationMessage {
  return {
    id: row.id,
    threadId: row.threadId,
    sentAt: row.sentAt.toISOString(),
    from: row.fromAddr,
    to: row.toAddr,
    subject: row.subject,
    body: row.body,
    source: "customer",
    direction: row.direction === "outgoing" ? "outgoing" : "incoming",
    attachments: [],
  };
}

const byTime = (a: Row, b: Row) => a.sentAt.getTime() - b.sentAt.getTime() || a.id.localeCompare(b.id);

/** Niti, v katerih stranka nastopa (kot pošiljatelj ali prejemnik). */
async function threadsOf(customerEmail: string): Promise<string[]> {
  const email = customerEmail.trim().toLowerCase();
  if (!email) return [];
  const rows = await db.demoMail.findMany({
    where: { OR: [{ fromAddr: { contains: email } }, { toAddr: { contains: email } }] },
    select: { threadId: true },
  });
  return [...new Set(rows.map((row) => row.threadId))];
}

export async function demoConversation(input: { customerEmail: string; threadIds?: string[] }): Promise<EmailConversation> {
  const threadIds = [...new Set([...(input.threadIds ?? []), ...(await threadsOf(input.customerEmail))])];
  const rows = threadIds.length ? await db.demoMail.findMany({ where: { threadId: { in: threadIds } } }) : [];
  return { account: DEMO_ACCOUNT, messages: rows.sort(byTime).map(toMessage), truncated: false };
}

export async function demoThread(threadId: string): Promise<EmailConversation> {
  const rows = await db.demoMail.findMany({ where: { threadId } });
  return { account: DEMO_ACCOUNT, messages: rows.sort(byTime).map(toMessage), truncated: false };
}

async function readThreads(threadIds: string[]): Promise<GmailInboxThread[]> {
  if (threadIds.length === 0) return [];
  const rows = await db.demoMail.findMany({ where: { threadId: { in: threadIds } } });
  const grouped = new Map<string, Row[]>();
  for (const row of rows) grouped.set(row.threadId, [...(grouped.get(row.threadId) ?? []), row]);
  return [...grouped.entries()].map(([threadId, list]) => {
    const sorted = list.sort(byTime);
    const customers = new Set<string>();
    for (const row of sorted) {
      for (const email of addresses(row.direction === "incoming" ? row.fromAddr : row.toAddr)) {
        if (email !== DEMO_ACCOUNT) customers.add(email);
      }
    }
    return { threadId, messageCount: sorted.length, messages: sorted.map(toMessage), customerEmails: [...customers] };
  });
}

export async function demoRecentThreads(after?: Date | null): Promise<GmailInboxThread[]> {
  const since = after ?? new Date(Date.now() - 30 * 86_400_000);
  const rows = await db.demoMail.findMany({ where: { sentAt: { gt: since } }, select: { threadId: true } });
  return readThreads([...new Set(rows.map((row) => row.threadId))]);
}

export const demoInboxThreads = readThreads;

export async function demoCountMessages(threadIds: string[]): Promise<Map<string, number>> {
  const rows = await db.demoMail.groupBy({ by: ["threadId"], where: { threadId: { in: threadIds } }, _count: { _all: true } });
  return new Map(rows.map((row) => [row.threadId, row._count._all]));
}

export async function demoHasReplySince(customerEmail: string, since: Date): Promise<boolean> {
  const email = customerEmail.trim().toLowerCase();
  return Boolean(await db.demoMail.findFirst({ where: { direction: "incoming", fromAddr: { contains: email }, sentAt: { gt: since } } }));
}

async function target(where: { threadId?: string; customerEmail?: string }): Promise<GmailReplyTarget | null> {
  const email = where.customerEmail?.trim().toLowerCase();
  const latest = await db.demoMail.findFirst({
    where: where.threadId
      ? { threadId: where.threadId }
      : { OR: [{ fromAddr: { contains: email } }, { toAddr: { contains: email } }] },
    orderBy: { sentAt: "desc" },
  });
  return latest ? { threadId: latest.threadId, inReplyTo: `<${latest.id}@kroj.example>`, subject: latest.subject } : null;
}

export const demoReplyTarget = (customerEmail: string) => target({ customerEmail });
export const demoThreadReplyTarget = (threadId: string) => target({ threadId });

/** "Pošlje" pismo: zapiše ga kot odhodno sporočilo, v isto nit ali v novo. */
export async function demoSend(input: { to: string; subject: string; body: string; threadId?: string | null }) {
  const id = `demo-${randomBytes(6).toString("hex")}`;
  const threadId = input.threadId || `demo-t-${randomBytes(5).toString("hex")}`;
  await db.demoMail.create({
    data: {
      id,
      threadId,
      sentAt: new Date(),
      fromAddr: `Kroj podpora <${DEMO_ACCOUNT}>`,
      toAddr: input.to,
      subject: input.subject,
      body: input.body,
      direction: "outgoing",
    },
  });
  return { id, threadId };
}
