/**
 * Izgled vmesnika, ki si ga vsak nastavi v profilu. Hranimo ga kot JSON na
 * uporabniku (`User.appearance`), zato velja na vsakem računalniku. Na stran
 * pride kot `data-*` atributi na <html>; vse ostalo naredi globals.css.
 *
 * Modul je čist — bere ga strežnik (korenski layout, akcija) in odjemalec
 * (takojšnji predogled v profilu).
 */

export const COLOR_SCHEMES = ["worksheet", "blueprint", "pencil", "ledger", "graphite", "contrast"] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Odstotki. Povečava gre skozi CSS `zoom`, zato rastejo tudi gumbi in razmiki. */
export const TEXT_SIZES = [90, 100, 110, 125, 140] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const TEXT_FONTS = ["plex", "hyperlegible", "system"] as const;
export type TextFont = (typeof TEXT_FONTS)[number];

export type Appearance = {
  scheme: ColorScheme;
  /**
   * Null pomeni, da uporabnik teme v profilu še ni izbral. Takrat velja stara
   * izbira iz brskalnika (`localStorage.theme`) ali nastavitev sistema — da
   * nikomur, ki je imel temno temo, ob posodobitvi ne posveti v oči.
   */
  mode: ThemeMode | null;
  textSize: TextSize;
  font: TextFont;
  grid: boolean;
  reduceMotion: boolean;
};

export const DEFAULT_APPEARANCE: Appearance = {
  scheme: "worksheet",
  mode: null,
  textSize: 100,
  font: "plex",
  grid: true,
  reduceMotion: false,
};

const pick = <T extends string | number>(options: readonly T[], value: unknown): T | undefined =>
  options.find((option) => option === value);

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return asRecord(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/** Posamezna veljavna polja iz poljubnega vnosa; neznano in pokvarjeno izpade. */
function validFields(raw: unknown): Partial<Appearance> {
  const input = asRecord(raw);
  const out: Partial<Appearance> = {};
  const scheme = pick(COLOR_SCHEMES, input.scheme);
  if (scheme) out.scheme = scheme;
  if (input.mode === null) out.mode = null;
  const mode = pick(THEME_MODES, input.mode);
  if (mode) out.mode = mode;
  const textSize = pick(TEXT_SIZES, input.textSize);
  if (textSize) out.textSize = textSize;
  const font = pick(TEXT_FONTS, input.font);
  if (font) out.font = font;
  if (typeof input.grid === "boolean") out.grid = input.grid;
  if (typeof input.reduceMotion === "boolean") out.reduceMotion = input.reduceMotion;
  return out;
}

/** Shranjen JSON (ali karkoli) → popoln izgled s privzetimi vrednostmi. */
export function parseAppearance(raw: unknown): Appearance {
  return { ...DEFAULT_APPEARANCE, ...validFields(raw) };
}

/** Delna sprememba iz obrazca. Neveljavno polje pusti obstoječo vrednost. */
export function mergeAppearance(current: Appearance, patch: unknown): Appearance {
  return { ...current, ...validFields(patch) };
}

/** Kaj se shrani: samo polja, ki odstopajo od privzetih. */
export function serializeAppearance(appearance: Appearance): string {
  const changed = Object.fromEntries(
    Object.entries(appearance).filter(([key, value]) => DEFAULT_APPEARANCE[key as keyof Appearance] !== value),
  );
  return JSON.stringify(changed);
}

export type AppearanceAttributes = {
  "data-scheme": ColorScheme;
  "data-mode": ThemeMode | undefined;
  "data-text-size": string | undefined;
  "data-font": TextFont | undefined;
  "data-grid": "off" | undefined;
  "data-motion": "reduced" | undefined;
};

/** Atributi za <html>. Privzete vrednosti ne dobijo atributa, razen sheme. */
export function appearanceAttributes(appearance: Appearance): AppearanceAttributes {
  return {
    "data-scheme": appearance.scheme,
    "data-mode": appearance.mode ?? undefined,
    "data-text-size": appearance.textSize === 100 ? undefined : String(appearance.textSize),
    "data-font": appearance.font === "plex" ? undefined : appearance.font,
    "data-grid": appearance.grid ? undefined : "off",
    "data-motion": appearance.reduceMotion ? "reduced" : undefined,
  };
}

/**
 * Ali je stran temna. Izbira v profilu ima prednost, nato stara izbira iz
 * brskalnika, na koncu sistem.
 */
export function resolveDark(mode: string | null | undefined, stored: string | null | undefined, systemDark: boolean): boolean {
  const effective = pick(THEME_MODES, mode) ?? pick(THEME_MODES, stored) ?? "system";
  return effective === "dark" || (effective === "system" && systemDark);
}
