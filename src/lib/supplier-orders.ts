import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import ExcelJS from "exceljs";

import { createExchangeShippedDraft } from "./customer-draft";
import { db } from "./db";
import { MAX_PARCELS } from "./domain";
import { notify } from "./notifications";
import {
  matchImportRows,
  parseImportTable,
  supplierOrderCode,
  type ImportVerdict,
  type MatchedRow,
} from "./supplier-import";
import { syncParcels } from "./tracking/sync";
import { tracker } from "./tracking/offline";

export type SupplierItem = { qty: number; name: string; variant: string | null };

export const SUPPLIER_ORDER_STATUSES = ["open", "exported", "shipped", "cancelled"] as const;
export type SupplierOrderStatus = (typeof SUPPLIER_ORDER_STATUSES)[number];

/** Zahteve, ki še čakajo na dobavitelja. */
export const PENDING_STATUSES = ["open", "exported"];

export function parseSupplierItems(raw: string): SupplierItem[] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const { qty, name, variant } = item as Record<string, unknown>;
      if (typeof name !== "string" || !name) return [];
      return [{ qty: typeof qty === "number" && qty > 0 ? qty : 1, name, variant: typeof variant === "string" && variant ? variant : null }];
    });
  } catch {
    return [];
  }
}

export const itemLabel = (item: SupplierItem) => `${item.qty}× ${item.name}${item.variant ? ` – ${item.variant}` : ""}`;

export const supplierOrderInclude = {
  issue: { select: { key: true, orderNumber: true, customerName: true } },
  createdBy: { select: { name: true } },
} as const;

export async function loadSupplierOrders(statuses: readonly string[]) {
  return db.supplierOrder.findMany({
    where: { status: { in: [...statuses] } },
    orderBy: { createdAt: "asc" },
    include: supplierOrderInclude,
  });
}

type ExportOrder = Awaited<ReturnType<typeof loadSupplierOrders>>[number];

/**
 * Zahteve pri dobavitelju, ki bi jih lahko izvedli sami: v ShipG zalogi je
 * paket, ki natanko pokrije menjavo. Napaka v zalogi (API, sinhronizacija)
 * ne sme ustaviti izvoza — takrat ne vemo nič in izvozimo kot doslej.
 */
export async function supplierOrdersCoveredByStock(): Promise<Set<number>> {
  try {
    const { findExchangeStockMatches } = await import("./exchange-stock");
    return new Set((await findExchangeStockMatches()).flatMap((match) => (match.supplierOrder ? [match.supplierOrder.id] : [])));
  } catch (error) {
    console.error("[Supplier] Stock check failed", error);
    return new Set();
  }
}

// --- izvoz ----------------------------------------------------------------

/** Stolpci datoteke za dobavitelja. Glave so angleške, ker jo bere dobavitelj. */
const EXPORT_COLUMNS: { header: string; key: string; width: number }[] = [
  { header: "Request ID", key: "code", width: 12 },
  { header: "Order", key: "order", width: 10 },
  { header: "Date", key: "requested", width: 12 },
  { header: "Qty", key: "qty", width: 6 },
  { header: "Product", key: "product", width: 34 },
  { header: "Variant", key: "variant", width: 24 },
  { header: "Name", key: "name", width: 24 },
  { header: "Company", key: "company", width: 18 },
  { header: "Address 1", key: "address1", width: 30 },
  { header: "Address 2", key: "address2", width: 18 },
  { header: "ZIP", key: "zip", width: 10 },
  { header: "City", key: "city", width: 18 },
  { header: "Region", key: "province", width: 14 },
  { header: "Country", key: "country", width: 14 },
  { header: "Country code", key: "countryCode", width: 8 },
  { header: "Phone", key: "phone", width: 16 },
  { header: "Email", key: "email", width: 26 },
  { header: "Note", key: "note", width: 30 },
  { header: "Tracking", key: "tracking", width: 24 },
  { header: "Carrier", key: "carrier", width: 14 },
];

/**
 * Ena vrstica na artikel: dobavitelj pakira po kosih. Zahteva z dvema kosoma
 * ima dve vrstici z istim ID — tracking zadošča v eni od njiju.
 */
export async function buildSupplierWorkbook(orders: ExportOrder[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HelpDesk";
  const sheet = workbook.addWorksheet("Orders", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = EXPORT_COLUMNS;
  sheet.getRow(1).font = { bold: true };

  for (const order of orders) {
    const items = parseSupplierItems(order.items);
    for (const item of items.length ? items : [{ qty: 1, name: "", variant: null }]) {
      sheet.addRow({
        code: supplierOrderCode(order.id),
        order: order.issue.orderNumber,
        requested: order.createdAt.toISOString().slice(0, 10),
        qty: item.qty,
        product: item.name,
        variant: item.variant ?? "",
        name: order.recipient ?? "",
        company: order.company ?? "",
        address1: order.address1 ?? "",
        address2: order.address2 ?? "",
        zip: order.zip ?? "",
        city: order.city ?? "",
        province: order.province ?? "",
        country: order.country ?? "",
        countryCode: order.countryCode ?? "",
        phone: order.phone ?? "",
        email: order.email ?? "",
        note: order.note ?? "",
        tracking: order.tracking ?? "",
        carrier: order.carrier ?? "",
      });
    }
  }
  // Poštne številke in telefoni morajo ostati besedilo, sicer Excel pobere
  // vodilne ničle ("01234" → 1234).
  for (const key of ["zip", "phone", "tracking", "order"]) sheet.getColumn(key).numFmt = "@";

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Prva izvozena zahteva gre iz "open" v "exported"; ponoven izvoz jo pusti. */
export async function markExported(ids: number[]) {
  if (!ids.length) return;
  await db.supplierOrder.updateMany({
    where: { id: { in: ids }, status: "open" },
    data: { status: "exported", exportedAt: new Date() },
  });
}

// --- uvoz -----------------------------------------------------------------

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    // Dolge številke Excel hrani kot število; brez eksponenta in decimalk.
    return Number.isInteger(value) ? BigInt(Math.round(value)).toString() : String(value);
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
  }
  return String(value);
}

/** Preprost CSV (vejica ali podpičje, narekovaji), za primer, ko pride tak. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < clean.length; index++) {
    const char = clean[index]!;
    if (quoted) {
      if (char === '"' && clean[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === separator) { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[index + 1] === "\n") index++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export async function readImportTable(file: File): Promise<string[][] | null> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (name.endsWith(".csv") || name.endsWith(".txt")) return parseCsv(buffer.toString("utf8"));
  if (!name.endsWith(".xlsx")) return null;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    return null;
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const table: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values: string[] = [];
    for (let column = 1; column <= row.cellCount; column++) values.push(cellText(row.getCell(column).value).trim());
    table[rowNumber - 1] = values;
  });
  return Array.from(table, (row) => row ?? []);
}

export type PreviewRow = {
  line: number;
  code: string | null;
  orderNumber: string | null;
  recipient: string | null;
  trackings: string[];
  invalid: string[];
  carrier: string | null;
  supplierOrderId: number | null;
  verdict: ImportVerdict;
};

export type ImportPreview =
  | { ok: true; rows: PreviewRow[] }
  | { ok: false; error: "noHeader" | "noTracking" | "empty" | "format" | "tooLarge" };

export async function previewImport(file: File): Promise<ImportPreview> {
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, error: "tooLarge" };
  const table = await readImportTable(file);
  if (!table) return { ok: false, error: "format" };
  const parsed = parseImportTable(table);
  if (!parsed.ok) return parsed;
  const matched = await matchAgainstDb(parsed.rows);
  const details = new Map((await db.supplierOrder.findMany({
    where: { id: { in: matched.flatMap((row) => (row.supplierOrderId ? [row.supplierOrderId] : [])) } },
    select: { id: true, recipient: true, issue: { select: { orderNumber: true } } },
  })).map((order) => [order.id, order]));
  return {
    ok: true,
    rows: matched.map((row) => {
      const detail = row.supplierOrderId ? details.get(row.supplierOrderId) : undefined;
      return {
        line: row.line,
        code: row.supplierOrderId ? supplierOrderCode(row.supplierOrderId) : row.code ? supplierOrderCode(row.code) : null,
        orderNumber: detail?.issue.orderNumber ?? row.orderNumber,
        recipient: detail?.recipient ?? null,
        trackings: row.trackings,
        invalid: row.invalid,
        carrier: row.carrier,
        supplierOrderId: row.supplierOrderId,
        verdict: row.verdict,
      };
    }),
  };
}

async function matchAgainstDb(rows: Parameters<typeof matchImportRows>[0]): Promise<MatchedRow[]> {
  const codes = rows.flatMap((row) => (row.code ? [row.code] : []));
  const orderNumbers = rows.flatMap((row) => (row.code === null && row.orderNumber ? [row.orderNumber] : []));
  const candidates = await db.supplierOrder.findMany({
    where: {
      OR: [
        { id: { in: codes } },
        ...(orderNumbers.length ? [{ issue: { orderNumber: { in: orderNumbers.flatMap((number) => [number, `#${number}`]) } } }] : []),
      ],
    },
    select: { id: true, status: true, tracking: true, issue: { select: { orderNumber: true } } },
  });
  return matchImportRows(rows, candidates.map((order) => ({
    id: order.id,
    status: order.status,
    tracking: order.tracking,
    orderNumber: order.issue.orderNumber,
  })));
}

export type TrackingEntry = { supplierOrderId: number; trackings: string[]; carrier: string | null };

/** Kdo vnaša: zaposleni (ima ID) ali dobavitelj sam prek portala. */
export type ImportActor = { userId: string | null; name: string };

async function registerTracking(number: string) {
  if (!tracker.configured()) return { state: "untracked", carrier: null as number | null, manualReason: "not_configured", registeredAt: null as Date | null };
  try {
    const [result] = await tracker.register([number]);
    if (result?.ok) return { state: "pending", carrier: result.carrier, manualReason: null, registeredAt: new Date() };
    return { state: "untracked", carrier: null, manualReason: result?.error ?? "failed", registeredAt: null };
  } catch (error) {
    console.error("Supplier tracking registration failed", error);
    return { state: "untracked", carrier: null, manualReason: "failed", registeredAt: null };
  }
}

/**
 * Zapiše tracking k zahtevi in na ticket: pošiljka k stranki, zapis v niti,
 * osnutek pisma s številko in obvestilo prevzemniku. Pismo samo NE odide —
 * pregleda in pošlje ga človek.
 *
 * Vrne ID-je zahtev, ki so tracking res dobile. Zahteva, ki je medtem dobila
 * tracking ali bila preklicana, se preskoči.
 */
export async function applyTrackings(entries: TrackingEntry[], actor: ImportActor): Promise<number[]> {
  const applied: number[] = [];
  for (const entry of entries) {
    const trackings = [...new Set(entry.trackings)].slice(0, MAX_PARCELS);
    if (!trackings.length) continue;
    const order = await db.supplierOrder.findUnique({
      where: { id: entry.supplierOrderId },
      include: { issue: { include: { items: true, _count: { select: { parcels: true } } } } },
    });
    if (!order || !PENDING_STATUSES.includes(order.status)) continue;
    const issue = order.issue;

    const existing = new Set((await db.parcel.findMany({
      where: { issueId: issue.id, number: { in: trackings } },
      select: { number: true },
    })).map((parcel) => parcel.number));
    const fresh = trackings.filter((number) => !existing.has(number)).slice(0, Math.max(0, MAX_PARCELS - issue._count.parcels));
    const registered = await Promise.all(fresh.map(async (number) => ({ number, ...(await registerTracking(number)) })));

    const now = new Date();
    const created = await db.$transaction(async (tx) => {
      // Ponovno preverimo znotraj transakcije: dva hkratna uvoza iste datoteke
      // ne smeta odpreti dvojnih pošiljk.
      const claimed = await tx.supplierOrder.updateMany({
        where: { id: order.id, status: { in: PENDING_STATUSES } },
        data: {
          status: "shipped",
          tracking: trackings.join(", "),
          carrier: entry.carrier,
          shippedAt: now,
          shippedBy: actor.name,
        },
      });
      if (claimed.count === 0) return null;

      const parcels = [];
      for (const item of registered) {
        const parcel = await tx.parcel.create({
          data: {
            issueId: issue.id,
            number: item.number,
            direction: "replacement",
            exchangeRound: order.exchangeRound,
            carrier: item.carrier,
            carrierName: entry.carrier,
            state: item.state,
            manualReason: item.manualReason,
            registeredAt: item.registeredAt,
          },
        });
        parcels.push(parcel);
        await tx.event.create({
          data: { issueId: issue.id, kind: "parcel", field: parcel.number, fromValue: null, toValue: parcel.state, authorId: actor.userId },
        });
      }
      if (parcels[0]) await tx.supplierOrder.update({ where: { id: order.id }, data: { parcelId: parcels[0].id } });

      await tx.event.create({
        data: {
          issueId: issue.id,
          kind: "system",
          field: "supplier_order",
          fromValue: order.status,
          toValue: "shipped",
          body: `${supplierOrderCode(order.id)} · ${trackings.join(", ")}${entry.carrier ? ` (${entry.carrier})` : ""} · ${actor.name}`,
          authorId: actor.userId,
        },
      });
      // Čakanje na dobavitelja je končano: ticket se vrne v delo, da kdo
      // pregleda in pošlje pismo s trackingom.
      if (issue.status === "waiting") {
        await tx.issue.update({ where: { id: issue.id }, data: { status: "open", waitingUntil: null, waitingReplySince: null } });
        await tx.event.create({
          data: { issueId: issue.id, kind: "status", field: "supplier_shipped", fromValue: "waiting", toValue: "open", authorId: actor.userId },
        });
      } else {
        await tx.issue.update({ where: { id: issue.id }, data: { updatedAt: now } });
      }
      return parcels;
    });
    if (!created) continue;
    applied.push(order.id);

    const pending = created.filter((parcel) => parcel.state === "pending");
    if (pending.length) {
      try {
        await syncParcels(pending, { fresh: true });
      } catch (error) {
        console.error("Supplier parcel sync failed", error);
      }
    }
    try {
      await createExchangeShippedDraft(issue, actor.userId ?? order.createdById, order.createdAt);
    } catch (error) {
      console.error("Supplier shipped draft failed", error);
    }
    const recipientId = issue.assigneeId ?? order.createdById;
    if (recipientId && recipientId !== actor.userId) {
      try {
        await notify({
          kind: "parcel",
          recipientId,
          issueId: issue.id,
          issueKey: issue.key,
          orderNumber: issue.orderNumber,
          actorName: actor.name,
          preview: `${supplierOrderCode(order.id)} · ${trackings.join(", ")}`,
          parcelNumber: trackings[0] ?? null,
        });
      } catch (error) {
        console.error("Supplier shipped notification failed", error);
      }
    }
  }
  return applied;
}

// --- portal za dobavitelja -----------------------------------------------

/**
 * Dobavitelj nima računa v Desku — dobi zasebno povezavo. V bazi je samo
 * zgostitev žetona; povezava se pokaže enkrat, ob ustvarjanju. Nova povezava
 * staro razveljavi.
 */
export const PORTAL_TOKEN_KEY = "supplierPortalTokenHash";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function rotatePortalToken(): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  const value = hashToken(token);
  await db.appSetting.upsert({ where: { key: PORTAL_TOKEN_KEY }, create: { key: PORTAL_TOKEN_KEY, value }, update: { value } });
  return token;
}

export async function disablePortalToken() {
  await db.appSetting.deleteMany({ where: { key: PORTAL_TOKEN_KEY } });
}

export async function portalEnabled(): Promise<{ enabled: boolean; since: Date | null }> {
  const row = await db.appSetting.findUnique({ where: { key: PORTAL_TOKEN_KEY } });
  return { enabled: Boolean(row), since: row?.updatedAt ?? null };
}

export async function validPortalToken(token: string | null | undefined): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const row = await db.appSetting.findUnique({ where: { key: PORTAL_TOKEN_KEY } });
  if (!row) return false;
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(row.value);
  return a.length === b.length && timingSafeEqual(a, b);
}
