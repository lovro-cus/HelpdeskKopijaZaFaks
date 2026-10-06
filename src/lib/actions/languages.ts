"use server";

import { revalidatePath } from "next/cache";

import { requirePermissionStrict, type SessionUser } from "../auth";
import { invalidateCatalog, readLanguages } from "../catalog-server";
import { db } from "../db";
import { aiConfigured, GroqError, translateLanguagePack } from "../groq";
import { t } from "../i18n/server";
import { logManage } from "../manage-log";
import {
  assignCountries,
  CANONICAL_COLORS,
  CANONICAL_GENDERS,
  DRAFT_KINDS,
  readTemplates,
  readWords,
  type LanguageTemplates,
  type LanguageWords,
} from "../language-registry";
import { ENGLISH_TEMPLATES } from "../language-seed";

/**
 * Urejanje jezikov strank v adminu. Država pripada enemu jeziku, zato shranjevanje
 * držav enega jezika popravi tudi ostale. Vsaka sprememba razveljavi posnetek, da
 * naslednje pismo že gre po novem.
 */

export type LanguageState = { ok?: boolean; error?: string; code?: string; translated?: boolean };

const text = (fd: FormData, name: string, max = 400) => {
  const value = fd.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
};

const listOf = (value: string) => value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);

function wordsFrom(fd: FormData): LanguageWords {
  const pairs = (kind: "color" | "gender", allowed: readonly string[]) => {
    const words = fd.getAll(`${kind}.word`);
    const meanings = fd.getAll(`${kind}.meaning`);
    const map: Record<string, string> = {};
    words.forEach((word, index) => {
      const meaning = meanings[index];
      if (typeof word !== "string" || typeof meaning !== "string") return;
      const clean = word.trim().toLowerCase().slice(0, 40);
      if (clean && allowed.includes(meaning)) map[clean] = meaning;
    });
    return map;
  };
  return { color: pairs("color", CANONICAL_COLORS), gender: pairs("gender", CANONICAL_GENDERS) };
}

function templatesFrom(fd: FormData, fallback: LanguageTemplates): LanguageTemplates {
  return readTemplates({
    greeting: text(fd, "greeting", 200),
    greetingAnonymous: text(fd, "greetingAnonymous", 200),
    signOff: text(fd, "signOff", 200),
    kinds: Object.fromEntries(DRAFT_KINDS.map((kind) => [kind, {
      subject: text(fd, `kind.${kind}.subject`, 300),
      lead: text(fd, `kind.${kind}.lead`, 1200),
      note: text(fd, `kind.${kind}.note`, 1200),
      close: text(fd, `kind.${kind}.close`, 1200),
      options: listOf(text(fd, `kind.${kind}.options`, 800)).length ? text(fd, `kind.${kind}.options`, 800).split("\n").map((line) => line.trim()).filter(Boolean) : undefined,
    }])),
  }, fallback);
}

async function englishFallback(): Promise<LanguageTemplates> {
  return (await readLanguages()).find((language) => language.code === "en")?.templates ?? ENGLISH_TEMPLATES;
}

/** Države vseh jezikov po spremembi enega — v eni transakciji. */
async function saveCountries(code: string, countries: string[]) {
  const rows = await db.language.findMany({ select: { code: true, countries: true } });
  const current = rows.map((row) => ({ code: row.code, countries: row.countries.split(",").map((c) => c.trim()).filter(Boolean) }));
  const next = assignCountries(current, code, countries);
  const changed = next.filter((language) => {
    const before = current.find((row) => row.code === language.code);
    return before && before.countries.join(",") !== language.countries.join(",");
  });
  await db.$transaction(changed.map((language) => db.language.update({ where: { code: language.code }, data: { countries: language.countries.join(",") } })));
}

async function done(me: SessionUser, action: string, detail: string, extra: Partial<LanguageState> = {}): Promise<LanguageState> {
  invalidateCatalog();
  await logManage("languages", action, detail, me.id);
  revalidatePath("/urejanje");
  return { ok: true, ...extra };
}

export async function saveLanguage(_prev: LanguageState, fd: FormData): Promise<LanguageState> {
  const me = await requirePermissionStrict("languages");
  const code = text(fd, "code", 8);
  const existing = await db.language.findUnique({ where: { code } });
  if (!existing) return { error: t(me.locale, "products.error.generic") };

  const name = text(fd, "name", 60);
  const englishName = text(fd, "englishName", 60);
  if (!name || !englishName) return { error: t(me.locale, "languages.error.name") };

  const active = fd.get("active") === "on";
  if (!active && existing.active && (await db.language.count({ where: { active: true } })) <= 1) {
    return { error: t(me.locale, "languages.error.lastActive") };
  }

  const fallback = code === "en" ? ENGLISH_TEMPLATES : await englishFallback();
  await db.language.update({
    where: { code },
    data: {
      name,
      englishName,
      active,
      templates: JSON.stringify(templatesFrom(fd, fallback)),
      markers: JSON.stringify(listOf(text(fd, "markers", 2000)).map((marker) => marker.toLowerCase()).slice(0, 60)),
      words: JSON.stringify(wordsFrom(fd)),
    },
  });
  await saveCountries(code, listOf(text(fd, "countries", 200)));
  return done(me, "language.save", `${code} · ${name}`, { code });
}

export async function createLanguage(_prev: LanguageState, fd: FormData): Promise<LanguageState> {
  const me = await requirePermissionStrict("languages");
  const code = text(fd, "code", 8).toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) return { error: t(me.locale, "languages.error.code") };
  if (await db.language.findUnique({ where: { code } })) return { error: t(me.locale, "languages.error.exists") };
  const name = text(fd, "name", 60);
  const englishName = text(fd, "englishName", 60);
  if (!name || !englishName) return { error: t(me.locale, "languages.error.name") };

  const english = await englishFallback();
  let templates = english;
  let markers: string[] = [];
  let words: LanguageWords = { color: {}, gender: {} };
  let translated = false;

  if (aiConfigured()) {
    try {
      const pack = await translateLanguagePack({ englishName, templates: english });
      templates = readTemplates(pack.templates, english);
      markers = Array.isArray(pack.markers) ? pack.markers.filter((marker): marker is string => typeof marker === "string").map((marker) => marker.toLowerCase()).slice(0, 30) : [];
      words = readWords(pack.words);
      translated = true;
    } catch (error) {
      const message = error instanceof GroqError ? error.code : error instanceof Error ? error.message : String(error);
      return { error: t(me.locale, "languages.error.ai", { message }) };
    }
  }

  const last = await db.language.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  await db.language.create({
    data: {
      code,
      name,
      englishName,
      templates: JSON.stringify(templates),
      markers: JSON.stringify(markers),
      words: JSON.stringify(words),
      position: (last?.position ?? -1) + 1,
    },
  });
  await saveCountries(code, listOf(text(fd, "countries", 200)));
  return done(me, "language.create", `${code} · ${name}`, { code, translated });
}

/** Besedila pisem znova iz angleščine; besede in države ostanejo. */
export async function retranslateLanguage(code: string): Promise<LanguageState> {
  const me = await requirePermissionStrict("languages");
  const language = await db.language.findUnique({ where: { code } });
  if (!language || code === "en") return { error: t(me.locale, "products.error.generic") };
  const english = await englishFallback();
  try {
    const pack = await translateLanguagePack({ englishName: language.englishName, templates: english });
    await db.language.update({ where: { code }, data: { templates: JSON.stringify(readTemplates(pack.templates, english)) } });
  } catch (error) {
    const message = error instanceof GroqError ? error.code : error instanceof Error ? error.message : String(error);
    return { error: t(me.locale, "languages.error.ai", { message }) };
  }
  return done(me, "language.retranslate", `${code} · ${language.name}`, { code, translated: true });
}

/** Vgrajenih jezikov ni mogoče izbrisati, samo izklopiti. */
export async function deleteLanguage(code: string): Promise<LanguageState> {
  const me = await requirePermissionStrict("languages");
  const removed = await db.language.deleteMany({ where: { code, builtin: false } });
  return done(me, "language.delete", removed.count > 0 ? code : `${code} (—)`);
}
