"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserStrict, type SessionUser } from "../auth";
import { createExchangeShippedDraft, draftContentFor, rewriteDraftLanguage } from "../customer-draft";
import {
  customerLanguage,
  customerLanguageForReply,
  greetingFor,
  isCustomerLanguage,
  isDraftKind,
  languageName,
  signature,
  type CustomerLanguage,
  type DraftKind,
} from "../customer-email";
import { ensureCatalog } from "../catalog-server";
import { db } from "../db";
import { canAccessShipg } from "../domain";
import { deliverCustomerLetter } from "../customer-send";
import { getEmailConversation, GmailError } from "../gmail";
import { draftCustomerEmail, draftCustomerReply, aiConfigured, GroqError, reviseCustomerEmail, type EmailSummaryOrder } from "../groq";
import { readTemplateTexts, templateLanguageFor, templateLetter } from "../mail-template";
import { translateDraftToEnglish, type CheckTranslation } from "../translation";

async function draftContext(fd: FormData) {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  await ensureCatalog();
  const id = Number(fd.get("draftId"));
  const draft = Number.isInteger(id) && id > 0
    ? await db.customerEmailDraft.findUnique({ where: { id }, include: { issue: { select: { key: true } } } })
    : null;
  if (!draft) redirect("/orders");
  return { me, draft };
}

async function issueContext(issueId: unknown) {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  // Pisma in jeziki pridejo iz šifranta jezikov.
  await ensureCatalog();
  const id = Number(issueId);
  const issue = Number.isInteger(id) && id > 0
    ? await db.issue.findUnique({ where: { id }, include: { items: { orderBy: { position: "asc" } } } })
    : null;
  return { me, issue };
}

function back(key: string, result: string): never {
  revalidatePath(`/orders/${key}`);
  redirect(`/orders/${encodeURIComponent(key)}?draft=${result}`);
}

const failure = (error: unknown) => (error instanceof GmailError ? `error_${error.code}` : "error");

/**
 * Pošlje pregledano pismo stranki iz povezanega Gmail nabiralnika. Besedilo
 * vzamemo iz obrazca, ne iz baze — poslati je treba natanko tisto, kar je imel
 * pregledovalec pred očmi, in prav to se shrani kot zapis o poslanem.
 */
export async function sendCustomerEmailDraft(fd: FormData): Promise<void> {
  const { me, draft } = await draftContext(fd);
  if (draft.status !== "draft") back(draft.issue.key, "gone");

  const edited = fd.get("body");
  const body = (typeof edited === "string" ? edited : draft.body).trim();
  if (!body) back(draft.issue.key, "empty");

  try {
    await deliverCustomerLetter(draft, body, me);
  } catch (error) {
    console.error("Customer email send failed", error);
    back(draft.issue.key, failure(error));
  }
  back(draft.issue.key, "sent");
}

export async function discardCustomerEmailDraft(fd: FormData): Promise<void> {
  const { me, draft } = await draftContext(fd);
  if (draft.status !== "draft") back(draft.issue.key, "gone");
  await db.$transaction([
    db.customerEmailDraft.update({ where: { id: draft.id }, data: { status: "discarded" } }),
    db.event.create({
      data: { issueId: draft.issueId, kind: "system", field: "customer_email", toValue: "discarded", authorId: me.id },
    }),
  ]);
  back(draft.issue.key, "discarded");
}

/**
 * Zamenjava jezika osnutek napiše na novo — vključno z morebitnimi popravki,
 * zato je gumb v vmesniku označen kot ponovni zapis.
 *
 * Jezik je vezan na akcijo in ne polje obrazca: React pri `formAction` gumbu
 * prepiše `name`, zato vrednost submit gumba do strežnika sploh ne pride.
 */
export async function setCustomerEmailDraftLanguage(language: string, fd: FormData): Promise<void> {
  const { draft } = await draftContext(fd);
  const ok = await rewriteDraftLanguage(draft.id, language);
  back(draft.issue.key, ok ? "language" : "gone");
}

/**
 * Sestavi pismo za menjavo, ki je bila označena kot poslana, a osnutka nima —
 * ker je bila odpremljena, preden je ta funkcija obstajala, ali ker je bil
 * osnutek zavržen. Ista predloga, ista pot pregleda; le sprožilec je človek.
 */
export async function composeCustomerEmailDraft(fd: FormData): Promise<void> {
  const { me, issue } = await issueContext(fd.get("issueId"));
  if (!issue) redirect("/orders");
  const created = await createExchangeShippedDraft(issue, me.id);
  back(issue.key, created ? "composed" : "composeFailed");
}

export type DraftPreview = { subject: string; body: string; language: CustomerLanguage };

/** Besedilo za izbrano vrsto pisma — vrne se v okno, kjer ga človek popravi. */
export async function previewCustomerEmail(issueId: number, kind: string, language: string): Promise<DraftPreview | null> {
  const { issue } = await issueContext(issueId);
  if (!issue || !isDraftKind(kind)) return null;
  const chosen: CustomerLanguage = isCustomerLanguage(language) ? language : customerLanguage(issue.customerCountryCode);
  return { ...draftContentFor(issue, kind, chosen), language: chosen };
}

export type TemplatePreview = DraftPreview & {
  /** Jezik, ki ga je človek želel, a ga predloga še nima (pismo je v `language`). */
  missing: CustomerLanguage | null;
};

/** Pismo iz lastne predloge za to naročilo. */
export async function previewTemplateEmail(issueId: number, templateId: number, language: string): Promise<TemplatePreview | null> {
  const { issue } = await issueContext(issueId);
  const row = issue && Number.isInteger(templateId) && templateId > 0
    ? await db.mailTemplate.findUnique({ where: { id: templateId } })
    : null;
  if (!issue || !row) return null;
  const texts = readTemplateTexts(row.texts);
  const wanted: CustomerLanguage = isCustomerLanguage(language) ? language : customerLanguage(issue.customerCountryCode);
  const used = templateLanguageFor(texts, wanted);
  const letter = used ? templateLetter(texts, used, issue) : null;
  if (!used || !letter) return null;
  return { ...letter, language: used, missing: used === wanted ? null : wanted };
}

export type AiDraftResult = { ok: true; body: string } | { ok: false; error: string };

/** Podatki naročila za AI; pri menjavi šteje tisto, kar stranka dobi. */
function orderForAi(
  issue: NonNullable<Awaited<ReturnType<typeof issueContext>>["issue"]>,
  parcels: EmailSummaryOrder["parcels"] = [],
): EmailSummaryOrder {
  return {
    orderNumber: issue.orderNumber,
    customerName: issue.customerName,
    customerEmail: issue.customerEmail ?? "",
    title: issue.title,
    type: issue.type,
    status: issue.status,
    amount: issue.amount,
    currency: issue.currency,
    paymentMethod: issue.paymentMethod,
    items: issue.items.map((item) => ({
      // Pri menjavi šteje tisto, kar stranka dobi — tudi kadar je to drug izdelek.
      name: (item.replacementVariant && item.replacementName) || item.name,
      variant: item.replacementVariant ?? item.variant,
      qty: item.qty,
      amount: item.amount,
      resolution: item.resolution,
    })),
    parcels,
  };
}

/**
 * Popravi že napisano pismo po navodilu (»zamenjaj pozdrav«, »dodaj tracking«).
 * Vrne celo pismo; kot vsak osnutek gre nazaj v okno in nikamor sam.
 */
export async function aiReviseCustomerEmail(issueId: number, language: string, body: string, instruction: string): Promise<AiDraftResult> {
  const { issue } = await issueContext(issueId);
  if (!issue) return { ok: false, error: "gone" };
  if (!aiConfigured()) return { ok: false, error: "ai_not_configured" };
  const text = instruction.trim().slice(0, 1_000);
  if (!text) return { ok: false, error: "ai_no_instruction" };
  const letter = String(body ?? "").trim().slice(0, 4_000);
  if (!letter) return { ok: false, error: "ai_no_body" };

  const chosen: CustomerLanguage = isCustomerLanguage(language) ? language : customerLanguage(issue.customerCountryCode);
  try {
    const revised = await reviseCustomerEmail({ order: orderForAi(issue), language: languageName(chosen), body: letter, instruction: text });
    return { ok: true, body: revised };
  } catch (error) {
    console.error("AI email revision failed", error);
    return { ok: false, error: error instanceof GroqError ? `ai_${error.code}` : "ai_unavailable" };
  }
}

export type AiReplyResult = { ok: true; body: string; language: CustomerLanguage } | { ok: false; error: string };

/**
 * Odgovor na pošto tega naročila: model prebere celo nit, podatke naročila in
 * hišna pravila ter napiše naslednje pismo. Kot vsak osnutek se samo vrne v
 * okno »Mail osnutki« — odide šele, ko ga človek pregleda in pošlje.
 *
 * Brez izbranega jezika (`language` null) odgovori v jeziku, v katerem je
 * stranka zadnja pisala; to je bolj zanesljivo od države na naslovu.
 */
export async function aiReplyCustomerEmail(issueId: number, language: string | null, instruction: string): Promise<AiReplyResult> {
  const { issue } = await issueContext(issueId);
  if (!issue) return { ok: false, error: "gone" };
  if (!issue.customerEmail) return { ok: false, error: "ai_no_email" };
  if (!aiConfigured()) return { ok: false, error: "ai_not_configured" };

  try {
    const [threads, parcels] = await Promise.all([
      db.inboxConversation.findMany({ where: { issueId: issue.id }, select: { gmailThreadId: true } }),
      db.parcel.findMany({ where: { issueId: issue.id }, orderBy: { createdAt: "asc" }, select: { number: true, direction: true, state: true, providerStatus: true } }),
    ]);
    const conversation = await getEmailConversation({
      customerEmail: issue.customerEmail,
      customerName: issue.customerName,
      orderNumber: issue.orderNumber,
      threadIds: threads.map((thread) => thread.gmailThreadId),
    });
    if (conversation.messages.length === 0) return { ok: false, error: "ai_no_messages" };

    const chosen: CustomerLanguage = language && isCustomerLanguage(language)
      ? language
      : customerLanguageForReply(conversation.messages, issue.customerCountryCode);
    const body = await draftCustomerReply({
      messages: conversation.messages,
      order: orderForAi(issue, parcels),
      language: languageName(chosen),
      greeting: greetingFor(chosen, issue.customerName),
      signature: signature(chosen),
      instruction: instruction.trim().slice(0, 800),
    });
    return { ok: true, body, language: chosen };
  } catch (error) {
    console.error("AI reply draft failed", error);
    if (error instanceof GmailError) return { ok: false, error: "ai_mail" };
    return { ok: false, error: error instanceof GroqError ? `ai_${error.code}` : "ai_unavailable" };
  }
}

/**
 * Pismo, ki ga po navodilu zaposlenega napiše model. Rezultat je osnutek kot
 * vsak drug — vrne se v okno in gre skozi isti pregled; sam nikoli ne odide.
 */
/**
 * Prevod pisma v angleščino — samo za pogled.
 *
 * Vrne besedilo ločeno; nikamor se ne zapiše in v pismo, ki gre stranki, ne
 * poseže. Pismo se še vedno pošlje v jeziku, ki je izbran zgoraj.
 */
export async function translateDraftForCheck(text: string): Promise<CheckTranslation> {
  await requireUserStrict();
  return translateDraftToEnglish(String(text ?? "").slice(0, 5_000));
}

export async function aiDraftCustomerEmail(issueId: number, language: string, instruction: string): Promise<AiDraftResult> {
  const { issue } = await issueContext(issueId);
  if (!issue) return { ok: false, error: "gone" };
  if (!aiConfigured()) return { ok: false, error: "ai_not_configured" };
  const text = instruction.trim().slice(0, 1_000);
  if (!text) return { ok: false, error: "ai_no_instruction" };

  const chosen: CustomerLanguage = isCustomerLanguage(language) ? language : customerLanguage(issue.customerCountryCode);
  try {
    const body = await draftCustomerEmail({
      order: orderForAi(issue),
      language: languageName(chosen),
      instruction: text,
      greeting: greetingFor(chosen, issue.customerName),
      signature: signature(chosen),
    });
    return { ok: true, body };
  } catch (error) {
    console.error("AI email draft failed", error);
    return { ok: false, error: error instanceof GroqError ? `ai_${error.code}` : "ai_unavailable" };
  }
}

export type ComposedSendResult = { ok: true } | { ok: false; error: string };

/**
 * Pošlje pismo, sestavljeno v oknu Pošta. Zapis nastane šele tu — dokler se
 * človek premišljuje, v bazi ni ničesar.
 *
 * Ne preusmeri: okno ostane odprto, nit se osveži in poslano pismo se v njej
 * pokaže. Napaka se vrne kot ključ (draft.feedback.<ključ>), besedilo pa
 * ostane v oknu, da ga je mogoče poslati znova.
 */
export async function sendComposedCustomerEmail(fd: FormData): Promise<ComposedSendResult> {
  const { me, issue } = await issueContext(fd.get("issueId"));
  if (!issue) return { ok: false, error: "gone" };
  if (!issue.customerEmail) return { ok: false, error: "noEmail" };

  const rawKind = fd.get("kind");
  const kind: DraftKind = isDraftKind(typeof rawKind === "string" ? rawKind : null) ? (rawKind as DraftKind) : "custom";
  const rawLanguage = fd.get("language");
  const language: CustomerLanguage = isCustomerLanguage(typeof rawLanguage === "string" ? rawLanguage : null)
    ? (rawLanguage as CustomerLanguage)
    : customerLanguage(issue.customerCountryCode);

  const rawBody = fd.get("body");
  const body = (typeof rawBody === "string" ? rawBody : "").trim().slice(0, 4_000);
  if (!body) return { ok: false, error: "empty" };

  // Pismo iz lastne predloge nosi njeno zadevo (velja le, kadar niti še ni).
  const templateId = Number(fd.get("templateId"));
  const template = Number.isInteger(templateId) && templateId > 0
    ? await db.mailTemplate.findUnique({ where: { id: templateId } })
    : null;
  const subject = (template ? templateLetter(readTemplateTexts(template.texts), language, issue)?.subject : null)
    ?? draftContentFor(issue, kind, language).subject;

  const draft = await db.customerEmailDraft.create({
    data: {
      issueId: issue.id,
      kind,
      language,
      toEmail: issue.customerEmail,
      subject,
      body,
      createdById: me.id,
    },
  });

  try {
    await deliverCustomerLetter(draft, body, me);
  } catch (error) {
    console.error("Composed email send failed", error);
    // Neposlan zapis bi se kopičil kot osnutek, ki ga nihče ni napisal; besedilo
    // ostane v oknu, zato ga ni treba hraniti.
    await db.customerEmailDraft.delete({ where: { id: draft.id } }).catch(() => {});
    return { ok: false, error: failure(error) };
  }
  revalidatePath(`/orders/${issue.key}`);
  return { ok: true };
}
