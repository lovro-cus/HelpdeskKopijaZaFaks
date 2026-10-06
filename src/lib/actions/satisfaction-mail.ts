"use server";

import { revalidatePath } from "next/cache";
import { requirePermissionStrict } from "../auth";
import { ensureCatalog } from "../catalog-server";
import { customerLanguageForReply, languageName, wrapCustomerLetter } from "../customer-email";
import { deliverCustomerLetter } from "../customer-send";
import { db } from "../db";
import { getEmailConversation, gmailConfigured } from "../gmail";
import { translateCustomerText } from "../groq";
import { t } from "../i18n/server";
import { logManage } from "../manage-log";
import { canThankCustomer, readThankYouTemplate, satisfactionCloseKey, SATISFACTION_MAIL_KEY, validThankYouTemplate } from "../satisfaction-mail";

export type ThankYouPreview = {
  id: number; version: string; to: string; language: string; languageCode: string; subject: string; body: string;
};
export type ThankYouResult = { error?: string; ok?: boolean; preview?: ThankYouPreview };

export async function saveThankYouTemplate(_previous: ThankYouResult, fd: FormData): Promise<ThankYouResult> {
  const me = await requirePermissionStrict("satisfaction");
  const value = { subject: String(fd.get("subject") ?? "").trim(), body: String(fd.get("body") ?? "").trim() };
  if (!validThankYouTemplate(value)) return { error: t(me.locale, "satisfaction.mail.invalid") };
  await db.appSetting.upsert({ where: { key: SATISFACTION_MAIL_KEY }, create: { key: SATISFACTION_MAIL_KEY, value: JSON.stringify(value) }, update: { value: JSON.stringify(value) } });
  await logManage("satisfaction", "satisfaction.template", value.subject, me.id);
  revalidatePath("/urejanje");
  return { ok: true };
}

export async function prepareThankYou(issueId: number): Promise<ThankYouResult> {
  const me = await requirePermissionStrict("satisfaction");
  if (!Number.isSafeInteger(issueId) || issueId <= 0) return { error: t(me.locale, "satisfaction.mail.ineligible") };
  const issue = await db.issue.findUnique({ where: { id: issueId }, include: { satisfaction: true, inboxConversations: { select: { gmailThreadId: true } } } });
  if (!issue || !canThankCustomer(issue)) return { error: t(me.locale, "satisfaction.mail.ineligible") };
  const key = satisfactionCloseKey(issue.id, issue.closedAt!);
  const existing = await db.customerEmailDraft.findUnique({ where: { satisfactionCloseKey: key } });
  if (existing && existing.status !== "satisfaction_preview") return { error: t(me.locale, "satisfaction.mail.already") };
  const setting = await db.appSetting.findUnique({ where: { key: SATISFACTION_MAIL_KEY } });
  const template = readThankYouTemplate(setting?.value);
  if (!validThankYouTemplate(template)) return { error: t(me.locale, "satisfaction.mail.setup") };
  if (!gmailConfigured()) return { error: t(me.locale, "draft.feedback.error_not_configured") };
  try {
    await ensureCatalog();
    const conversation = await getEmailConversation({ customerEmail: issue.customerEmail!, customerName: issue.customerName, orderNumber: issue.orderNumber, threadIds: issue.inboxConversations.map(row => row.gmailThreadId) });
    const language = customerLanguageForReply(conversation.messages.filter(message => message.source === "customer"), issue.customerCountryCode);
    const translated = language === "en" ? template : await translateCustomerText({ from: "English", to: languageName(language), ...template });
    if (!translated.subject.trim() || /[\r\n]/.test(translated.subject)) throw new Error("Invalid subject");
    const fill = (text: string) => text.split("{order}").join(issue.orderNumber);
    const subject = fill(translated.subject);
    const body = wrapCustomerLetter(language, issue.customerName, fill(translated.body).split("\n"));
    const data = { subject, body, language, toEmail: issue.customerEmail!, createdById: me.id };
    // Unique closure key protects concurrent preparations. Only previews can be replaced.
    const draft = await db.$transaction(async tx => {
      const current = await tx.customerEmailDraft.findUnique({ where: { satisfactionCloseKey: key } });
      if (current && current.status !== "satisfaction_preview") return null;
      return current
        ? tx.customerEmailDraft.update({ where: { id: current.id }, data })
        : tx.customerEmailDraft.create({ data: { ...data, issueId, kind: "custom", status: "satisfaction_preview", satisfactionCloseKey: key } });
    });
    if (!draft) return { error: t(me.locale, "satisfaction.mail.already") };
    return { preview: { id: draft.id, version: draft.updatedAt.toISOString(), to: draft.toEmail, language: languageName(language), languageCode: language, subject, body } };
  } catch (error) {
    console.error("Thank-you preparation failed", error instanceof Error ? error.message : error);
    return { error: t(me.locale, "satisfaction.mail.prepareFailed") };
  }
}

export async function sendThankYou(draftId: number, version: string): Promise<ThankYouResult> {
  const me = await requirePermissionStrict("satisfaction");
  if (!Number.isSafeInteger(draftId) || draftId <= 0 || !Number.isFinite(Date.parse(version))) return { error: t(me.locale, "satisfaction.mail.stale") };
  if (!gmailConfigured()) return { error: t(me.locale, "draft.feedback.error_not_configured") };
  // Claim the exact preview atomically before contacting Gmail.
  const draft = await db.$transaction(async tx => {
    const row = await tx.customerEmailDraft.findUnique({ where: { id: draftId }, include: { issue: { include: { satisfaction: true } } } });
    if (!row || !canThankCustomer(row.issue) || row.toEmail !== row.issue.customerEmail
      || row.satisfactionCloseKey !== satisfactionCloseKey(row.issueId, row.issue.closedAt!)) return null;
    const claimed = await tx.customerEmailDraft.updateMany({ where: { id: draftId, status: "satisfaction_preview", updatedAt: new Date(version) }, data: { status: "sending" } });
    return claimed.count === 1 ? row : null;
  });
  if (!draft) return { error: t(me.locale, "satisfaction.mail.stale") };
  try {
    // A new thread preserves the configured thank-you subject shown in the preview.
    await deliverCustomerLetter(draft, draft.body, me, { threadId: null });
  } catch (error) {
    console.error("Thank-you send failed", error instanceof Error ? error.message : error);
    // A timeout can happen after Gmail accepted the email. Never silently retry it.
    await db.customerEmailDraft.updateMany({ where: { id: draft.id, status: "sending" }, data: { status: "send_failed" } }).catch(() => {});
    revalidatePath("/urejanje");
    revalidatePath(`/orders/${draft.issue.key}`);
    return { error: t(me.locale, "satisfaction.mail.sendFailed") };
  }
  revalidatePath("/urejanje");
  revalidatePath(`/orders/${draft.issue.key}`);
  return { ok: true };
}
