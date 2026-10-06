import { createHash } from "node:crypto";

import type { EmailConversationMessage } from "./gmail";

/**
 * Prstni odtis pogovora — ključ predpomnilnika povzetkov.
 *
 * Loči se od `gmail.ts` namenoma: edini vozliščni vgrajeni modul v Gmail plasti
 * je bil `node:crypto`, zaradi njega pa se je podrla gradnja povsod, kjer Gmail
 * pride v graf instrumentacije (urnik). Tu je uporabljen samo v strežniških
 * potih, ki vozliščno okolje itak imajo.
 */
export function emailConversationFingerprint(messages: EmailConversationMessage[]): string {
  return createHash("sha256")
    .update(messages.map((message) => `${message.id}:${message.sentAt}`).join("\n"))
    .digest("hex");
}
