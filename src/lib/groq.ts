import "server-only";

import type { EmailSummary } from "./email-summary";
import type { EmailConversationMessage } from "./gmail";
import type { Locale } from "./i18n/shared";
import type { SatisfactionResult } from "./satisfaction";

/**
 * Pomoč umetne inteligence (povzetek pošte, osnutki odgovorov, ocena
 * zadovoljstva, prevodi).
 *
 * Kopija za faks nima ponudnika AI: vse funkcije javijo "ni nastavljeno", ostala
 * koda pa to že obravnava (gumbov za AI ni, ocene zadovoljstva so izmišljene).
 */

export type { EmailSummary } from "./email-summary";

export type EmailSummaryOrder = {
  orderNumber: string;
  customerName: string | null;
  customerEmail: string;
  title: string | null;
  type: string;
  status: string;
  amount: number | null;
  currency: string;
  paymentMethod: string | null;
  items: Array<{ name: string; variant: string | null; qty: number; amount: number | null; resolution: string }>;
  parcels: Array<{ number: string; direction: string; state: string; providerStatus: string | null }>;
};

export type SummaryImage = { label: string; mimeType: string; data: Buffer };
export const SUMMARY_IMAGE_LIMIT = 4;

export class GroqError extends Error {
  constructor(public code: "not_configured" | "unavailable", message: string) {
    super(message);
  }
}

export const aiConfigured = (): boolean => false;

const off = (): never => {
  throw new GroqError("not_configured", "AI is not available in this copy");
};

export async function generateEmailSummary(_input: {
  messages: EmailConversationMessage[];
  order: EmailSummaryOrder;
  locale: Locale;
  images?: SummaryImage[];
}): Promise<{ summary: EmailSummary; model: string }> {
  return off();
}

export async function scoreCustomerSatisfaction(_input: {
  messages: EmailConversationMessage[];
  order: EmailSummaryOrder;
}): Promise<SatisfactionResult & { model: string }> {
  return off();
}

export async function answerEmailQuestion(_input: {
  messages: EmailConversationMessage[];
  order: EmailSummaryOrder;
  question: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  return off();
}

export async function draftCustomerEmail(_input: {
  order: EmailSummaryOrder;
  language: string;
  instruction: string;
  greeting: string;
  signature: string;
  [key: string]: unknown;
}): Promise<string> {
  return off();
}

export async function draftTemplateText(_input: { language: string; instruction: string; [key: string]: unknown }): Promise<string> {
  return off();
}

export async function draftCustomerReply(_input: {
  messages: EmailConversationMessage[];
  order: EmailSummaryOrder;
  language: string;
  greeting: string;
  signature: string;
  instruction?: string;
}): Promise<string> {
  return off();
}

export async function reviseCustomerEmail(_input: {
  order: EmailSummaryOrder;
  language: string;
  body: string;
  instruction: string;
  [key: string]: unknown;
}): Promise<string> {
  return off();
}

export async function translateLanguagePack(_input: { englishName: string; templates: unknown }): Promise<{ templates: unknown; markers: unknown; words: unknown }> {
  return off();
}

export async function translateCustomerText(_input: {
  from: string;
  to: string;
  subject: string;
  body: string;
  [key: string]: unknown;
}): Promise<{ subject: string; body: string }> {
  return off();
}
