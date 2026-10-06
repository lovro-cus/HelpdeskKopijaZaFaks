import "server-only";

import type { EmailConversationMessage } from "./gmail";

/**
 * Strojno prevajanje pošte.
 *
 * Kopija za faks nima prevajalnika: pogovor ostane v izvirniku, preverjanje
 * pisma v angleščini pa javi, da prevajanje ni nastavljeno.
 */

export type CheckTranslation =
  | { ok: true; text: string; detected: string | null }
  | { ok: false; error: "not_configured" | "empty" | "unavailable" | "rejected" };

export const translationConfigured = (): boolean => false;

export async function translateDraftToEnglish(_text: string): Promise<CheckTranslation> {
  return { ok: false, error: "not_configured" };
}

export async function translateEmailConversation(messages: EmailConversationMessage[]): Promise<EmailConversationMessage[]> {
  return messages;
}
