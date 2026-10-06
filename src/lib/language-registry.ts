import { BUILTIN_LANGUAGES } from "./language-seed";

/**
 * Jeziki strank, kakor jih vidi koda: pisma, države, prepoznava maila in besede
 * izdelkov.
 *
 * Vir je baza (Admin → Jeziki); tu stoji posnetek, ki ga strežnik naloži iz baze,
 * brskalnik pa dobi iz postavitve strani. Dokler posnetka ni, veljajo vgrajeni
 * jeziki — pisma delajo tudi brez baze.
 */

export const DRAFT_KINDS = [
  "exchangeShipped",
  "refundOrExchange",
  "whichSize",
  "returnInstructions",
  "returnInstructionsWithChoice",
  "custom",
] as const;
export type DraftKind = (typeof DRAFT_KINDS)[number];

export const CANONICAL_COLORS = ["black", "green", "camo", "gray", "blue", "khaki", "red", "orange", "pink", "white"] as const;
export const CANONICAL_GENDERS = ["men", "women"] as const;

export type KindText = {
  /** "{order}" se zamenja s številko naročila. */
  subject: string;
  /** Uvodni stavek pred naštevanjem. */
  lead: string;
  /** Zaključni stavek. */
  close?: string;
  /** Možnosti, med katerimi naj stranka izbere. */
  options?: string[];
  /** Pismo nosi naslov skladišča (ta je v vseh jezikih enak). */
  address?: boolean;
  /** Besedilo tik za naslovom skladišča (poštnina, tracking), pred možnostmi. */
  note?: string;
};

export type LanguageTemplates = {
  /** "{name}" se zamenja s prvim imenom stranke. */
  greeting: string;
  /** Nagovor, kadar imena ne poznamo. */
  greetingAnonymous: string;
  signOff: string;
  kinds: Record<DraftKind, KindText>;
};

export type LanguageWords = { color: Record<string, string>; gender: Record<string, string> };

export type LanguageInfo = {
  code: string;
  name: string;
  englishName: string;
  countries: string[];
  markers: string[];
  words: LanguageWords;
  templates: LanguageTemplates;
  active: boolean;
  builtin: boolean;
};

const isText = (value: unknown): value is string => typeof value === "string";

function kindText(value: unknown): KindText | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isText(record.subject) || !isText(record.lead)) return null;
  return {
    subject: record.subject,
    lead: record.lead,
    ...(isText(record.close) && record.close ? { close: record.close } : {}),
    ...(isText(record.note) && record.note ? { note: record.note } : {}),
    ...(Array.isArray(record.options) && record.options.every(isText) && record.options.length > 0 ? { options: record.options as string[] } : {}),
    ...(record.address === true ? { address: true } : {}),
  };
}

/**
 * Preveri besedila iz baze ali od AI. Manjkajoča vrsta pisma dobi besedilo iz
 * rezerve (angleščine), da pismo nikoli ne ostane brez vsebine.
 */
export function readTemplates(value: unknown, fallback: LanguageTemplates): LanguageTemplates {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const kinds = record.kinds && typeof record.kinds === "object" ? (record.kinds as Record<string, unknown>) : {};
  return {
    greeting: isText(record.greeting) && record.greeting.trim() ? record.greeting : fallback.greeting,
    greetingAnonymous: isText(record.greetingAnonymous) && record.greetingAnonymous.trim() ? record.greetingAnonymous : fallback.greetingAnonymous,
    signOff: isText(record.signOff) && record.signOff.trim() ? record.signOff : fallback.signOff,
    kinds: Object.fromEntries(DRAFT_KINDS.map((kind) => {
      const text = kindText(kinds[kind]);
      // Naslov skladišča je lastnost vrste pisma, ne prevoda.
      const address = fallback.kinds[kind].address;
      return [kind, text ? { ...text, ...(address ? { address } : {}) } : fallback.kinds[kind]];
    })) as Record<DraftKind, KindText>,
  };
}

export function readWords(value: unknown): LanguageWords {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const map = (entry: unknown, allowed: readonly string[]) => Object.fromEntries(
    Object.entries(entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {})
      .filter((pair): pair is [string, string] => isText(pair[1]) && allowed.includes(pair[1]) && pair[0].trim().length > 0),
  );
  return { color: map(record.color, CANONICAL_COLORS), gender: map(record.gender, CANONICAL_GENDERS) };
}

let languages: LanguageInfo[] = BUILTIN_LANGUAGES;
let byCode = new Map(languages.map((language) => [language.code, language]));
let byCountry = countryIndex(languages);

function countryIndex(list: LanguageInfo[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const language of list) {
    if (!language.active) continue;
    for (const country of language.countries) if (!index.has(country)) index.set(country.toUpperCase(), language.code);
  }
  return index;
}

export function setLanguages(list: LanguageInfo[]): void {
  if (list === languages) return;
  languages = list.length > 0 ? list : BUILTIN_LANGUAGES;
  byCode = new Map(languages.map((language) => [language.code, language]));
  byCountry = countryIndex(languages);
}

export function allLanguages(): LanguageInfo[] {
  return languages;
}

export function activeLanguages(): LanguageInfo[] {
  return languages.filter((language) => language.active);
}

export function languageByCode(code: string | null | undefined): LanguageInfo | null {
  return byCode.get((code ?? "").toLowerCase()) ?? null;
}

export function languageCodeOfCountry(country: string | null | undefined): string | null {
  return byCountry.get((country ?? "").toUpperCase()) ?? null;
}

const plain = (value: string) => value
  .normalize("NFKD")
  .replace(/[̀-ͯ]/g, "")
  .toLocaleLowerCase("en")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

/**
 * Besede iz opcij izdelkov tega jezika, ki jih Desk še ne razume — barva "Zwart"
 * brez pomena pomeni, da nizozemske hlače ne najdejo para med nemškimi.
 */
export function unknownOptionWords(
  products: { language: string | null; options: { key: string; values: string[] }[] }[],
  code: string,
  known: LanguageWords,
): { color: string[]; gender: string[] } {
  const knownColor = new Set(Object.keys(known.color).map(plain));
  const knownGender = new Set(Object.keys(known.gender).map(plain));
  const color = new Set<string>();
  const gender = new Set<string>();
  for (const product of products) {
    if (product.language !== code) continue;
    for (const option of product.options) {
      if (option.key !== "color" && option.key !== "gender") continue;
      for (const value of option.values) {
        for (const token of value.split(/[/·]/).map((part) => part.trim()).filter(Boolean)) {
          if (option.key === "color" && !knownColor.has(plain(token))) color.add(token);
          if (option.key === "gender" && !knownGender.has(plain(token))) gender.add(token);
        }
      }
    }
  }
  return { color: [...color].sort(), gender: [...gender].sort() };
}

/**
 * Država pripada enemu jeziku: ko jo dobi en jezik, jo drugi izgubijo. Tako
 * Belgija ne more hkrati dobivati francoskih in nizozemskih pisem.
 */
export function assignCountries<T extends { code: string; countries: string[] }>(list: T[], code: string, countries: string[]): T[] {
  const wanted = [...new Set(countries.map((country) => country.trim().toUpperCase()).filter((country) => /^[A-Z]{2}$/.test(country)))];
  return list.map((language) => language.code === code
    ? { ...language, countries: wanted }
    : { ...language, countries: language.countries.filter((country) => !wanted.includes(country)) });
}
