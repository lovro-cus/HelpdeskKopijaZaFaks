"use server";

import { revalidatePath } from "next/cache";

import { requireUserStrict } from "../auth";
import {
  BULK_MAIL_LIMIT,
  fillOrderToken,
  isBulkMailKind,
  planBulkMail,
  type BulkMailKind,
  type MailCandidate,
} from "../bulk-mail";
import {
  customerEmailMiddle,
  customerEmailSubject,
  isCustomerLanguage,
  languageName,
  wrapCustomerLetter,
  type CustomerLanguage,
} from "../customer-email";
import { ensureCatalog } from "../catalog-server";
import { deliverCustomerLetter } from "../customer-send";
import { db } from "../db";
import { canAccessShipg } from "../domain";
import { gmailConfigured, GmailError } from "../gmail";
import { aiConfigured, GroqError, translateCustomerText } from "../groq";
import { t } from "../i18n/server";

const CANDIDATE_SELECT = {
  id: true,
  key: true,
  orderNumber: true,
  customerName: true,
  customerEmail: true,
  customerCountryCode: true,
} as const;

async function candidates(issueIds: number[]): Promise<MailCandidate[]> {
  const ids = [...new Set(issueIds.map(Number))].filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) return [];
  const rows = await db.issue.findMany({
    where: { id: { in: ids.slice(0, 300) } },
    orderBy: { createdAt: "asc" },
    select: CANDIDATE_SELECT,
  });
  return rows;
}

export type BulkMailGroup = {
  language: CustomerLanguage;
  count: number;
  /** Nekaj številk naročil, da se v pregledu vidi, kdo je v skupini. */
  orders: string[];
  subject: string;
  body: string;
};

export type BulkMailPlan = {
  kind: BulkMailKind;
  groups: BulkMailGroup[];
  total: number;
  noEmail: number;
  repeatedAddresses: number;
  overLimit: boolean;
  gmailReady: boolean;
  aiReady: boolean;
};

/**
 * Kdo dobi pismo, v katerem jeziku in s kakšnim besedilom — preden karkoli
 * odide. Predloga se izpiše, dokler je vrsta pisma znana; pri lastnem besedilu
 * je sredina prazna in jo napiše človek.
 */
export async function planBulkMailAction(issueIds: number[], kindRaw: string): Promise<BulkMailPlan> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  await ensureCatalog();

  const kind: BulkMailKind = isBulkMailKind(kindRaw) ? kindRaw : "custom";
  const plan = planBulkMail(await candidates(issueIds));

  const groups: BulkMailGroup[] = plan.groups.map((group) => ({
    language: group.language,
    count: group.recipients.length,
    orders: group.recipients.slice(0, 6).map((recipient) => recipient.orderNumber),
    // Zadeva nosi oznako namesto številke: vsak prejemnik dobi svojo.
    subject: customerEmailSubject(kind, group.language, "{order}"),
    body: kind === "custom" ? "" : customerEmailMiddle(kind, group.language).join("\n").trim(),
  }));

  const total = plan.groups.reduce((sum, group) => sum + group.recipients.length, 0);
  return {
    kind,
    groups,
    total,
    noEmail: plan.noEmail.length,
    repeatedAddresses: plan.repeatedAddresses,
    overLimit: total > BULK_MAIL_LIMIT,
    gmailReady: gmailConfigured(),
    aiReady: aiConfigured(),
  };
}

export type TranslateResult =
  | { ok: true; subject: string; body: string }
  | { ok: false; error: string };

/**
 * Prevod besedila v jezik druge skupine. Rezultat pristane v oknu ob izvirniku
 * — pregled ostane človekov, ker gre pismo navzven z imenom podjetja.
 */
export async function translateBulkMail(
  fromRaw: string,
  toRaw: string,
  subject: string,
  body: string,
): Promise<TranslateResult> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  await ensureCatalog();
  if (!isCustomerLanguage(fromRaw) || !isCustomerLanguage(toRaw)) return { ok: false, error: "ai_unavailable" };
  if (!aiConfigured()) return { ok: false, error: "ai_not_configured" };
  const text = body.trim();
  if (!text) return { ok: false, error: "empty" };

  try {
    const translated = await translateCustomerText({
      from: languageName(fromRaw),
      to: languageName(toRaw),
      subject: subject.trim(),
      body: text,
    });
    return { ok: true, ...translated };
  } catch (error) {
    console.error("Bulk mail translation failed", error);
    return { ok: false, error: error instanceof GroqError ? `ai_${error.code}` : "ai_unavailable" };
  }
}

export type BulkMailState = {
  error?: string;
  ok?: boolean;
  /** Koliko pisem je odšlo in katera naročila so ostala brez. */
  sent?: number;
  failed?: string[];
};

/**
 * Pošlje pregledano pismo vsem izbranim — vsakemu v njegovem jeziku, z njegovo
 * številko naročila, z nagovorom na njegovo ime.
 *
 * Skupine se preračunajo tu in ne prevzamejo iz obrazca: kdo je v kateri
 * skupini, odloči baza, sicer bi bila razporeditev prejemnikov stvar tega, kar
 * pride z brskalnikom.
 */
export async function sendBulkMail(_prev: BulkMailState, fd: FormData): Promise<BulkMailState> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) return { error: t(me.locale, "error.forbidden") };
  if (!gmailConfigured()) return { error: t(me.locale, "bulkMail.error.gmail") };
  await ensureCatalog();

  const kindRaw = fd.get("kind");
  const kind: BulkMailKind = isBulkMailKind(typeof kindRaw === "string" ? kindRaw : null)
    ? (kindRaw as BulkMailKind)
    : "custom";

  const ids = fd.getAll("issueId").map(Number);
  const plan = planBulkMail(await candidates(ids));
  const total = plan.groups.reduce((sum, group) => sum + group.recipients.length, 0);
  if (total === 0) return { error: t(me.locale, "bulkMail.error.noRecipients") };
  if (total > BULK_MAIL_LIMIT) {
    return { error: t(me.locale, "bulkMail.error.tooMany", { limit: BULK_MAIL_LIMIT }) };
  }

  // Besedilo mora biti za vsak jezik v kupu; polovično poslana obvestila so
  // slabša od nobenega.
  const texts = new Map<CustomerLanguage, { subject: string; body: string }>();
  for (const group of plan.groups) {
    const subject = String(fd.get(`subject:${group.language}`) ?? "").trim().slice(0, 300);
    const body = String(fd.get(`body:${group.language}`) ?? "").trim().slice(0, 4_000);
    if (!subject || !body) return { error: t(me.locale, "bulkMail.error.missingText") };
    texts.set(group.language, { subject, body });
  }

  const failed: string[] = [];
  let sent = 0;

  for (const group of plan.groups) {
    const text = texts.get(group.language)!;
    for (const recipient of group.recipients) {
      const subject = fillOrderToken(text.subject, recipient.orderNumber);
      const body = wrapCustomerLetter(
        group.language,
        recipient.customerName,
        fillOrderToken(text.body, recipient.orderNumber).split("\n"),
      );

      // Zapis nastane pred oddajo, da ima pismo svoj ID tudi, če Gmail odpove;
      // neposlanega potem pospravimo, ker osnutka ni nihče pisal.
      const draft = await db.customerEmailDraft.create({
        data: {
          issueId: recipient.id,
          kind,
          language: group.language,
          toEmail: recipient.customerEmail,
          subject,
          body,
          createdById: me.id,
        },
      });

      try {
        // Skupinsko pismo se sme pripeti samo niti istega ticketa. Če je ni,
        // začne novo nit; iskanje zgolj po naslovu bi pri dveh naročilih iste
        // stranke obe pismi zložilo v isti pogovor.
        const inbox = await db.inboxConversation.findFirst({
          where: { issueId: recipient.id },
          orderBy: { lastMessageAt: "desc" },
          select: { gmailThreadId: true },
        });
        await deliverCustomerLetter(draft, body, me, { threadId: inbox?.gmailThreadId ?? null });
        sent += 1;
      } catch (error) {
        console.error("Bulk mail send failed", recipient.orderNumber, error);
        await db.customerEmailDraft.delete({ where: { id: draft.id } }).catch(() => {});
        failed.push(recipient.orderNumber);
        // Gmail, ki nas je ustavil, ne bo pri naslednjem pismu bolj pri volji.
        if (error instanceof GmailError && error.code === "not_configured") break;
      }
    }
  }

  revalidatePath("/orders");
  if (sent === 0) return { error: t(me.locale, "bulkMail.error.allFailed") };
  return { ok: true, sent, failed };
}
