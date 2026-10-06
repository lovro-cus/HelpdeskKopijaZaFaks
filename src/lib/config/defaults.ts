/**
 * Privzete vrednosti nastavitev in njihove meje. Ostajajo v kodi namenoma:
 * baza hrani samo odstopanje, zato sveža namestitev deluje brez vpisovanja,
 * in vrnitev na privzeto je brisanje vrstice, ne ugibanje števila.
 *
 * Datoteka je čista (brez baze in brez "server-only"), da jo sme uvoziti tudi
 * klient — meje so iste na obeh straneh obrazca.
 */

export type SettingKey =
  | "storageFreeDays"
  | "storageWarnDays"
  | "storageRate"
  | "parcelGraceHours"
  | "parcelStaleHours"
  | "parcelPollHours"
  | "shipMaxAgeDays"
  | "shipMaxAgeRareExempt"
  | "satisfactionReviewBelow"
  | "satisfactionNotify";

export type SettingDef = {
  /** Cela števila so dnevi in ure; "money" dovoli dve decimalki (tarifa). */
  kind: "int" | "money";
  default: number;
  min: number;
  max: number;
};

export const SETTING_DEFS: Record<SettingKey, SettingDef> = {
  // ShipGerman: prvih 14 dni je paket brezplačen, nato 0,60 € na dan.
  storageFreeDays: { kind: "int", default: 14, min: 0, max: 365 },
  storageWarnDays: { kind: "int", default: 10, min: 0, max: 365 },
  storageRate: { kind: "money", default: 0.6, min: 0, max: 100 },

  // Tracking: koliko časa dopustimo prevozniku, preden gre naročilo k človeku.
  parcelGraceHours: { kind: "int", default: 48, min: 1, max: 720 },
  parcelStaleHours: { kind: "int", default: 168, min: 1, max: 2160 },
  parcelPollHours: { kind: "int", default: 2, min: 1, max: 168 },


  // Paketov, starejših od toliko dni, ne pošiljamo več (dolg skladiščenja se
  // plača ob odpremi); 0 = brez praga. Ureja se v Urejanje → Skladišče.
  shipMaxAgeDays: { kind: "int", default: 45, min: 0, max: 3650 },
  // 1 = prag ne velja za redka ujemanja (paket z več kosi).
  shipMaxAgeRareExempt: { kind: "int", default: 1, min: 0, max: 1 },

  // Ocena zadovoljstva pod tem pragom gre v pregled (1–10; 10 = vse razen
  // desetke). Ureja se v Urejanje → Zadovoljstvo.
  satisfactionReviewBelow: { kind: "int", default: 5, min: 2, max: 10 },
  // 1 = nizka ocena sproži obvestilo v zvoncu.
  satisfactionNotify: { kind: "int", default: 1, min: 0, max: 1 },
};

export const SETTING_KEYS = Object.keys(SETTING_DEFS) as SettingKey[];

export type Settings = Record<SettingKey, number>;

export const DEFAULT_SETTINGS: Settings = Object.fromEntries(
  SETTING_KEYS.map((key) => [key, SETTING_DEFS[key].default]),
) as Settings;

/**
 * Prebere vpisano vrednost. Karkoli zunaj mej ali neštevilskega pade na
 * privzeto — nastavitev, ki bi jo bilo mogoče pokvariti z vpisom, bi tiho
 * ustavila obračun skladiščenja ali zbujanje pošiljk.
 */
export function parseSetting(key: SettingKey, raw: string | number | null | undefined): number | null {
  const def = SETTING_DEFS[key];
  const text = typeof raw === "number" ? String(raw) : String(raw ?? "").replace(",", ".").trim();
  // Prazno polje ni nič: Number("") je 0, kar bi tarifo tiho postavilo na nič.
  if (text === "") return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < def.min || value > def.max) return null;
  return def.kind === "int" ? (Number.isInteger(value) ? value : null) : Math.round(value * 100) / 100;
}

/** Skladiščenje potrebuje tri številke skupaj — podaja jih kot en kos. */
export type StorageConfig = { freeDays: number; warnDays: number; rate: number };

export const STORAGE_DEFAULTS: StorageConfig = {
  freeDays: SETTING_DEFS.storageFreeDays.default,
  warnDays: SETTING_DEFS.storageWarnDays.default,
  rate: SETTING_DEFS.storageRate.default,
};

export function storageConfig(settings: Settings): StorageConfig {
  return {
    freeDays: settings.storageFreeDays,
    warnDays: settings.storageWarnDays,
    rate: settings.storageRate,
  };
}

/** Časovna varovala za pošiljke. */
export type ParcelConfig = { graceHours: number; staleHours: number };

export const PARCEL_DEFAULTS: ParcelConfig = {
  graceHours: SETTING_DEFS.parcelGraceHours.default,
  staleHours: SETTING_DEFS.parcelStaleHours.default,
};

export function parcelConfig(settings: Settings): ParcelConfig {
  return { graceHours: settings.parcelGraceHours, staleHours: settings.parcelStaleHours };
}

/* --- besedilne nastavitve -------------------------------------------------
 *
 * Nastavitve zgoraj so števila in tako naj ostanejo: meje, privzetki in
 * preverjanje so zanje eno in isto pravilo. Imena pa so besedilo, zato imajo
 * svojo, namenoma drobno plast — brez mej, samo dolžina.
 */

export type TextSettingKey = "supplierName";

export type TextSettingDef = { default: string; maxLength: number };

export const TEXT_SETTING_DEFS: Record<TextSettingKey, TextSettingDef> = {
  // Kdor pri dobavitelju ureja menjave. Ime gre v prošnjo, ki jo Desk zapiše v
  // ticket, in na gumb, ki jo sproži — da piše "prosi Tekstil Mura", ne "prosi dobavitelja".
  supplierName: { default: "Tekstil Mura", maxLength: 60 },
};

export const TEXT_SETTING_KEYS = Object.keys(TEXT_SETTING_DEFS) as TextSettingKey[];

export type TextSettings = Record<TextSettingKey, string>;

export const DEFAULT_TEXT_SETTINGS: TextSettings = Object.fromEntries(
  TEXT_SETTING_KEYS.map((key) => [key, TEXT_SETTING_DEFS[key].default]),
) as TextSettings;

/** Prazno ime ni nastavitev, ampak prošnja brez naslovnika — zato null (napaka). */
export function parseTextSetting(key: TextSettingKey, raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return value.slice(0, TEXT_SETTING_DEFS[key].maxLength);
}
