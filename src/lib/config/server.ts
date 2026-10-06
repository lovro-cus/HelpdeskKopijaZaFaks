import "server-only";

import { cache } from "react";

import { db } from "../db";
import { ISSUE_TYPES, PENDING_RESOLUTION, PRIORITIES, RETURN_TYPES, SYSTEM_LEVEL, SYSTEM_TYPE } from "../domain";
import type { TranslationKey } from "../i18n/dictionaries";
import { t } from "../i18n/server";
import type { Locale } from "../i18n/shared";
import {
  DEFAULT_SETTINGS, DEFAULT_TEXT_SETTINGS, parseSetting, parseTextSetting,
  SETTING_KEYS, TEXT_SETTING_KEYS, type Settings, type TextSettings,
} from "./defaults";
import { CATEGORY_KINDS, colorValue, type Category, type CategoryKind } from "./shared";

/**
 * Šifrant in nastavitve iz baze. Vgrajene vrednosti se ob prvem branju vpišejo
 * iz kode, od tam naprej jih ureja admin (glej src/lib/actions/config.ts).
 *
 * Branje je predpomnjeno na zahtevek: ena stran ga pogosto potrebuje na več
 * mestih (seznam, filtri, obrazec), poizvedba pa mora biti ena.
 */

type Row = {
  kind: string;
  key: string;
  label: string | null;
  color: string | null;
  position: number;
  hidden: boolean;
  requiresReturn: boolean;
  watchFulfillment: boolean;
  builtin: boolean;
};

/** Vgrajene vrednosti, kakršne so bile pred urejanjem v adminu. */
const BUILTIN: Record<CategoryKind, { key: string; color: string }[]> = {
  type: ISSUE_TYPES.map((item) => ({ key: item.id, color: item.color })),
  priority: PRIORITIES.map((item) => ({ key: item.id, color: item.color })),
};

const BUILTIN_COLOR = new Map<string, string>();
for (const kind of CATEGORY_KINDS) {
  for (const item of BUILTIN[kind]) BUILTIN_COLOR.set(`${kind}:${item.key}`, item.color);
}

/**
 * Vgrajene vrstice vpišemo samo, kadar je šifrant te vrste prazen. Kar admin
 * skrije, mora ostati skrito — ponovno vpisovanje ob vsakem branju bi mu
 * pobrisano vrsto vsakič vrnilo nazaj.
 *
 * Polnjenje teče enkrat na proces: en zahtevek šifrant pogosto bere na dveh
 * mestih hkrati, SQLite pa nima "skipDuplicates", zato bi se sicer zaletela
 * drug v drugega. Trk med procesoma (P2002) pomeni, da je nekdo že vpisal —
 * to ni napaka.
 */
let seeding: Promise<void> | null = null;

/**
 * Zastavica "spremljaj odpremo" je prišla za šifrantom, zato je baze, ki so
 * bile napolnjene prej, nimajo prižgane pri vgrajeni vrsti "Neodpremljeno".
 * Enkratna poprava, označena v nastavitvah, da admin lahko zastavico pozneje
 * ugasne in mu je naslednji zagon ne prižge nazaj.
 */
const WATCH_INIT_KEY = "catalogWatchFulfillmentInit";

async function backfillWatchFulfillment(): Promise<void> {
  const done = await db.appSetting.findUnique({ where: { key: WATCH_INIT_KEY } });
  if (done) return;

  await db.category.updateMany({
    where: { kind: "type", key: "unfulfilled", builtin: true },
    data: { watchFulfillment: true },
  });
  await db.appSetting.create({ data: { key: WATCH_INIT_KEY, value: "1" } });
}

/** Enkratni vpis, označen v nastavitvah. Trk dveh procesov (P2002) ni napaka. */
async function once(key: string, run: () => Promise<void>): Promise<void> {
  if (await db.appSetting.findUnique({ where: { key } })) return;
  await run();
  try {
    await db.appSetting.create({ data: { key, value: "1" } });
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
  }
}

/** Vrsta »Nerazvrščeno« je prišla za šifrantom: baze, napolnjene prej, je nimajo. */
async function backfillUnsortedType(): Promise<void> {
  await once("catalogUnsortedTypeInit", async () => {
    const exists = await db.category.findFirst({ where: { kind: "type", key: SYSTEM_TYPE } });
    if (exists) return;
    const last = await db.category.aggregate({ where: { kind: "type" }, _max: { position: true } });
    await db.category.create({
      data: { kind: "type", key: SYSTEM_TYPE, position: (last._max.position ?? 0) + 1, builtin: true },
    });
  });
}

/**
 * Ticketi, ki jih je Desk odprl pred uvedbo sistemske vrste, so pristali na
 * prvem nivoju z ugibano vrsto. Prepoznamo jih po prvem vpisu brez avtorja.
 * Tiste, ki se jih človek še ni dotaknil, prestavimo v sistemsko vrsto.
 */
async function backfillSystemTickets(): Promise<void> {
  await once("systemTicketsInit", async () => {
    await db.issue.updateMany({
      where: { reporterId: null, events: { some: { kind: "created", field: "customer_email", authorId: null } } },
      data: { source: "system" },
    });
    await db.issue.updateMany({
      where: {
        source: "system",
        status: "open",
        assigneeId: null,
        level: 1,
        events: { none: { authorId: { not: null } } },
      },
      data: { level: SYSTEM_LEVEL, type: SYSTEM_TYPE },
    });
  });
  // Rešitev artiklov je Desk ugibal enako kot vrsto. Pri ticketih v sistemski
  // vrsti, ki se jih človek še ni dotaknil, jo izprazni.
  await once("systemItemsPendingInit", async () => {
    await db.issueItem.updateMany({
      where: {
        issue: {
          source: "system",
          level: SYSTEM_LEVEL,
          status: "open",
          assigneeId: null,
          events: { none: { authorId: { not: null } } },
        },
      },
      data: { resolution: PENDING_RESOLUTION },
    });
  });
}

async function seedAll(): Promise<void> {
  for (const kind of CATEGORY_KINDS) {
    const count = await db.category.count({ where: { kind } });
    if (count > 0) continue;

    try {
      await db.category.createMany({
        data: BUILTIN[kind].map((item, position) => ({
          kind,
          key: item.key,
          position,
          builtin: true,
          requiresReturn: kind === "type" && RETURN_TYPES.has(item.key),
          // Neodpremljeno naročilo je edina vgrajena vrsta, ki čaka prav na
          // Shopifyjevo odpremo; ostalim bi dnevno javljanje bilo šum.
          watchFulfillment: kind === "type" && item.key === "unfulfilled",
        })),
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }

  await backfillWatchFulfillment();
  await backfillUnsortedType();
  await backfillSystemTickets();
}

function ensureSeeded(): Promise<void> {
  if (!seeding) {
    seeding = seedAll().catch((error) => {
      // Neuspeh se ne sme zapeči: naslednje branje naj poskusi znova.
      seeding = null;
      throw error;
    });
  }
  return seeding;
}

function resolve(row: Row, locale: Locale): Category {
  const builtinKey = `${row.kind}:${row.key}`;
  const dictKey = (row.kind === "type" ? `type.${row.key}` : `priority.${row.key}`) as TranslationKey;
  // Napis vgrajene vrstice pride iz slovarja, dokler ga admin ne prepiše —
  // tako ostane dvojezična. Vpisana imena so v enem jeziku, kakor pač so.
  const label = row.label?.trim() || (row.builtin ? t(locale, dictKey) : row.key);

  return {
    key: row.key,
    label,
    color: colorValue(row.color, BUILTIN_COLOR.get(builtinKey) ?? "var(--ink-2)"),
    position: row.position,
    hidden: row.hidden,
    requiresReturn: row.requiresReturn,
    watchFulfillment: row.watchFulfillment,
    builtin: row.builtin,
  };
}

export type AppConfig = {
  types: Category[];
  priorities: Category[];
  settings: Settings;
  /** Nastavitve, ki so besedilo in ne število (imena) — glej defaults.ts. */
  text: TextSettings;
};

async function readConfig(locale: Locale): Promise<AppConfig> {
  await ensureSeeded();

  const [rows, stored] = await Promise.all([
    db.category.findMany({ orderBy: [{ position: "asc" }, { key: "asc" }] }),
    db.appSetting.findMany(),
  ]);

  const settings = { ...DEFAULT_SETTINGS };
  const text = { ...DEFAULT_TEXT_SETTINGS };
  for (const row of stored) {
    if (SETTING_KEYS.includes(row.key as never)) {
      const value = parseSetting(row.key as never, row.value);
      if (value !== null) settings[row.key as never] = value as never;
      continue;
    }
    if (TEXT_SETTING_KEYS.includes(row.key as never)) {
      const value = parseTextSetting(row.key as never, row.value);
      if (value !== null) text[row.key as never] = value as never;
    }
  }

  return {
    types: rows.filter((row) => row.kind === "type").map((row) => resolve(row, locale)),
    priorities: rows.filter((row) => row.kind === "priority").map((row) => resolve(row, locale)),
    settings,
    text,
  };
}

export const loadConfig = cache(readConfig);

/** Samo številke — za mesta, ki šifranta ne potrebujejo (cron, obračun). */
export const loadSettings = cache(async (): Promise<Settings> => (await loadConfig("en")).settings);

/** Imena iz nastavitev — neodvisna od jezika, zato brez locale. */
export const loadTextSettings = cache(async (): Promise<TextSettings> => (await loadConfig("en")).text);

/**
 * Vrstice za urejanje v adminu: poleg razrešenega napisa nosijo še bazni id,
 * vpisano ime (prazno pri vgrajenih) in izbrani barvni žeton — obrazec mora
 * pokazati, kaj je res vpisano, ne tega, kar se privzeto izpiše.
 */
export type CategoryRow = Category & {
  id: string;
  kind: CategoryKind;
  rawLabel: string | null;
  colorToken: string | null;
};

export const loadCategoryRows = cache(async (locale: Locale): Promise<CategoryRow[]> => {
  await ensureSeeded();
  const rows = await db.category.findMany({ orderBy: [{ position: "asc" }, { key: "asc" }] });
  return rows.map((row) => ({
    ...resolve(row, locale),
    id: row.id,
    kind: row.kind as CategoryKind,
    rawLabel: row.label,
    colorToken: row.color,
  }));
});
