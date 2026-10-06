/**
 * Uvoz trackinga, ki ga vrne dobavitelj. Čisto (brez baze in brez Excela):
 * dobi tabelo celic kot besedilo, vrne, kateri zahtevi pripada katera številka.
 *
 * Datoteko pišemo mi, vrne pa jo človek, ki jo je lahko preuredil — stolpce
 * zato iščemo po glavi, ne po položaju, in dopuščamo še pot prek številke
 * naročila, kadar je ID zahteve izginil.
 */

import { normalizeNumber } from "./tracking/provider";

export const SUPPLIER_CODE_PREFIX = "SUP-";

export const supplierOrderCode = (id: number) => `${SUPPLIER_CODE_PREFIX}${id}`;

/** "SUP-12", "sup 12", "12" → 12. */
export function parseSupplierCode(raw: string): number | null {
  const match = raw.trim().match(/^(?:sup[\s-]*)?(\d{1,9})$/i);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Stolpci, ki jih prepoznamo, in besede, po katerih jih prepoznamo. */
const HEADERS = {
  code: ["requestid", "request", "id", "ref", "reference", "sup"],
  order: ["order", "ordernumber", "orderno", "ordernr", "bestellung"],
  tracking: ["tracking", "trackingnumber", "trackingno", "trackingnr", "trackingnumbers", "tracking", "sendungsnummer", "awb"],
  carrier: ["carrier", "courier", "shippingcompany", "spediteur"],
} as const;

type Column = keyof typeof HEADERS;

function columnOf(header: string): Column | null {
  const key = normalizeHeader(header);
  if (!key) return null;
  for (const column of ["tracking", "carrier", "order", "code"] as const) {
    if ((HEADERS[column] as readonly string[]).includes(key)) return column;
  }
  // "Tracking number (fill in)" in podobno — beseda je v glavi, ne cela glava.
  if (key.includes("tracking")) return "tracking";
  if (key.includes("carrier") || key.includes("courier")) return "carrier";
  if (key.includes("request")) return "code";
  if (key.startsWith("order")) return "order";
  return null;
}

export type ImportRow = {
  /** Vrstica v datoteki, kot jo vidi človek (1 = prva). */
  line: number;
  code: number | null;
  orderNumber: string | null;
  trackings: string[];
  /** Kar je v celici pisalo, pa ni številka za sledenje. */
  invalid: string[];
  carrier: string | null;
};

export type ParsedImport =
  | { ok: true; rows: ImportRow[] }
  | { ok: false; error: "noHeader" | "noTracking" | "empty" };

/** Ena celica lahko nosi več številk: "1Z…, 1Z…" ali vsako v svoji vrstici. */
export function splitTrackings(raw: string): { trackings: string[]; invalid: string[] } {
  const trackings: string[] = [];
  const invalid: string[] = [];
  for (const part of raw.split(/[,;\n\r/|]+/)) {
    const text = part.trim();
    if (!text) continue;
    const number = normalizeNumber(text);
    if (number) {
      if (!trackings.includes(number)) trackings.push(number);
    } else {
      invalid.push(text);
    }
  }
  return { trackings, invalid };
}

/** Prebere tabelo: poišče vrstico z glavo v prvih desetih in iz nje stolpce. */
export function parseImportTable(table: string[][]): ParsedImport {
  const rows = table.filter((row) => row.some((cell) => cell.trim() !== ""));
  if (rows.length === 0) return { ok: false, error: "empty" };

  let headerIndex = -1;
  let columns = new Map<Column, number>();
  for (let index = 0; index < Math.min(table.length, 10); index++) {
    const found = new Map<Column, number>();
    table[index]!.forEach((cell, position) => {
      const column = columnOf(cell);
      if (column && !found.has(column)) found.set(column, position);
    });
    if (found.has("tracking") && (found.has("code") || found.has("order"))) {
      headerIndex = index;
      columns = found;
      break;
    }
  }
  if (headerIndex < 0) {
    const anyTracking = table.slice(0, 10).some((row) => row.some((cell) => columnOf(cell) === "tracking"));
    return { ok: false, error: anyTracking ? "noHeader" : "noTracking" };
  }

  const cell = (row: string[], column: Column) => {
    const position = columns.get(column);
    return position === undefined ? "" : (row[position] ?? "").trim();
  };

  const parsed: ImportRow[] = [];
  for (let index = headerIndex + 1; index < table.length; index++) {
    const row = table[index]!;
    const trackingText = cell(row, "tracking");
    if (!trackingText) continue;
    const { trackings, invalid } = splitTrackings(trackingText);
    const orderText = cell(row, "order").replace(/^#/, "");
    parsed.push({
      line: index + 1,
      code: parseSupplierCode(cell(row, "code")),
      orderNumber: orderText || null,
      trackings,
      invalid,
      carrier: cell(row, "carrier").slice(0, 60) || null,
    });
  }
  return { ok: true, rows: parsed };
}

export type OpenSupplierOrder = {
  id: number;
  orderNumber: string;
  status: string;
  tracking: string | null;
};

export type ImportVerdict =
  | "ready"
  | "merged"
  | "unknown"
  | "ambiguous"
  | "alreadyShipped"
  | "cancelled"
  | "invalidTracking";

export type MatchedRow = ImportRow & { supplierOrderId: number | null; verdict: ImportVerdict };

const orderKey = (value: string) => value.trim().replace(/^#/, "").toUpperCase();

/**
 * Poveže vrstice z zahtevami. ID ima prednost; številka naročila velja samo,
 * kadar ima naročilo natanko eno odprto zahtevo — sicer ne vemo, kateri krog.
 *
 * Zahteva z več kosi ima v izvozu več vrstic. Tracking je lahko v eni ali v
 * vsaki (vsak kos v svojem paketu): številke se zberejo v prvo vrstico
 * zahteve, ostale so "merged".
 */
export function matchImportRows(rows: ImportRow[], orders: OpenSupplierOrder[]): MatchedRow[] {
  const byId = new Map(orders.map((order) => [order.id, order]));
  const first = new Map<number, MatchedRow>();
  return rows.map((row) => {
    let target: OpenSupplierOrder | undefined;
    let verdict: ImportVerdict | null = null;
    if (row.code !== null) {
      target = byId.get(row.code);
      if (!target) verdict = "unknown";
    } else if (row.orderNumber) {
      const candidates = orders.filter((order) =>
        orderKey(order.orderNumber) === orderKey(row.orderNumber!) && (order.status === "open" || order.status === "exported"));
      if (candidates.length === 1) target = candidates[0];
      else verdict = candidates.length ? "ambiguous" : "unknown";
    } else {
      verdict = "unknown";
    }

    if (!verdict && target) {
      if (target.status === "cancelled") verdict = "cancelled";
      else if (target.status === "shipped") verdict = "alreadyShipped";
      else if (row.trackings.length === 0) verdict = "invalidTracking";
      else verdict = "ready";
    }
    const matched: MatchedRow = { ...row, trackings: [...row.trackings], supplierOrderId: target?.id ?? null, verdict: verdict ?? "unknown" };
    if (matched.verdict === "ready" && target) {
      const lead = first.get(target.id);
      if (lead) {
        for (const number of matched.trackings) if (!lead.trackings.includes(number)) lead.trackings.push(number);
        lead.carrier ??= matched.carrier;
        matched.verdict = "merged";
      } else {
        first.set(target.id, matched);
      }
    }
    return matched;
  });
}
