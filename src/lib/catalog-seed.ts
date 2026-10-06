import { imageKey, type ImportedProduct } from "./catalog-import";
import { norm, type CatalogSnapshot, type SnapshotGroup } from "./catalog-registry";
import { SEED_PRODUCTS } from "./catalog-seed-products";

/**
 * Začetno znanje kataloga: s tem se napolni prazna baza. Skupine so tiste, ki
 * so bile prej zapisane v kodi (catalog-canonical.ts); novi izdelki pridejo brez
 * skupine in jih admin poveže sam — Desk mu to predlaga.
 */

export type SeedGroup = { key: string; label: string; genderAgnostic: boolean; titles: string[] };

export const SEED_GROUPS: SeedGroup[] = [
  {
    key: "everyday-chinos",
    label: "Everyday chino hlače",
    // Isti kos v angleški in nemški trgovini.
    genderAgnostic: false,
    titles: ["Kroj Everyday Chinos", "Kroj Alltags-Chino"],
  },
  { key: "essential-tee", label: "Essential majica", genderAgnostic: false, titles: ["Kroj Essential T-Shirt"] },
  { key: "merino-long-sleeve", label: "Merino majica z dolgimi rokavi", genderAgnostic: false, titles: ["Kroj Merino Long Sleeve"] },
  { key: "oversized-hoodie", label: "Oversized pulover", genderAgnostic: false, titles: ["Kroj Oversized Hoodie"] },
  { key: "slim-jeans", label: "Slim jeans", genderAgnostic: false, titles: ["Kroj Slim Jeans"] },
  { key: "cargo-pants", label: "Cargo hlače", genderAgnostic: false, titles: ["Kroj Cargo Pants"] },
  { key: "rain-jacket", label: "Dežna jakna", genderAgnostic: false, titles: ["Kroj Rain Jacket"] },
  { key: "socks", label: "Nogavice", genderAgnostic: false, titles: ["Kroj Cotton Socks (3 pairs)"] },
];

/** Barvne besede vseh trgov (in slovenske oznake) → kanonična barva. */
export const SEED_COLORS: Record<string, string> = {
  black: "black", schwarz: "black", nero: "black", negro: "black", noir: "black", zwart: "black", crna: "black",
  green: "green", grun: "green", gruen: "green", verde: "green", vert: "green", groen: "green", zelena: "green",
  camouflage: "camo", camo: "camo", mimetico: "camo", camuflaje: "camo",
  gray: "gray", grey: "gray", grau: "gray", grigio: "gray", gris: "gray", grijs: "gray", siva: "gray",
  blue: "blue", blau: "blue", blu: "blue", bleu: "blue", azul: "blue", blauw: "blue", modra: "blue",
  khaki: "khaki", kaki: "khaki", cachi: "khaki",
  red: "red", rot: "red", rosso: "red", rouge: "red", rojo: "red", rood: "red", rdeca: "red",
  orange: "orange", arancione: "orange", naranja: "orange", oranje: "orange", oranzna: "orange",
  pink: "pink", rosa: "pink", roze: "pink", roza: "pink",
  navy: "navy", marine: "navy", mornarska: "navy",
  beige: "beige", bez: "beige",
  yellow: "yellow", gelb: "yellow", giallo: "yellow", jaune: "yellow", rumena: "yellow",
  white: "white", weiss: "white", bianco: "white", blanc: "white", blanco: "white", wit: "white", bela: "white",
};

/** Besede za spol vseh trgov → kanonični spol. */
export const SEED_GENDERS: Record<string, string> = {
  herren: "men", uomo: "men", men: "men", male: "men", mann: "men", homme: "men", hombre: "men", heren: "men", moski: "men",
  damen: "women", donna: "women", women: "women", female: "women", frau: "women", femme: "women", mujer: "women", dames: "women", zenski: "women",
};

/** Kateri seme-izdelek spada v katero skupino — po nazivu. */
export function seedGroupOf(title: string): string | null {
  const key = norm(title);
  return SEED_GROUPS.find((group) => group.titles.some((candidate) => norm(candidate) === key))?.key ?? null;
}

/** Posnetek iz semena — za prazno bazo in za teste. */
export function seedSnapshot(): CatalogSnapshot {
  return snapshotOf(SEED_PRODUCTS, SEED_GROUPS);
}

/** Posnetek iz poljubnega semena (testi imajo svoj katalog). */
export function snapshotOf(seedProducts: ImportedProduct[], seedGroups: SeedGroup[]): CatalogSnapshot {
  const groupOf = (title: string) =>
    seedGroups.find((group) => group.titles.some((candidate) => norm(candidate) === norm(title)))?.key ?? null;
  const titles = new Set(seedProducts.map((product) => norm(product.title)));
  const groups: SnapshotGroup[] = seedGroups.map((group) => ({
    key: group.key,
    label: group.label,
    genderAgnostic: group.genderAgnostic,
    aliases: group.titles.filter((title) => !titles.has(norm(title))),
  }));
  return {
    products: seedProducts.map((product) => ({
      handle: product.handle,
      title: product.title,
      status: product.status,
      price: product.price,
      image: product.image,
      options: product.options,
      variants: product.variants,
      language: product.language,
      group: groupOf(product.title),
      missing: false,
    })),
    groups,
    colors: SEED_COLORS,
    genders: SEED_GENDERS,
  };
}

export { imageKey };
