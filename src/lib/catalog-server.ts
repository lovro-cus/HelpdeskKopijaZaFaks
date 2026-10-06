import "server-only";

import { db } from "./db";
import { norm, setCatalogSnapshot, type CatalogSnapshot } from "./catalog-registry";
import { SEED_COLORS, SEED_GENDERS, SEED_GROUPS, seedGroupOf, seedSnapshot } from "./catalog-seed";
import { SEED_PRODUCTS } from "./catalog-seed-products";
import { readTemplates, readWords, setLanguages, type KindText, type LanguageInfo } from "./language-registry";
import { BUILTIN_LANGUAGES, ENGLISH_TEMPLATES } from "./language-seed";
import { isLegacyReturnKind, LEGACY_RETURN_KINDS } from "./language-seed-legacy";

/**
 * Katalog in jeziki iz baze v posnetka, ki ju berejo sinhrone funkcije
 * (catalog.ts, catalog-canonical.ts, customer-email.ts).
 *
 * Prazna baza se enkrat napolni iz semena. Posnetka živita v procesu: ob urejanju
 * v adminu se razveljavita, sicer se osvežita najkasneje vsakih 30 sekund — tako
 * spremembo vidi tudi drug zavihek, ne da bi vsaka stran brala bazo.
 */

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const isDuplicate = (error: unknown) => (error as { code?: string }).code === "P2002";

async function seed(): Promise<void> {
  if ((await db.productGroup.count()) === 0) {
    const titles = new Set(SEED_PRODUCTS.map((product) => norm(product.title)));
    try {
      await db.productGroup.createMany({
        data: SEED_GROUPS.map((group, position) => ({
          key: group.key,
          label: group.label,
          genderAgnostic: group.genderAgnostic,
          position,
          aliases: JSON.stringify(group.titles.filter((title) => !titles.has(norm(title)))),
        })),
      });
    } catch (error) {
      if (!isDuplicate(error)) throw error;
    }
  }

  if ((await db.catalogProduct.count()) === 0) {
    const groups = await db.productGroup.findMany({ select: { id: true, key: true } });
    const idByKey = new Map(groups.map((group) => [group.key, group.id]));
    try {
      await db.catalogProduct.createMany({
        data: SEED_PRODUCTS.map((product) => ({
          shopifyId: product.shopifyId,
          handle: product.handle,
          title: product.title,
          status: product.status,
          price: product.price,
          image: product.image,
          options: JSON.stringify(product.options),
          variants: JSON.stringify(product.variants),
          language: product.language,
          groupId: idByKey.get(seedGroupOf(product.title) ?? "") ?? null,
        })),
      });
    } catch (error) {
      if (!isDuplicate(error)) throw error;
    }
  }

  if ((await db.language.count()) === 0) {
    try {
      await db.language.createMany({
        data: BUILTIN_LANGUAGES.map((language, position) => ({
          code: language.code,
          name: language.name,
          englishName: language.englishName,
          countries: language.countries.join(","),
          templates: JSON.stringify(language.templates),
          markers: JSON.stringify(language.markers),
          words: JSON.stringify(language.words),
          active: language.active,
          builtin: true,
          position,
        })),
      });
    } catch (error) {
      if (!isDuplicate(error)) throw error;
    }
  }

  await upgradeReturnTemplates();
}

const RETURN_TEMPLATES_KEY = "languageReturnTemplatesV2";

/**
 * Pismi za vračilo sta dobili novo besedilo (poštnino plača stranka, tracking
 * pošlje, ko odpošlje). Jezik, ki ju ima še v prvotni vgrajeni obliki, dobi
 * novi; kar je admin prepisal, ostane njegovo. Teče enkrat na bazo.
 */
async function upgradeReturnTemplates(): Promise<void> {
  if (await db.appSetting.findUnique({ where: { key: RETURN_TEMPLATES_KEY } })) return;
  const rows = await db.language.findMany({ where: { builtin: true } });
  for (const row of rows) {
    const legacy = LEGACY_RETURN_KINDS[row.code];
    const fresh = BUILTIN_LANGUAGES.find((language) => language.code === row.code)?.templates.kinds;
    if (!legacy || !fresh) continue;
    const templates = parseJson<{ kinds?: Record<string, Partial<KindText>> }>(row.templates, {});
    const kinds = { ...(templates.kinds ?? {}) };
    let changed = false;
    for (const kind of ["returnInstructions", "returnInstructionsWithChoice"] as const) {
      if (!isLegacyReturnKind(kinds[kind], legacy[kind])) continue;
      kinds[kind] = { ...fresh[kind], subject: kinds[kind]?.subject || fresh[kind].subject };
      changed = true;
    }
    if (changed) {
      await db.language.update({ where: { code: row.code }, data: { templates: JSON.stringify({ ...templates, kinds }) } });
    }
  }
  try {
    await db.appSetting.create({ data: { key: RETURN_TEMPLATES_KEY, value: "1" } });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
  }
}

let seeding: Promise<void> | null = null;

function ensureSeeded(): Promise<void> {
  if (!seeding) {
    seeding = seed().catch((error) => {
      seeding = null;
      throw error;
    });
  }
  return seeding;
}

export async function readLanguages(): Promise<LanguageInfo[]> {
  const rows = await db.language.findMany({ orderBy: [{ position: "asc" }, { code: "asc" }] });
  const english = rows.find((row) => row.code === "en");
  const fallback = english ? readTemplates(parseJson(english.templates, {}), ENGLISH_TEMPLATES) : ENGLISH_TEMPLATES;
  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    englishName: row.englishName,
    countries: row.countries.split(",").map((country) => country.trim().toUpperCase()).filter(Boolean),
    markers: parseJson<unknown[]>(row.markers, []).filter((marker): marker is string => typeof marker === "string"),
    words: readWords(parseJson(row.words, {})),
    templates: readTemplates(parseJson(row.templates, {}), fallback),
    active: row.active,
    builtin: row.builtin,
  }));
}

type Loaded = { catalog: CatalogSnapshot; languages: LanguageInfo[] };

async function readAll(): Promise<Loaded> {
  await ensureSeeded();
  const [products, groups, languages] = await Promise.all([
    db.catalogProduct.findMany({
      orderBy: [{ title: "asc" }, { handle: "asc" }],
      include: { group: { select: { key: true } } },
    }),
    db.productGroup.findMany({ orderBy: [{ position: "asc" }, { label: "asc" }] }),
    readLanguages(),
  ]);

  // Besede jezikov dopolnijo osnovni slovar: nov jezik prinese svoje barve.
  const colors = { ...SEED_COLORS };
  const genders = { ...SEED_GENDERS };
  for (const language of languages) {
    Object.assign(colors, language.words.color);
    Object.assign(genders, language.words.gender);
  }

  return {
    catalog: {
      products: products.map((product) => ({
        handle: product.handle,
        title: product.title,
        status: product.status,
        price: product.price,
        image: product.image,
        options: parseJson(product.options, []),
        variants: parseJson(product.variants, []),
        language: product.language,
        group: product.group?.key ?? null,
        missing: Boolean(product.missingSince),
      })),
      groups: groups.map((group) => ({
        key: group.key,
        label: group.label,
        genderAgnostic: group.genderAgnostic,
        aliases: parseJson<string[]>(group.aliases, []),
      })),
      colors,
      genders,
    },
    languages,
  };
}

const TTL_MS = 30_000;
let memo: { at: number; loaded: Loaded } | null = null;

/**
 * Naloži katalog in jezike ter ju nastavi kot posnetka tega procesa. Pokliče ga
 * vsak strežniški vhod, ki ujema izdelke ali sestavlja pisma; napaka baze ne
 * podre strani — velja zadnji znani posnetek ali seme.
 */
export async function ensureCatalog(): Promise<CatalogSnapshot> {
  if (!memo || Date.now() - memo.at >= TTL_MS) {
    try {
      memo = { at: Date.now(), loaded: await readAll() };
    } catch (error) {
      console.error("Catalog load failed", error);
      if (!memo) memo = { at: 0, loaded: { catalog: seedSnapshot(), languages: BUILTIN_LANGUAGES } };
    }
  }
  setCatalogSnapshot(memo.loaded.catalog);
  setLanguages(memo.loaded.languages);
  return memo.loaded.catalog;
}

/** Po urejanju v adminu: naslednje branje gre v bazo. */
export function invalidateCatalog(): void {
  memo = null;
}
