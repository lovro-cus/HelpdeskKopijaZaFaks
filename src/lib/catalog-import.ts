/**
 * Izdelki iz Shopifyja v obliko kataloga.
 *
 * Isto pravilo velja za CSV izvoz (iz njega nastane seme za prazno bazo) in za
 * branje prek Shopify API-ja — izdelek ne sme izgledati drugače glede na to, od
 * kod je prišel.
 */

export type CatalogOption = { key: string; label: string; values: string[] };

export type CatalogVariant = {
  /** Shopifyjev sestavljeni naslov, npr. "Nero / M / EU 46 / W30 / Uomo". */
  title: string;
  selection: Record<string, string>;
  /** Slika konkretne variante; pogosto je določena z barvo. */
  image: string | null;
  price: number | null;
};

export type ImportedProduct = {
  shopifyId: string | null;
  handle: string;
  title: string;
  status: string;
  price: number | null;
  image: string | null;
  options: CatalogOption[];
  variants: CatalogVariant[];
  language: string | null;
};

const normalize = (value: string) => value.trim().toLocaleLowerCase("de-DE");

/** Imena opcij v vseh jezikih trgovine → skupni ključ. */
const OPTION_KEYS: Record<string, string[]> = {
  color: ["color", "colour", "farbe", "colore", "couleur", "kleur", "barva"],
  size: ["size", "größe", "grösse", "grosse", "taglia", "taille", "talla", "maat", "velikost"],
  gender: ["gender", "geschlecht", "genere", "genre", "sexe", "género", "genero", "geslacht", "spol"],
};

export function optionKey(name: string, index: number): string {
  const normalized = normalize(name);
  for (const [key, names] of Object.entries(OPTION_KEYS)) {
    if (names.includes(normalized)) return key;
  }
  return `option${index + 1}`;
}

/**
 * Ime opcije → jezik. "Color" je hkrati angleško in špansko, zato ne šteje;
 * odločijo ostale opcije (Talla ali Size).
 */
const OPTION_LANGUAGE: Record<string, string> = {
  farbe: "de", "größe": "de", "grösse": "de", geschlecht: "de",
  colore: "it", taglia: "it", genere: "it",
  couleur: "fr", taille: "fr", genre: "fr", sexe: "fr",
  talla: "es", "género": "es", genero: "es",
  kleur: "nl", maat: "nl", geslacht: "nl",
  colour: "en", size: "en", gender: "en",
  barva: "sl", velikost: "sl", spol: "sl",
};

/** Izdelek brez opcij (pas, očala) izda jezik z nazivom. */
const TITLE_LANGUAGE: [RegExp, string][] = [
  [/(motorradhose|motorradjacke|gürtel|nachtfahrbrille|sitzkissen|\bfür\b|fahrten|atmungsaktive|handschuhe)/i, "de"],
  [/\b(pantaloni|cintura|giacca|guanti|occhiali)\b/i, "it"],
  [/\b(pantalon|ceinture|veste|gants|lunettes)\b/i, "fr"],
  [/\b(pantalones|cinturón|chaqueta|guantes|gafas)\b/i, "es"],
  [/\b(motorbroek|riem|jas|handschoenen|bril)\b/i, "nl"],
  [/\b(pants|belt|jacket|gloves|jeans|glasses|breathable)\b/i, "en"],
];

export function detectLanguage(optionNames: string[], title: string): string | null {
  const scores = new Map<string, number>();
  for (const name of optionNames) {
    const language = OPTION_LANGUAGE[normalize(name)];
    if (language) scores.set(language, (scores.get(language) ?? 0) + 1);
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked[0] && ranked[0][1] !== ranked[1]?.[1]) return ranked[0][0];
  for (const [pattern, language] of TITLE_LANGUAGE) {
    if (pattern.test(title)) return language;
  }
  return ranked[0]?.[0] ?? null;
}

/** Ime datoteke slike brez poizvedbe — isti kos ima na vseh trgih isto sliko. */
export function imageKey(url: string | null | undefined): string | null {
  if (!url) return null;
  const path = url.split("?")[0]!.split("#")[0]!;
  const name = path.slice(path.lastIndexOf("/") + 1);
  return name || null;
}

type VariantRow = { values: string[]; image: string | null; price: number | null };

function buildProduct(
  base: Omit<ImportedProduct, "options" | "variants" | "language">,
  optionNames: string[],
  rows: VariantRow[],
): ImportedProduct {
  const meta = optionNames
    .map((label, index) => ({ label: label.trim(), index }))
    .filter((option) => option.label && option.label !== "Title")
    .map((option) => ({ ...option, key: optionKey(option.label, option.index) }));

  const variants: CatalogVariant[] = rows
    .filter((row) => row.values.some((value) => value && value !== "Default Title"))
    .map((row) => {
      const selection: Record<string, string> = {};
      for (const option of meta) {
        const value = row.values[option.index];
        if (value && value !== "Default Title") selection[option.key] = value;
      }
      return {
        title: meta.map((option) => selection[option.key]).filter(Boolean).join(" / "),
        selection,
        image: row.image,
        price: row.price,
      };
    });

  const options = meta
    .map(({ key, label }) => ({
      key,
      label,
      values: [...new Set(variants.map((variant) => variant.selection[key]).filter((value): value is string => Boolean(value)))],
    }))
    .filter((option) => option.values.length > 0);

  return { ...base, options, variants, language: detectLanguage(meta.map((option) => option.label), base.title) };
}

const priceOf = (raw: string | null | undefined) => {
  const price = Number(raw);
  return Number.isFinite(price) && price > 0 ? price : null;
};

// --- CSV izvoz ---------------------------------------------------------------

/** Minimalni CSV po RFC 4180 — polja v izvozu vsebujejo HTML z vejicami in novimi vrsticami. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** Shopify izpiše naziv samo pri prvi vrstici izdelka, ostale variante ga podedujejo. */
export function productsFromCsv(rows: string[][]): ImportedProduct[] {
  const header = (rows[0] ?? []).map((cell) => cell.trim());
  const at = (row: string[], name: string) => (row[header.indexOf(name)] ?? "").trim();

  type Draft = { base: Omit<ImportedProduct, "options" | "variants" | "language">; optionNames: string[]; rows: VariantRow[] };
  const drafts = new Map<string, Draft>();

  for (const row of rows.slice(1)) {
    if (row.length < header.length / 2) continue;
    const handle = at(row, "Handle");
    if (!handle) continue;

    let draft = drafts.get(handle);
    if (!draft) {
      draft = { base: { shopifyId: null, handle, title: "", status: "active", price: null, image: null }, optionNames: ["", "", ""], rows: [] };
      drafts.set(handle, draft);
    }
    const title = at(row, "Title");
    if (title && !draft.base.title) {
      draft.base.title = title;
      draft.base.status = at(row, "Status") || "active";
    }
    // Slika na položaju 1 je glavna; gostuje jo Shopifyjev CDN.
    if (at(row, "Image Position") === "1" && at(row, "Image Src")) draft.base.image = at(row, "Image Src");
    const price = priceOf(at(row, "Variant Price"));
    if (price !== null && draft.base.price === null) draft.base.price = price;
    for (let i = 0; i < 3; i++) {
      const name = at(row, `Option${i + 1} Name`);
      if (name && !draft.optionNames[i]) draft.optionNames[i] = name;
    }
    const values = [at(row, "Option1 Value"), at(row, "Option2 Value"), at(row, "Option3 Value")];
    if (values.some(Boolean)) draft.rows.push({ values, image: at(row, "Variant Image") || null, price });
  }

  return [...drafts.values()]
    .filter((draft) => draft.base.title)
    .map((draft) => buildProduct(draft.base, draft.optionNames, draft.rows))
    .sort((a, b) => a.title.localeCompare(b.title) || a.handle.localeCompare(b.handle));
}

// --- Shopify Admin API ----------------------------------------------------------

type MediaImage = { preview?: { image?: { url?: string | null } | null } | null };

export type ShopifyProductNode = {
  id: string;
  handle: string;
  title: string;
  status: string;
  featuredMedia?: MediaImage | null;
  options: { name: string; position?: number | null }[];
  variants: {
    nodes: {
      title: string;
      price: string | null;
      selectedOptions: { name: string; value: string }[];
      media?: { nodes: MediaImage[] } | null;
    }[];
  };
};

export function productFromShopify(node: ShopifyProductNode): ImportedProduct {
  const options = [...node.options].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const optionNames = options.map((option) => option.name);
  const rows: VariantRow[] = node.variants.nodes.map((variant) => ({
    values: optionNames.map((name) => variant.selectedOptions.find((option) => option.name === name)?.value ?? ""),
    image: variant.media?.nodes[0]?.preview?.image?.url ?? null,
    price: priceOf(variant.price),
  }));
  return buildProduct(
    {
      shopifyId: node.id,
      handle: node.handle,
      title: node.title,
      status: node.status.toLowerCase(),
      price: rows.find((row) => row.price !== null)?.price ?? null,
      image: node.featuredMedia?.preview?.image?.url ?? null,
    },
    optionNames,
    rows,
  );
}
