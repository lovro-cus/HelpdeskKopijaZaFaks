"use server";

import { requireUserStrict } from "../auth";
import { ensureCatalog } from "../catalog-server";
import { customerLanguages, isCustomerLanguage, languageName } from "../customer-email";
import { db } from "../db";
import { canAccessShipg } from "../domain";
import { draftTemplateText, aiConfigured, GroqError, translateCustomerText } from "../groq";
import { readTemplateTexts, type MailTemplateView, type TemplateTexts } from "../mail-template";

/**
 * Lastne predloge pisem v oknu »Mail osnutki«. Pravica je ista kot za pošiljanje
 * pisem; predloge si deli cela ekipa. Nič od tega ne pošlje pisma.
 */

async function access() {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  // Seznam jezikov za preverjanje pride iz šifranta jezikov.
  await ensureCatalog();
  return me;
}

async function all(): Promise<MailTemplateView[]> {
  const rows = await db.mailTemplate.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] });
  return rows.map((row) => ({ id: row.id, name: row.name, texts: readTemplateTexts(row.texts) }));
}

export async function listMailTemplates(): Promise<MailTemplateView[]> {
  await access();
  return all();
}

export type TemplateSaveResult =
  | { ok: true; id: number; templates: MailTemplateView[] }
  | { ok: false; error: "name" | "empty" | "gone" };

export async function saveMailTemplate(input: { id: number | null; name: string; texts: TemplateTexts }): Promise<TemplateSaveResult> {
  const me = await access();
  const name = String(input.name ?? "").trim().slice(0, 80);
  if (!name) return { ok: false, error: "name" };
  const texts = readTemplateTexts(input.texts, customerLanguages());
  if (Object.keys(texts).length === 0) return { ok: false, error: "empty" };

  const data = { name, texts: JSON.stringify(texts) };
  if (input.id) {
    const updated = await db.mailTemplate.updateMany({ where: { id: input.id }, data });
    if (updated.count === 0) return { ok: false, error: "gone" };
    return { ok: true, id: input.id, templates: await all() };
  }
  const last = await db.mailTemplate.aggregate({ _max: { position: true } });
  const created = await db.mailTemplate.create({
    data: { ...data, position: (last._max.position ?? -1) + 1, createdById: me.id },
  });
  return { ok: true, id: created.id, templates: await all() };
}

export async function deleteMailTemplate(id: number): Promise<MailTemplateView[]> {
  await access();
  if (Number.isInteger(id) && id > 0) await db.mailTemplate.deleteMany({ where: { id } });
  return all();
}

export type TemplateAiResult = { ok: true; body: string } | { ok: false; error: string };

const aiError = (error: unknown) => (error instanceof GroqError ? error.code : "unavailable");

/** Besedilo predloge v izbranem jeziku po navodilu zaposlenega. */
export async function aiWriteTemplateText(language: string, instruction: string): Promise<TemplateAiResult> {
  await access();
  if (!aiConfigured()) return { ok: false, error: "not_configured" };
  const text = instruction.trim().slice(0, 1_000);
  if (!text) return { ok: false, error: "no_instruction" };
  try {
    const body = await draftTemplateText({ language: languageName(isCustomerLanguage(language) ? language : "en"), instruction: text });
    return { ok: true, body };
  } catch (error) {
    console.error("AI template text failed", error);
    return { ok: false, error: aiError(error) };
  }
}

/**
 * Prevede besedilo predloge v navedene jezike, enega za drugim. Z `templateId`
 * se prevodi tudi shranijo v predlogo (predogled pisma za stranko); brez njega
 * gredo samo nazaj v urejevalnik. Ob napaki vrne, kar je že prevedeno.
 */
export async function aiTranslateTemplate(input: {
  templateId: number | null;
  from: string;
  subject: string;
  body: string;
  to: string[];
}): Promise<{ texts: TemplateTexts; templates?: MailTemplateView[]; error?: string }> {
  await access();
  if (!aiConfigured()) return { texts: {}, error: "not_configured" };
  if (!isCustomerLanguage(input.from) || !input.body.trim()) return { texts: {}, error: "no_instruction" };

  const targets = [...new Set(input.to)].filter((code) => code !== input.from && isCustomerLanguage(code)).slice(0, 12);
  const texts: TemplateTexts = {};
  let error: string | undefined;
  for (const code of targets) {
    try {
      const translated = await translateCustomerText({
        from: languageName(input.from),
        to: languageName(code),
        subject: input.subject,
        body: input.body,
      });
      texts[code] = { subject: input.subject.trim() ? translated.subject : "", body: translated.body };
    } catch (failure) {
      console.error(`AI template translation to ${code} failed`, failure);
      error = aiError(failure);
      break;
    }
  }

  if (input.templateId && Object.keys(texts).length > 0) {
    const row = await db.mailTemplate.findUnique({ where: { id: input.templateId } });
    if (row) {
      const merged = { ...readTemplateTexts(row.texts), ...texts };
      await db.mailTemplate.update({ where: { id: row.id }, data: { texts: JSON.stringify(merged) } });
      return { texts, templates: await all(), error };
    }
  }
  return { texts, error };
}
