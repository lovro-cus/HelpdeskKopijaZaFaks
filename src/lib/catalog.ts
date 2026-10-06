import type { CatalogOption, CatalogVariant } from "./catalog-import";
import { canonicalKey, canonicalVariantLabel } from "./catalog-canonical";
import { catalogSnapshot, groupByKey, groupKeyOfTitle, productsTitled, type SnapshotProduct } from "./catalog-registry";

/**
 * Branje kataloga za postavke naročil: nazivi, opcije, variante, cene in slike.
 *
 * Isti naziv lahko nosi več izdelkov (angleški in nemški "TrailShield™ Green
 * Motorcycle Pants" z različnimi opcijami). Zato vsaka funkcija izbere izdelek,
 * čigar varianta se ujema s tem, kar že vemo — sicer bi nemško naročilo iskalo
 * "Grün / Herren" med angleškimi "Green / Male" in ne našlo ničesar.
 */

export type { CatalogOption, CatalogVariant };

const usable = (product: SnapshotProduct) => !product.missing && product.status !== "archived";

/** Nazivi za izbiro izdelka: brez izdelkov, ki jih v Shopifyju ni več. */
export function catalogTitles(): string[] {
  return [...new Set(catalogSnapshot().products.filter(usable).map((product) => product.title))]
    .sort((a, b) => a.localeCompare(b));
}

function productFor(title: string, match?: { variant?: string | null; selection?: Record<string, string> }): SnapshotProduct | null {
  const candidates = productsTitled(title);
  if (candidates.length <= 1) return candidates[0] ?? null;

  const variant = match?.variant?.trim();
  if (variant) {
    const exact = candidates.find((product) => product.variants.some((entry) => entry.title === variant));
    if (exact) return exact;
  }
  const selected = Object.entries(match?.selection ?? {}).filter(([, value]) => value);
  if (selected.length > 0) {
    const fitting = candidates.find((product) =>
      selected.every(([key, value]) => product.options.some((option) => option.key === key && option.values.includes(value))));
    if (fitting) return fitting;
  }
  return candidates.find(usable) ?? candidates[0]!;
}

export function optionsOf(title: string, variant?: string | null): CatalogOption[] {
  return productFor(title, { variant })?.options ?? [];
}

/** Vse variante izdelka (za izbiro nadomestka pri menjavi). */
export function variantsOf(title: string, variant?: string | null): CatalogVariant[] {
  return productFor(title, { variant })?.variants ?? [];
}

/** Razstavi sestavljeni zapis variante v imenovane Shopifyjeve opcije. */
export function selectionOf(title: string, variantTitle: string): Record<string, string> {
  return productFor(title, { variant: variantTitle })?.variants.find((variant) => variant.title === variantTitle)?.selection ?? {};
}

/** Opcije sestavi v obliko, ki jo razumejo stari zapisi in Shopify API. */
export function variantTitleOf(title: string, selection: Record<string, string>): string {
  const product = productFor(title, { selection });
  return (product?.options ?? []).map((option) => selection[option.key]).filter(Boolean).join(" / ");
}

/** Cena izdelka iz kataloga — predlog, ki ga je vedno mogoče popraviti. */
export function priceOf(title: string): number | null {
  return productFor(title)?.price ?? null;
}

/**
 * Sličica izdelka v želeni širini. Shopifyjev CDN skalira sam, zato ne
 * vlečemo večmegabajtnih izvirnikov: pri width=96 gre za dobrih 10 kB.
 */
export function imageOf(title: string, width: number, selection: Record<string, string> = {}): string | null {
  const product = productFor(title, { selection });
  if (!product) return null;
  const selected = Object.entries(selection).filter(([, value]) => value);
  const variant = selected.length > 0
    ? product.variants.find((entry) => selected.every(([key, value]) => entry.selection[key] === value))
    : undefined;
  const url = variant?.image ?? product.image;
  if (!url) return null;
  return `${url}${url.includes("?") ? "&" : "?"}width=${width}`;
}

/* --- izbira po skupinah ---------------------------------------------------
 *
 * Isti kos ima v Shopifyju svoj izdelek za vsak trg IN za vsako barvo:
 * "TrailShield Black/Green/Camouflage Motorcycle Pants", "ScudoStrada
 * Pantaloni", "SchutzWerk Motorradhose" so vsi ene hlače. Spustni seznam
 * vseh nazivov je zato seznam iste stvari dvanajstkrat, barva pa je v njem
 * skrita kot del imena, čeprav je drugod varianta.
 *
 * Izbira zato teče po SKUPINAH, kakor jih nastavi admin: izbereš "TrailShield
 * hlače" in nato "Zelena · XL". Shrani se še vedno konkreten Shopifyjev
 * naziv — tisti izdelek, ki izbrano varianto res ima — da slike, cene in
 * ujemanje zaloge delajo naprej. Izdelek brez skupine nastopa sam zase.
 */

/** Izbirna enota: skupina ("g:trailshield-pants") ali posamezen izdelek ("t:<naziv>"). */
export type CatalogGroupOption = { id: string; label: string };

export function groupIdOfTitle(title: string): string {
  const key = groupKeyOfTitle(title);
  return key ? `g:${key}` : `t:${title}`;
}

/**
 * Nazivi skupine, po vrsti: najprej izdelki v jeziku, v katerem je stranka
 * naročila. Naziv gre namreč tudi v pismo stranki — italijanski naziv v
 * nemškem pismu bi bil napaka, čeprav gre za iste hlače.
 */
function titlesOfGroupId(id: string, preferLike?: string | null): string[] {
  const products = catalogSnapshot().products.filter(usable);
  if (!id.startsWith("g:")) return [id.slice(2)];

  const key = id.slice(2);
  const language = preferLike ? productsTitled(preferLike).find(usable)?.language ?? null : null;
  const inGroup = products.filter((product) => groupKeyOfTitle(product.title) === key);
  const ordered = language
    ? [...inGroup].sort((a, b) => Number(b.language === language) - Number(a.language === language))
    : inGroup;
  return [...new Set(ordered.map((product) => product.title))];
}

/** Izbirni seznam: vsaka skupina enkrat, negrupirani izdelki pa po svojem nazivu. */
export function catalogGroupOptions(): CatalogGroupOption[] {
  const seen = new Set<string>();
  const options: CatalogGroupOption[] = [];
  for (const title of catalogTitles()) {
    const id = groupIdOfTitle(title);
    if (seen.has(id)) continue;
    seen.add(id);
    const key = id.startsWith("g:") ? id.slice(2) : null;
    options.push({ id, label: (key && groupByKey(key)?.label) || title });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

/** Varianta znotraj skupine skupaj z izdelkom, ki jo v resnici nosi. */
export type GroupVariant = { key: string; label: string; title: string; variant: string };

/**
 * Vse variante skupine, kanonično združene: isti fizični kos med trgi se
 * pojavi enkrat. Barva je tu varianta, ne izdelek — čeprav jo Shopify nosi
 * kot ločen izdelek.
 */
export function groupVariantsOf(id: string, preferLike?: string | null): GroupVariant[] {
  const seen = new Set<string>();
  const result: GroupVariant[] = [];
  for (const title of titlesOfGroupId(id, preferLike)) {
    for (const product of productsTitled(title).filter(usable)) {
      for (const variant of product.variants) {
        const key = canonicalKey(title, variant.title);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ key, label: canonicalVariantLabel(title, variant.title), title, variant: variant.title });
      }
    }
  }
  return result.sort((a, b) => a.label.localeCompare(b.label));
}

/** Konkreten naziv izdelka, ki naj predstavlja skupino, dokler varianta ni izbrana. */
export function representativeTitleOf(id: string, preferLike?: string | null): string {
  return titlesOfGroupId(id, preferLike)[0] ?? id.slice(2);
}
