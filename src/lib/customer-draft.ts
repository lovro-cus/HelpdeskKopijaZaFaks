import "server-only";

import {
  customerEmailDraft,
  customerLanguage,
  exchangeShippedDraft,
  isCustomerLanguage,
  type CustomerLanguage,
  type DraftContent,
  type DraftKind,
  type ExchangeLine,
} from "./customer-email";
import { db } from "./db";

export const EXCHANGE_SHIPPED = "exchangeShipped";

type DraftIssue = {
  id: number;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  customerCountryCode: string | null;
  items: { name: string; variant?: string | null; replacementVariant: string | null; replacementName?: string | null; qty: number; resolution: string }[];
};

/** Artikli, ki jih je stranka dejansko dobila kot nadomestek. */
export function exchangeLines(items: DraftIssue["items"]): ExchangeLine[] {
  return items
    .filter((item) => item.resolution === "exchange")
    .map((item) => ({ qty: item.qty, name: item.replacementName || item.name, variant: item.replacementVariant }));
}

/**
 * Kateri artikli spadajo v pismo, je odvisno od tega, kaj pismo sprašuje:
 * obvestilo o odpremi našteje NADOMESTKE (kar je odšlo), vprašanje o velikosti
 * pa artikle TAKE, KOT JIH STRANKA IMA — sicer bi jo vprašali po velikosti in ji
 * hkrati povedali, katero smo že izbrali.
 */
export function linesForKind(kind: DraftKind, items: DraftIssue["items"]): ExchangeLine[] {
  if (kind === "exchangeShipped") return exchangeLines(items);
  if (kind === "whichSize") {
    const exchanged = items.filter((item) => item.resolution === "exchange");
    return (exchanged.length > 0 ? exchanged : items)
      .map((item) => ({ qty: item.qty, name: item.name, variant: item.variant ?? null }));
  }
  return [];
}

/** Besedilo pisma za dano vrsto in jezik — en vir za predogled in za pošiljanje. */
export function draftContentFor(issue: DraftIssue, kind: DraftKind, language: CustomerLanguage): DraftContent {
  return customerEmailDraft({
    kind,
    language,
    customerName: issue.customerName,
    orderNumber: issue.orderNumber,
    lines: linesForKind(kind, issue.items),
  });
}

/**
 * Številke za sledenje nadomestka tekočega kroga — kar smo vpisali kot pošiljko
 * k stranki (npr. tracking, ki ga je vrnil dobavitelj).
 */
export async function replacementTrackings(issueId: number): Promise<string[]> {
  const issue = await db.issue.findUnique({ where: { id: issueId }, select: { exchangeRound: true } });
  if (!issue) return [];
  const parcels = await db.parcel.findMany({
    where: { issueId, direction: "replacement", exchangeRound: issue.exchangeRound },
    orderBy: { id: "asc" },
    select: { number: true },
  });
  return parcels.map((parcel) => parcel.number);
}

/**
 * Sestavi osnutek pisma stranki ob odpremi nadomestka. Vrne null, kadar pisma
 * ni komu poslati ali ni česa sporočiti — tiho, ker je to spremljevalec odpreme
 * in odpreme same ne sme ustaviti.
 */
export async function createExchangeShippedDraft(
  issue: DraftIssue,
  authorId: string | null,
  /** Odprema se je začela takrat (npr. zahteva pri dobavitelju): pismo pred tem ni dvojnik. */
  since?: Date,
): Promise<number | null> {
  if (!issue.customerEmail) return null;
  const lines = exchangeLines(issue.items);
  if (lines.length === 0) return null;

  // Dvojnik bi pomenil dve pismi za isto odpremo; obstoječ osnutek je že v pregledu.
  // Vsak krog menjave ima svojo odpremo, zato pismo prejšnjega kroga ni dvojnik.
  const round = await db.exchangeRound.findFirst({
    where: { issueId: issue.id },
    orderBy: { number: "desc" },
    select: { createdAt: true },
  });
  const existing = await db.customerEmailDraft.findFirst({
    where: {
      issueId: issue.id,
      kind: EXCHANGE_SHIPPED,
      status: { in: ["draft", "sent"] },
      ...(round || since
        ? { createdAt: { gte: new Date(Math.max(round?.createdAt.getTime() ?? 0, since?.getTime() ?? 0)) } }
        : {}),
    },
    select: { id: true },
  });
  if (existing) return null;

  const language = customerLanguage(issue.customerCountryCode);
  const { subject, body } = exchangeShippedDraft({
    language,
    customerName: issue.customerName,
    orderNumber: issue.orderNumber,
    lines,
    trackings: await replacementTrackings(issue.id),
  });

  const draft = await db.customerEmailDraft.create({
    data: {
      issueId: issue.id,
      kind: EXCHANGE_SHIPPED,
      language,
      toEmail: issue.customerEmail,
      subject,
      body,
      createdById: authorId,
    },
    select: { id: true },
  });
  return draft.id;
}

/** Zamenja jezik osnutka in besedilo napiše na novo. */
export async function rewriteDraftLanguage(draftId: number, next: string): Promise<boolean> {
  if (!isCustomerLanguage(next)) return false;
  const draft = await db.customerEmailDraft.findUnique({
    where: { id: draftId },
    select: { status: true, issueId: true, issue: { select: { orderNumber: true, customerName: true, items: true } } },
  });
  if (!draft || draft.status !== "draft") return false;

  const { subject, body } = exchangeShippedDraft({
    language: next as CustomerLanguage,
    customerName: draft.issue.customerName,
    orderNumber: draft.issue.orderNumber,
    lines: exchangeLines(draft.issue.items),
    trackings: await replacementTrackings(draft.issueId),
  });
  await db.customerEmailDraft.update({ where: { id: draftId }, data: { language: next, subject, body } });
  return true;
}
