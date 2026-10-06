export const locales = ["sl", "en"] as const;
export type Locale = (typeof locales)[number];

export function asLocale(value: unknown): Locale {
  return value === "sl" ? "sl" : "en";
}

/**
 * Slovenščina ima štiri oblike (1 artikel, 2 artikla, 3 artikli, 5 artiklov),
 * angleščina dve. Ključi se končajo s to obliko, npr. "items.count.two".
 */
export function pluralSuffix(locale: Locale, count: number): "one" | "two" | "few" | "other" {
  const form = new Intl.PluralRules(locale === "sl" ? "sl-SI" : "en-US").select(count);
  return form === "one" || form === "two" || form === "few" ? form : "other";
}

export type Vars = Record<string, string | number>;

export function interpolate(value: string, vars?: Vars): string {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}
