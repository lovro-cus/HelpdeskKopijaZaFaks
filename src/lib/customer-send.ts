import "server-only";

import { db } from "./db";
import { findReplyTarget, findThreadReplyTarget, sendGmailMessage } from "./gmail";

/**
 * Oddaja pisma stranki skozi Gmail in zapis o tem, kaj je odšlo.
 *
 * Vse poti — samodejni osnutek ob odpremi, ročno sestavljeno pismo in skupinsko
 * pismo — gredo skozi tole, da se ravnanje (nit, zadeva, vpis v ticket) ne more
 * razhajati.
 */
export async function deliverCustomerLetter(
  draft: { id: number; issueId: number; toEmail: string; subject: string },
  body: string,
  author: { id: string },
  options?: { threadId: string | null },
): Promise<void> {
  // Nit poiščemo šele zdaj: ob nastanku osnutka je stranka morda še pisala,
  // za pripenjanje pa šteje zadnje sporočilo v trenutku pošiljanja.
  const target = options
    ? (options.threadId ? await findThreadReplyTarget(options.threadId).catch(() => null) : null)
    : await findReplyTarget({ customerEmail: draft.toEmail }).catch(() => null);
  // Gmail nit drži skupaj tudi po zadevi; ohranimo izvorno z "Re:", kadar
  // odgovarjamo na obstoječe sporočilo.
  const subject = target?.subject
    ? (/^re:/i.test(target.subject) ? target.subject : `Re: ${target.subject}`)
    : draft.subject;

  const sent = await sendGmailMessage({
    to: draft.toEmail,
    subject,
    body,
    threadId: target?.threadId,
    inReplyTo: target?.inReplyTo,
  });

  await db.$transaction([
    db.customerEmailDraft.update({
      where: { id: draft.id },
      data: {
        status: "sent",
        body,
        subject,
        threadId: sent.threadId,
        inReplyTo: target?.inReplyTo ?? null,
        sentMessageId: sent.id,
        sentById: author.id,
        sentAt: new Date(),
      },
    }),
    db.event.create({
      data: {
        issueId: draft.issueId,
        kind: "system",
        field: "customer_email",
        toValue: "sent",
        body: `${draft.toEmail} · ${subject}`,
        authorId: author.id,
      },
    }),
  ]);
}
