import { customerEmailSubject, orderLabel, wrapCustomerLetter } from "./customer-email";

/**
 * Lastne predloge pisem. Predloga hrani samo sredino pisma po jezikih; nagovor
 * in podpis se dodata ob sestavljanju, "{order}" pa se zamenja s številko
 * naročila — tako ista predloga velja za vsako stranko.
 */

export type TemplateText = { subject: string; body: string };
export type TemplateTexts = Record<string, TemplateText>;
export type MailTemplateView = { id: number; name: string; texts: TemplateTexts };

export const MAX_TEMPLATE_BODY = 3_000;

/** Besedila iz baze ali obrazca: samo jeziki z besedilom, dolžine omejene. */
export function readTemplateTexts(value: unknown, languages?: string[]): TemplateTexts {
  let raw = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = {};
    }
  }
  const record = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const texts: TemplateTexts = {};
  for (const [code, entry] of Object.entries(record)) {
    if (!/^[a-z]{2}$/.test(code) || (languages && !languages.includes(code))) continue;
    const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const body = typeof item.body === "string" ? item.body.trim().slice(0, MAX_TEMPLATE_BODY) : "";
    if (!body) continue;
    const subject = typeof item.subject === "string" ? item.subject.trim().slice(0, 300) : "";
    texts[code] = { subject, body };
  }
  return texts;
}

/** Jezik, v katerem se pismo da sestaviti: želeni, sicer angleški, sicer prvi. */
export function templateLanguageFor(texts: TemplateTexts, wanted: string): string | null {
  if (texts[wanted]) return wanted;
  if (texts.en) return "en";
  return Object.keys(texts)[0] ?? null;
}

/** Pismo iz predloge v danem jeziku; null, kadar predloga tega jezika nima. */
export function templateLetter(
  texts: TemplateTexts,
  language: string,
  order: { customerName: string | null; orderNumber: string },
): { subject: string; body: string } | null {
  const text = texts[language];
  if (!text) return null;
  const label = orderLabel(order.orderNumber);
  const fillOrder = (value: string) => value.split("{order}").join(label);
  return {
    subject: text.subject ? fillOrder(text.subject) : customerEmailSubject("custom", language, order.orderNumber),
    body: wrapCustomerLetter(language, order.customerName, fillOrder(text.body).split("\n")),
  };
}
