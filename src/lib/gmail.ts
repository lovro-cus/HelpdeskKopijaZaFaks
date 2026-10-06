import "server-only";

import type { EmailAttachmentPreview } from "./email-attachment";
import * as demo from "./demo-mailbox";

/**
 * Nabiralnik podpore.
 *
 * Kopija za faks nima pravega nabiralnika: vsa pošta strank je izmišljena in
 * živi v tabeli DemoMail (demo-mailbox.ts, napolni jo prisma/seed.ts). Ta modul
 * ohranja vmesnik, ki ga uporablja ostala koda (Prejeto, pošta na ticketu,
 * pošiljanje odgovorov), in vse preusmeri v izmišljen nabiralnik.
 */

export type EmailAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  preview: EmailAttachmentPreview;
};

export type EmailConversationMessage = {
  id: string;
  threadId: string | null;
  sentAt: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  source: "customer" | "shopify";
  direction: "incoming" | "outgoing";
  attachments: EmailAttachment[];
  translatedSubject?: string | null;
  translatedBody?: string | null;
  detectedLanguage?: string | null;
};

export type EmailConversation = {
  account: string;
  messages: EmailConversationMessage[];
  truncated: boolean;
};

export type GmailInboxThread = {
  threadId: string;
  /** Vseh sporočil v niti. */
  messageCount: number;
  messages: EmailConversationMessage[];
  customerEmails: string[];
};

export type GmailReplyTarget = { threadId: string | null; inReplyTo: string | null; subject: string | null };

export class GmailError extends Error {
  constructor(public code: "not_configured" | "auth" | "unavailable", message: string) {
    super(message);
  }
}

export class GmailAttachmentError extends Error {
  constructor(public code: "not_found" | "too_large", message: string) {
    super(message);
  }
}

/** Izmišljen nabiralnik je vedno na voljo. */
export function gmailConfigured(): boolean {
  return true;
}

/** Izmišljena pošta nima prilog. */
export async function getEmailAttachment(_input: {
  customerEmail: string;
  customerName: string | null;
  orderNumber: string;
  messageId: string;
  attachmentRef: string;
  threadIds?: string[];
}): Promise<EmailAttachment & { data: Buffer }> {
  throw new GmailAttachmentError("not_found", "Attachment was not found");
}

export async function hasReplySince(input: { customerEmail: string; since: Date }): Promise<boolean> {
  return demo.demoHasReplySince(input.customerEmail, input.since);
}

/** Vsa pošta stranke in znane niti ticketa. */
export async function getEmailConversation(input: {
  customerEmail: string;
  customerName: string | null;
  orderNumber: string;
  threadIds?: string[];
}): Promise<EmailConversation> {
  return demo.demoConversation(input);
}

export async function getEmailThread(input: {
  threadId: string;
  customerEmail: string;
  customerName: string | null;
  orderNumber: string;
}): Promise<EmailConversation> {
  return demo.demoThread(input.threadId);
}

/** Niti z novimi sporočili za Prejeto. */
export async function getRecentInboxThreads(input: { after?: Date | null; maxMessages?: number } = {}): Promise<GmailInboxThread[]> {
  return demo.demoRecentThreads(input.after);
}

export async function getInboxThreads(threadIds: string[]): Promise<GmailInboxThread[]> {
  return demo.demoInboxThreads(threadIds);
}

export async function countThreadMessages(threadIds: string[]): Promise<Map<string, number>> {
  return demo.demoCountMessages(threadIds);
}

export async function findReplyTarget(input: { customerEmail: string }): Promise<GmailReplyTarget | null> {
  return demo.demoReplyTarget(input.customerEmail);
}

export async function findThreadReplyTarget(threadId: string): Promise<GmailReplyTarget | null> {
  return demo.demoThreadReplyTarget(threadId);
}

/** "Pošlje" pismo: zapiše se v nit izmišljenega nabiralnika, nikamor ne odide. */
export async function sendGmailMessage(input: {
  to: string;
  subject: string;
  body: string;
  html?: string | null;
  inlineImage?: { cid: string; contentType: string; filename: string; data: Buffer } | null;
  threadId?: string | null;
  inReplyTo?: string | null;
}): Promise<{ id: string; threadId: string | null }> {
  return demo.demoSend(input);
}
