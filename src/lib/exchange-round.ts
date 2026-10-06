import { RETURN_RESOLUTIONS } from "./domain";

/**
 * Krogi menjave.
 *
 * Stranka lahko menja več kot enkrat: dobi nadomestek, pa ji ta spet ne ustreza.
 * Postavke naročila zato vedno kažejo TEKOČI krog — `variant` je kos, ki ga ima
 * stranka zdaj, `replacementVariant` kos, ki ga želi. Ob začetku novega kroga se
 * prejšnji zapiše kot posnetek, postavke pa se prestavijo: kar smo poslali,
 * postane kos, ki ga ima stranka.
 *
 * Pravilo za vsak naslednji krog:
 *  - napaka pri nas → stranka kos obdrži, vračila ne pričakujemo;
 *  - ni naša napaka → stranka kos vrne kot prvič in sama plača menjavo.
 */

export const ROUND_FAULTS = ["customer", "ours"] as const;
export type RoundFault = (typeof ROUND_FAULTS)[number];

export function isRoundFault(value: unknown): value is RoundFault {
  return typeof value === "string" && (ROUND_FAULTS as readonly string[]).includes(value);
}

export type RoundItem = {
  id: number;
  name: string;
  variant: string | null;
  replacementVariant: string | null;
  /** Drug izdelek, v katerega se menja; null = menjava znotraj istega izdelka. */
  replacementName?: string | null;
  qty: number;
  resolution: string;
};

/** Postavka, kakor je bila ob koncu kroga. */
export type RoundLine = Omit<RoundItem, "id"> & { issueItemId: number };

export type RoundBlocker = "active" | "noExchange";

/** Zakaj novega kroga še ni mogoče začeti; null, kadar ga je. */
export function roundBlocker(items: RoundItem[], activeAllocations: number): RoundBlocker | null {
  // Rezerviran paket, ki še ni odšel, pripada tekočemu krogu — nov krog bi ga
  // pustil brez lastnika.
  if (activeAllocations > 0) return "active";
  if (!items.some(isShippedExchange)) return "noExchange";
  return null;
}

const isShippedExchange = (item: Pick<RoundItem, "resolution" | "replacementVariant">) =>
  item.resolution === "exchange" && Boolean(item.replacementVariant);

export function snapshotLines(items: RoundItem[]): RoundLine[] {
  return items.map((item) => ({
    issueItemId: item.id,
    name: item.name,
    variant: item.variant,
    replacementVariant: item.replacementVariant,
    replacementName: item.replacementName ?? null,
    qty: item.qty,
    resolution: item.resolution,
  }));
}

/**
 * Postavke za naslednji krog. Pri menjavi z izbrano zamenjavo ima stranka zdaj
 * poslani kos, novega bo šele izbrala. Vračila in postavke brez ukrepa so bile
 * rešene v prejšnjem krogu in v novem ne sodelujejo — sicer bi jih register
 * pričakoval še enkrat. Menjava brez izbrane zamenjave ostane, kakor je: zanjo
 * ni odšlo še nič.
 */
/** Postavka, kakor se zapiše ob začetku novega kroga. `name` je prisoten samo,
 *  kadar se izdelek z menjavo spremeni. */
export type NextRoundItem = {
  id: number;
  name?: string;
  variant: string | null;
  replacementVariant: null;
  replacementName: null;
  resolution: string;
};

export function nextRoundItems(items: RoundItem[]): NextRoundItem[] {
  return items.map((item) => {
    if (isShippedExchange(item)) {
      // Kar je odšlo, ima stranka zdaj — tudi kadar je bil to drug izdelek:
      // takrat se z novim krogom spremeni tudi ime postavke.
      return {
        id: item.id,
        ...(item.replacementName ? { name: item.replacementName } : {}),
        variant: item.replacementVariant,
        replacementVariant: null,
        replacementName: null,
        resolution: "exchange",
      };
    }
    if (item.resolution === "exchange") {
      return { id: item.id, variant: item.variant, replacementVariant: null, replacementName: null, resolution: "exchange" };
    }
    return { id: item.id, variant: item.variant, replacementVariant: null, replacementName: null, resolution: "none" };
  });
}

type LineText = Pick<RoundItem, "name" | "variant" | "replacementVariant" | "replacementName" | "qty" | "resolution">;

/** Ime kosa, ki ga stranka pri menjavi dobi. */
const replacementLabel = (line: LineText) => line.replacementName || line.name;

const label = (line: Pick<RoundItem, "name" | "qty">, variant: string | null) =>
  `${line.qty}× ${[line.name, variant].filter(Boolean).join(" ")}`;

/** Kaj je v krogu odšlo: "1× Nero pants M → L". */
export function roundSummary(lines: LineText[]): string {
  return lines
    .filter(isShippedExchange)
    .map((line) => {
      const target = line.replacementName
        ? [line.replacementName, line.replacementVariant].filter(Boolean).join(" ")
        : line.replacementVariant;
      return `${label(line, line.variant)} → ${target}`;
    })
    .join(", ");
}

/** Kaj ima stranka po začetku novega kroga: poslani kosi menjave. */
export function heldAfterRound(lines: LineText[]): string {
  return lines
    .filter(isShippedExchange)
    .map((line) => label({ name: replacementLabel(line), qty: line.qty }, line.replacementVariant))
    .join(", ");
}

/** Kaj mora v tekočem krogu priti nazaj. */
export function returningNow(lines: LineText[]): string {
  return lines.filter((line) => RETURN_RESOLUTIONS.has(line.resolution)).map((line) => label(line, line.variant)).join(", ");
}

export type ReturnRow = { name: string; variant: string | null; qty: number };

/**
 * S čim se izpolni novo vračilo, preden ga človek popravi. Kadar je menjava
 * tekočega kroga odšla, stranka vrača poslani kos in vračilo začne nov krog.
 * Sicer je to še en paket istega kroga (npr. kos, ki ga je stranka pozabila
 * dati v prvi paket), izpolnjen s postavkami, ki se vračajo.
 */
export function suggestedReturnRows(items: RoundItem[]): { newRound: boolean; rows: ReturnRow[] } {
  const shipped = items.filter(isShippedExchange);
  if (shipped.length > 0) {
    return {
      newRound: true,
      // Stranka vrača kos, ki smo ji ga poslali — pri menjavi v drug izdelek je
      // to drug izdelek, ne tisti iz naročila.
      rows: shipped.map((item) => ({ name: item.replacementName || item.name, variant: item.replacementVariant, qty: item.qty })),
    };
  }
  return {
    newRound: false,
    rows: items
      .filter((item) => RETURN_RESOLUTIONS.has(item.resolution))
      .map((item) => ({ name: item.name, variant: item.variant, qty: item.qty })),
  };
}

/**
 * Vrstice vsebine paketa iz obrazca. Prazna vrstica je odstranjena vrstica;
 * vrstica z varianto, a brez imena ali z nesmiselno količino, je napaka —
 * register z ugibanjem ne sme dobiti kosa, ki ga v paketu ni.
 */
export function parseReturnRows(names: unknown[], variants: unknown[], qtys: unknown[], max = 20): ReturnRow[] | null {
  const cell = (values: unknown[], index: number, length: number) =>
    typeof values[index] === "string" ? (values[index] as string).trim().slice(0, length) : "";
  const rows: ReturnRow[] = [];
  for (let index = 0; index < names.length; index += 1) {
    const name = cell(names, index, 200);
    const variant = cell(variants, index, 120) || null;
    if (!name && !variant) continue;
    const qtyText = cell(qtys, index, 6);
    const qty = /^\d+$/.test(qtyText) ? Number.parseInt(qtyText, 10) : 0;
    if (!name || qty < 1 || qty > 9999) return null;
    rows.push({ name, variant, qty });
  }
  return rows.length > 0 && rows.length <= max ? rows : null;
}

const plain = (value: string | null | undefined) => (value ?? "")
  .normalize("NFKD")
  .replace(/[̀-ͯ]/g, "")
  .toLocaleLowerCase("en")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

/** Nepovezani ShipGerman paketi: najprej tisti, katerih pošiljatelj nosi ime stranke. */
export function rankPackages<T extends { sender: string | null }>(packages: T[], customerName: string | null): { suggested: T[]; other: T[] } {
  const tokens = plain(customerName).split(" ").filter((token) => token.length >= 3);
  const suggested: T[] = [];
  const other: T[] = [];
  for (const parcel of packages) {
    const sender = ` ${plain(parcel.sender)} `;
    if (tokens.length > 0 && tokens.some((token) => sender.includes(` ${token} `))) suggested.push(parcel);
    else other.push(parcel);
  }
  return { suggested, other };
}

/** Posnetek iz baze; pokvarjen zapis da prazen seznam, ne napake na strani. */
export function parseLines(json: string | null | undefined): RoundLine[] {
  try {
    const value: unknown = JSON.parse(json ?? "[]");
    return Array.isArray(value) ? value.filter(isLine) : [];
  } catch {
    return [];
  }
}

function isLine(value: unknown): value is RoundLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return typeof line.issueItemId === "number"
    && typeof line.name === "string"
    && typeof line.qty === "number"
    && typeof line.resolution === "string"
    && (line.variant === null || typeof line.variant === "string")
    && (line.replacementVariant === null || typeof line.replacementVariant === "string");
}

export type ExpectedLine = { issueItemId: number | null; name: string; variant: string | null; qty: number };

/**
 * Kaj mora biti v povratnem paketu, ki je nastal v krogu `parcelRound`.
 *
 * Paket tekočega kroga prinaša kose, ki jih ima stranka zdaj. Pozno prispel paket
 * prejšnjega kroga prinaša kose, kakor so bili takrat — iz posnetka, ki je nastal
 * ob začetku naslednjega kroga. Brez posnetka ne ugibamo: prazen seznam pošlje
 * zapis med odstopanja, kjer ga pogleda človek.
 */
export function expectedReturnLines(
  parcelRound: number,
  currentRound: number,
  items: RoundItem[],
  rounds: { number: number; previous: string }[],
): ExpectedLine[] {
  const source: RoundLine[] = parcelRound >= currentRound
    ? snapshotLines(items)
    : parseLines(rounds.find((round) => round.number === parcelRound + 1)?.previous);
  // Postavke se ob urejanju zamenjajo z novimi, zato stara povezava ne sme
  // kazati na postavko, ki je ni več.
  const alive = new Set(items.map((item) => item.id));
  return source
    .filter((line) => RETURN_RESOLUTIONS.has(line.resolution))
    .map((line) => ({
      issueItemId: alive.has(line.issueItemId) ? line.issueItemId : null,
      name: line.name,
      variant: line.variant,
      qty: line.qty,
    }));
}

type ExchangeShape = { name: string; variant: string | null; replacementVariant: string | null; qty: number; resolution: string };

/**
 * Ali se je spremenilo, kaj menjamo. Ko je nadomestek kroga odposlan, je to
 * zgodovina: kdor bi zdaj popravil velikost, bi prepisal, kaj je stranka dobila.
 * Nova želja stranke je nov krog.
 */
export function exchangeChanged(before: ExchangeShape[], after: ExchangeShape[]): boolean {
  const key = (items: ExchangeShape[]) => items
    .filter((item) => item.resolution === "exchange")
    .map((item) => [item.name, item.variant ?? "", item.replacementVariant ?? "", item.qty].join(" "))
    .sort()
    .join("");
  return key(before) !== key(after);
}
