import { ITEM_RESOLUTIONS, MAX_ITEMS, PENDING_RESOLUTION } from "./domain";

/**
 * Postavke naročila potujejo skozi obrazec kot vzporedni seznami: vsak vnos
 * prispeva po eno vrednost v `item.name`, `item.variant`, `item.qty`,
 * `item.amount` in `item.resolution`. Tako ostane obrazec navaden HTML in
 * deluje tudi, če JavaScript odpove sredi urejanja.
 */

export type ParsedItem = {
  name: string;
  variant: string | null;
  replacementVariant: string | null;
  /** Null = menjava ostane pri istem izdelku. */
  replacementName: string | null;
  priceDiffSettled: boolean;
  /** Stranka je dobila drug kos; `name`/`variant` sta prejeti kos. */
  wrongItemSent: boolean;
  orderedName: string | null;
  orderedVariant: string | null;
  qty: number;
  amount: number | null;
  resolution: string;
  position: number;
};

const NAMES = [
  "item.name", "item.variant", "item.replacementVariant", "item.replacementName",
  "item.priceDiffSettled", "item.qty", "item.amount", "item.resolution",
  "item.wrongItemSent", "item.orderedName", "item.orderedVariant",
] as const;

/** Ali obrazec sploh vsebuje urejevalnik postavk. Brez tega jih ne spreminjamo. */
export function hasItemsSection(fd: FormData): boolean {
  return fd.get("itemsPresent") === "1";
}

function cell(values: FormDataEntryValue[], index: number, max: number): string {
  const raw = values[index];
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

export function parseItems(fd: FormData): ParsedItem[] {
  const [names, variants, replacementVariants, replacementNames, priceDiffs, qtys, amounts, resolutions, wrongs, orderedNames, orderedVariants] =
    NAMES.map((n) => fd.getAll(n));

  const items: ParsedItem[] = [];
  for (let i = 0; i < names.length && items.length < MAX_ITEMS; i++) {
    const name = cell(names, i, 200);
    if (!name) continue; // prazna vrstica = izbrisana vrstica

    const qty = Number.parseInt(cell(qtys, i, 6), 10);
    const amount = Number(cell(amounts, i, 20).replace(",", "."));
    const resolution = cell(resolutions, i, 20);
    // Oznaka brez naročenega kosa ne pove ničesar — takrat je ni.
    const orderedName = cell(orderedNames, i, 200) || null;
    const wrongItemSent = cell(wrongs, i, 4) === "1" && orderedName !== null;

    items.push({
      name,
      variant: cell(variants, i, 120) || null,
      replacementVariant: cell(replacementVariants, i, 120) || null,
      // Prazno ali enako izdelku pomeni menjavo znotraj istega izdelka; v bazi
      // naj bo takrat null, da ni dveh zapisov za isto stvar.
      replacementName: replacementNameOf(cell(replacementNames, i, 200), name),
      priceDiffSettled: cell(priceDiffs, i, 4) === "1",
      wrongItemSent,
      orderedName: wrongItemSent ? orderedName : null,
      orderedVariant: wrongItemSent ? cell(orderedVariants, i, 120) || null : null,
      qty: Number.isFinite(qty) && qty > 0 ? Math.min(qty, 9999) : 1,
      amount: Number.isFinite(amount) && amount >= 0 && cell(amounts, i, 20) !== "" ? amount : null,
      // Neizbrana rešitev ostane neizbrana: shranjevanje drugih vrstic je ne sme
      // na tiho spremeniti v vračilo.
      resolution: ITEM_RESOLUTIONS.some((r) => r.id === resolution) || resolution === PENDING_RESOLUTION ? resolution : "refund",
      position: items.length,
    });
  }
  return items;
}

function replacementNameOf(raw: string, name: string): string | null {
  if (!raw || raw.toLocaleLowerCase() === name.toLocaleLowerCase()) return null;
  return raw;
}

/** Kratek zapis za dnevnik dogodkov: "Jacket XL ×1 · vračilo". */
export function summarizeItems(
  items: {
    name: string; variant: string | null; replacementVariant?: string | null;
    replacementName?: string | null; qty: number; resolution: string;
  }[],
  label: (resolution: string) => string,
): string | null {
  if (items.length === 0) return null;
  const text = items
    .map((i) => {
      const head = [i.name, i.variant].filter(Boolean).join(" ");
      // Menjava v drug izdelek mora v dnevniku pokazati izdelek, sicer bi bilo
      // "→ L" videti kot menjava velikosti.
      const replacement = i.resolution === "exchange" && i.replacementVariant
        ? ` → ${[i.replacementName, i.replacementVariant].filter(Boolean).join(" ")}`
        : "";
      return `${head} ×${i.qty} · ${label(i.resolution)}${replacement}`;
    })
    .join(", ");
  return text.length > 240 ? `${text.slice(0, 237)}…` : text;
}

/**
 * Odtis postavk za ugotavljanje, ali se je sploh kaj spremenilo.
 *
 * Povzetek za dnevnik za to ne zadošča: bere se ga človek, zato ne nosi vsega,
 * kar se shrani — potrjena razlika v ceni je v njem nevidna in sprememba bi se
 * tiho izgubila.
 */
export function itemsFingerprint(
  items: {
    name: string; variant: string | null; replacementVariant?: string | null;
    replacementName?: string | null; priceDiffSettled?: boolean;
    wrongItemSent?: boolean; orderedName?: string | null; orderedVariant?: string | null;
    qty: number; amount: number | null; resolution: string;
  }[],
): string {
  return items
    .map((i) =>
      [
        i.name, i.variant ?? "", i.replacementName ?? "", i.replacementVariant ?? "",
        i.priceDiffSettled ? "1" : "", i.qty, i.amount ?? "", i.resolution,
        i.wrongItemSent ? "1" : "", i.orderedName ?? "", i.orderedVariant ?? "",
      ].join(""),
    )
    .join("");
}
