import type { CatalogOption, CatalogVariant } from "./catalog-import";

/**
 * Katalog, kakor ga vidi koda: izdelki, skupine (isti kos v več jezikih) in
 * besede za barve in spol.
 *
 * Vir je baza (zavihek Izdelki v adminu). Ker pa katalog berejo sinhrone
 * funkcije na strežniku in v brskalniku (ujemanje zaloge, urejevalnik
 * postavk), stoji tu en posnetek, ki ga strežnik naloži iz baze, brskalnik pa
 * dobi iz postavitve strani. Brez posnetka katalog ne pozna ničesar in
 * ujemanje pade na točno primerjavo imen — nič se ne podre, samo manj ve.
 */

export type SnapshotProduct = {
  handle: string;
  title: string;
  status: string;
  price: number | null;
  image: string | null;
  options: CatalogOption[];
  variants: CatalogVariant[];
  language: string | null;
  /** Ključ skupine ali null. */
  group: string | null;
  /** V Shopifyju ga ni več. */
  missing: boolean;
};

export type SnapshotGroup = {
  key: string;
  label: string;
  genderAgnostic: boolean;
  /** Stari nazivi, ki jih nosijo zgodovinski zapisi. */
  aliases: string[];
};

export type CatalogSnapshot = {
  products: SnapshotProduct[];
  groups: SnapshotGroup[];
  /** Normalizirana beseda → kanonična barva (black, green …). */
  colors: Record<string, string>;
  /** Normalizirana beseda → kanonični spol (men, women). */
  genders: Record<string, string>;
};

export const EMPTY_SNAPSHOT: CatalogSnapshot = { products: [], groups: [], colors: {}, genders: {} };

/** Normalizacija za primerjavo: brez šumnikov, mala črka, samo alfanumerika. */
export function norm(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Index = {
  snapshot: CatalogSnapshot;
  byTitle: Map<string, SnapshotProduct[]>;
  groupByTitle: Map<string, string>;
  groupByKey: Map<string, SnapshotGroup>;
  colors: Map<string, string>;
  genders: Map<string, string>;
};

function buildIndex(snapshot: CatalogSnapshot): Index {
  const byTitle = new Map<string, SnapshotProduct[]>();
  const groupByTitle = new Map<string, string>();
  for (const product of snapshot.products) {
    const list = byTitle.get(product.title) ?? [];
    list.push(product);
    byTitle.set(product.title, list);
    if (product.group && !groupByTitle.has(norm(product.title))) groupByTitle.set(norm(product.title), product.group);
  }
  for (const group of snapshot.groups) {
    for (const alias of group.aliases) {
      if (!groupByTitle.has(norm(alias))) groupByTitle.set(norm(alias), group.key);
    }
  }
  return {
    snapshot,
    byTitle,
    groupByTitle,
    groupByKey: new Map(snapshot.groups.map((group) => [group.key, group])),
    colors: new Map(Object.entries(snapshot.colors).map(([word, color]) => [norm(word), color])),
    genders: new Map(Object.entries(snapshot.genders).map(([word, gender]) => [norm(word), gender])),
  };
}

let index: Index = buildIndex(EMPTY_SNAPSHOT);

/** Zamenja posnetek. Isti objekt drugič ne gradi kazal znova. */
export function setCatalogSnapshot(snapshot: CatalogSnapshot): void {
  if (index.snapshot === snapshot) return;
  index = buildIndex(snapshot);
}

export function catalogSnapshot(): CatalogSnapshot {
  return index.snapshot;
}

/** Vsi izdelki z istim nazivom — isti naziv lahko nosita nemški in angleški izdelek. */
export function productsTitled(title: string): SnapshotProduct[] {
  return index.byTitle.get(title) ?? [];
}

export function groupKeyOfTitle(title: string): string | null {
  return index.groupByTitle.get(norm(title)) ?? null;
}

export function groupByKey(key: string): SnapshotGroup | null {
  return index.groupByKey.get(key) ?? null;
}

export function colorOfWord(word: string): string | null {
  return index.colors.get(norm(word)) ?? null;
}

export function genderOfWord(word: string): string | null {
  return index.genders.get(norm(word)) ?? null;
}
