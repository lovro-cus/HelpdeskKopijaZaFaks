/**
 * Šifrant vrst in prioritet, kakor ga vidita strežnik in klient. Čisto — brez
 * baze — da sme v obe smeri.
 *
 * Vrednosti prihajajo iz baze, vgrajene pa imajo v kodi še vedno privzeto ime
 * (prevod) in barvo. Zato ima zapis dvoje: `key`, ki se zapiše v ticket in se
 * nikoli ne spremeni, in `label`, ki je zgolj napis.
 */

import { SYSTEM_TYPE } from "../domain";

export type CategoryKind = "type" | "priority";

export const CATEGORY_KINDS: CategoryKind[] = ["type", "priority"];

/**
 * Razrešena vrstica šifranta: napis je že preveden, barva že CSS vrednost.
 * Tako klientu ni treba poznati ne slovarja ne žetonov.
 */
export type Category = {
  key: string;
  label: string;
  /** CSS vrednost (npr. "var(--stamp)"). Vrste barve ne nosijo — nosi jo beseda. */
  color: string;
  position: number;
  hidden: boolean;
  requiresReturn: boolean;
  /** Ali dnevno preverjanje pri tej vrsti spremlja odpremo naročila. */
  watchFulfillment: boolean;
  builtin: boolean;
};

/**
 * Barve, med katerimi admin izbira pri prioriteti. Namenoma jih je malo in so
 * vse iz DESIGN.md: prosta izbira odtenka bi v nekaj mesecih razbila red, ki
 * ga sistem drži s tem, da je barv malo in vsaka nekaj pomeni.
 */
export const CATEGORY_COLORS = ["stamp", "warning", "petrol", "ink-2", "ink-3"] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export function isCategoryColor(value: string | null | undefined): value is CategoryColor {
  return CATEGORY_COLORS.includes(value as CategoryColor);
}

export function colorValue(token: string | null | undefined, fallback: string): string {
  return isCategoryColor(token) ? `var(--${token})` : fallback;
}

/** Ključ, kakršen sme v bazo: mala latinica, števke in vezaj. */
export function normalizeCategoryKey(raw: string): string | null {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return key.length >= 2 ? key : null;
}

/** Vidne vrstice — tiste, ki še nastopajo v izbirnikih in filtrih. */
export function visible(categories: Category[]): Category[] {
  return categories.filter((category) => !category.hidden);
}

/** Vrste, ki jih sme izbrati človek. »Nerazvrščeno« dobi samo sistemski ticket. */
export function assignableTypes(types: Category[]): Category[] {
  return visible(types).filter((type) => type.key !== SYSTEM_TYPE);
}

export function findCategory(categories: Category[], key: string): Category | undefined {
  return categories.find((category) => category.key === key);
}

/**
 * Napis za vrednost, ki je v šifrantu ni več (star ticket, pobrisana vrsta).
 * Raje ključ kot prazen prostor — iz njega se še vidi, kaj je bilo.
 */
export function labelOf(categories: Category[], key: string): string {
  return findCategory(categories, key)?.label ?? key;
}

/** Mesto v šifrantu; neznano gre na konec. Osnova za razvrščanje po vrsti. */
export function rankOf(categories: Category[], key: string): number {
  const index = categories.findIndex((category) => category.key === key);
  return index === -1 ? categories.length : index;
}

/**
 * Ali prioriteta preseže uporabnikov prag za e-pošto. Prag je sama prioriteta:
 * "high" pomeni "nujno in visoko". Neznan prag beremo kot najnižjega — bolje
 * preveč pošte kot tiho zamolčana predaja.
 */
export function meetsThreshold(
  priorities: Category[],
  priority: string,
  threshold: string | null | undefined,
): boolean {
  const known = priorities.some((item) => item.key === threshold);
  const limit = known ? threshold! : priorities[priorities.length - 1]?.key;
  if (!limit) return true;
  return rankOf(priorities, priority) <= rankOf(priorities, limit);
}
