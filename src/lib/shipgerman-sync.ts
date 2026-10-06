import "server-only";

import type { ShipGermanCachedParcel } from "@prisma/client";

import { db } from "./db";
import { reconcileShipGermanLinks } from "./shipg-linking";
import { shippedStockNote, stockThatLeftShipGerman } from "./shipg-shipped";
import { getShipGermanParcels, getShipGermanShipments } from "./shipgerman";
import type { ShipGermanParcel, ShipGermanResult, ShipGermanShipmentsResult } from "./shipgerman";

export const SHIPGERMAN_SYNC_KEY = "inventory";

export type ShipGermanSyncOutcome =
  | { ok: true; count: number; fetchedAt: Date }
  | { ok: false; reason: Extract<ShipGermanResult, { ok: false }>["reason"] };

declare global {
  // eslint-disable-next-line no-var
  var shipGermanSyncInFlight: Promise<ShipGermanSyncOutcome> | undefined;
}

export function syncShipGermanInventory(): Promise<ShipGermanSyncOutcome> {
  if (globalThis.shipGermanSyncInFlight) return globalThis.shipGermanSyncInFlight;
  const operation = performShipGermanSync().finally(() => {
    if (globalThis.shipGermanSyncInFlight === operation) globalThis.shipGermanSyncInFlight = undefined;
  });
  globalThis.shipGermanSyncInFlight = operation;
  return operation;
}

async function performShipGermanSync(): Promise<ShipGermanSyncOutcome> {
  const result = await getShipGermanParcels();
  // Kopija za faks: skladišče ni povezano, zaloga v bazi ostane, kakršna je.
  if (!result.ok && result.reason === "not_configured") return result;
  if (!result.ok) {
    await db.shipGermanSyncState.upsert({
      where: { key: SHIPGERMAN_SYNC_KEY },
      create: { key: SHIPGERMAN_SYNC_KEY, status: "error", error: result.reason },
      update: { status: "error", error: result.reason },
    });
    return result;
  }

  const now = result.fetchedAt;
  await db.$transaction(async (tx) => {
    await tx.shipGermanCachedParcel.updateMany({ where: { active: true }, data: { active: false } });
    for (const parcel of result.parcels) {
      const data = {
        arrivalDate: parcel.arrivalDate,
        barcode: parcel.barcode,
        carrier: parcel.carrier,
        lengthMm: parcel.dimensionsMm[0],
        widthMm: parcel.dimensionsMm[1],
        heightMm: parcel.dimensionsMm[2],
        sender: parcel.sender,
        trackingNumber: parcel.trackingNumber,
        weightGrams: parcel.weightGrams,
        location: parcel.location,
        labelAvailable: parcel.labelAvailable,
        active: true,
        lastSeenAt: now,
      };
      await tx.shipGermanCachedParcel.upsert({
        where: { id: parcel.id },
        create: { id: parcel.id, ...data },
        update: data,
      });
    }
    await tx.shipGermanSyncState.upsert({
      where: { key: SHIPGERMAN_SYNC_KEY },
      create: { key: SHIPGERMAN_SYNC_KEY, status: "ok", fetchedAt: now, error: null },
      update: { status: "ok", fetchedAt: now, error: null },
    });
  });

  await reconcileShipGermanLinks(result.parcels);
  // Umakni iz zaloge pakete, ki so ze v odposlanih posiljkah (tudi mimo sistema).
  await deactivateShippedParcels();
  await closeShippedStock();

  // Odposlane pošiljke so LOČEN, počasnejši sync (paginiran endpoint). Sproži se
  // s svojim gumbom / urnikom, ne ob osvežitvi zaloge — da refresh zaloge ostane
  // hiter.
  return { ok: true, count: result.parcels.length, fetchedAt: now };
}

export type ShipGermanShipmentsSyncOutcome =
  | { ok: true; count: number; fetchedAt: Date }
  | { ok: false; reason: Extract<ShipGermanShipmentsResult, { ok: false }>["reason"] };

declare global {
  // eslint-disable-next-line no-var
  var shipGermanShipmentsSyncInFlight: Promise<ShipGermanShipmentsSyncOutcome> | undefined;
  // eslint-disable-next-line no-var
  var shipGermanShipmentsQuickInFlight: Promise<ShipGermanShipmentsSyncOutcome> | undefined;
}

// Ročna osvežitev potegne le najnovejše strani (nove/spremenjene so vedno na
// vrhu); polno zgodovino osveži ozadje.
const QUICK_SHIPMENT_PAGES = 2;

/** Povleče VSE odposlane pošiljke in jih vpiše v predpomnilnik (ozadje). Zapisov
 *  ne briše — zgodovina odposlanega ostane. Ločen od sinhronizacije zaloge. */
export function syncShipGermanShipments(): Promise<ShipGermanShipmentsSyncOutcome> {
  if (globalThis.shipGermanShipmentsSyncInFlight) return globalThis.shipGermanShipmentsSyncInFlight;
  const operation = performShipGermanShipmentsSync().finally(() => {
    if (globalThis.shipGermanShipmentsSyncInFlight === operation) globalThis.shipGermanShipmentsSyncInFlight = undefined;
  });
  globalThis.shipGermanShipmentsSyncInFlight = operation;
  return operation;
}

/** Hitra osvežitev: le najnovejše strani. Za gumb »Osveži« v Odposlano. */
export function syncRecentShipGermanShipments(): Promise<ShipGermanShipmentsSyncOutcome> {
  if (globalThis.shipGermanShipmentsQuickInFlight) return globalThis.shipGermanShipmentsQuickInFlight;
  const operation = performShipGermanShipmentsSync(QUICK_SHIPMENT_PAGES).finally(() => {
    if (globalThis.shipGermanShipmentsQuickInFlight === operation) globalThis.shipGermanShipmentsQuickInFlight = undefined;
  });
  globalThis.shipGermanShipmentsQuickInFlight = operation;
  return operation;
}

async function performShipGermanShipmentsSync(maxPages?: number): Promise<ShipGermanShipmentsSyncOutcome> {
  const result = await getShipGermanShipments(maxPages);
  if (!result.ok) return result;

  const now = result.fetchedAt;
  await db.$transaction(async (tx) => {
    for (const shipment of result.shipments) {
      const data = {
        parcelId: shipment.parcelId,
        status: shipment.status,
        actualShipDate: shipment.actualShipDate,
        plannedShipDate: shipment.plannedShipDate,
        tracking: shipment.tracking,
        trackingLink: shipment.trackingLink,
        shipMethod: shipment.shipMethod,
        price: shipment.price,
        sender: shipment.sender,
        invoiceAvailable: shipment.invoiceAvailable,

        weightGrams: shipment.weightGrams,
        lengthMm: shipment.lengthMm,
        widthMm: shipment.widthMm,
        heightMm: shipment.heightMm,
        insurance: shipment.insurance,
        incoterm: shipment.incoterm,
        kind: shipment.kind,
        isEU: shipment.isEU,
        isVAT: shipment.isVAT,
        isPickupPoint: shipment.isPickupPoint,
        isConsolidation: shipment.isConsolidation,
        locations: shipment.locations,
        altTrackings: shipment.altTrackings,

        parcelTracking: shipment.parcelTracking,
        parcelCarrier: shipment.parcelCarrier,
        parcelBarcode: shipment.parcelBarcode,
        parcelArrival: shipment.parcelArrival,
        parcelDwellDays: shipment.parcelDwellDays,
        labelAvailable: shipment.labelAvailable,

        fetchedAt: now,
      };
      await tx.shipGermanCachedShipment.upsert({
        where: { id: shipment.id },
        create: { id: shipment.id, ...data },
        update: data,
      });
    }
  });

  // Novo odposlane pakete takoj umakni iz aktivne zaloge.
  await deactivateShippedParcels();
  await closeShippedStock();

  return { ok: true, count: result.shipments.length, fetchedAt: now };
}

export function cachedShipGermanParcel(row: ShipGermanCachedParcel): ShipGermanParcel {
  return {
    id: row.id,
    arrivalDate: row.arrivalDate,
    barcode: row.barcode,
    carrier: row.carrier,
    dimensionsMm: [row.lengthMm, row.widthMm, row.heightMm],
    sender: row.sender,
    trackingNumber: row.trackingNumber,
    weightGrams: row.weightGrams,
    location: row.location,
    labelAvailable: row.labelAvailable,
  };
}

export async function getCachedShipGermanParcels() {
  const rows = await db.shipGermanCachedParcel.findMany({ where: { active: true }, orderBy: { arrivalDate: "desc" } });
  return rows.map(cachedShipGermanParcel);
}

/**
 * Paketi, ki so že v odposlanih pošiljkah (status Shipped ali ReadyForProcessing),
 * niso vec razpolozljiva zaloga - tudi ce jih ShipGerman se vraca v parcels/list
 * (npr. odprema mimo sistema). Umaknemo jih iz aktivne zaloge, da izginejo iz
 * zaloge in ponudb za odpremo. Vrne stevilo umaknjenih.
 */
export async function deactivateShippedParcels(): Promise<number> {
  const shipped = await db.shipGermanCachedShipment.findMany({
    where: { status: { in: ["Shipped", "ReadyForProcessing"] }, parcelId: { not: null } },
    select: { parcelId: true },
  });
  const ids = [...new Set(shipped.flatMap((row) => (row.parcelId ? [row.parcelId] : [])))];
  if (ids.length === 0) return 0;
  const result = await db.shipGermanCachedParcel.updateMany({
    where: { id: { in: ids }, active: true },
    data: { active: false },
  });
  return result.count;
}

/**
 * Zapise "v zalogi", katerih paket je ShipGerman že odposlal, zapre kot
 * odposlane in to zapiše v nit ticketa. Glej stockThatLeftShipGerman.
 */
export async function closeShippedStock(): Promise<number> {
  const records = await db.shipgReturn.findMany({
    where: { status: "stocked", shipgermanParcelId: { not: null } },
    select: { id: true, status: true, shipgermanParcelId: true, issueId: true, allocation: { select: { status: true } } },
  });
  if (records.length === 0) return 0;
  const shipments = await db.shipGermanCachedShipment.findMany({
    where: { status: "Shipped", parcelId: { in: records.flatMap((record) => record.shipgermanParcelId ? [record.shipgermanParcelId] : []) } },
    select: { parcelId: true, status: true, tracking: true, actualShipDate: true },
  });
  const issueByRecord = new Map(records.map((record) => [record.id, record.issueId]));
  const shipped = stockThatLeftShipGerman(
    records.map((record) => ({ ...record, allocationStatus: record.allocation?.status ?? null })),
    shipments,
  );

  let closed = 0;
  for (const item of shipped) {
    await db.$transaction(async (tx) => {
      // Pogoj na status: ročno dejanje med sinhronizacijo ima prednost.
      const changed = await tx.shipgReturn.updateMany({
        where: { id: item.recordId, status: "stocked" },
        data: { status: "shipped" },
      });
      if (changed.count !== 1) return;
      closed += 1;
      const issueId = issueByRecord.get(item.recordId);
      if (issueId) {
        await tx.event.create({
          data: {
            issueId,
            kind: "system",
            field: "shipg",
            fromValue: "stocked",
            toValue: "shipped",
            body: shippedStockNote(item),
            ...(item.shippedAt ? { createdAt: item.shippedAt } : {}),
          },
        });
      }
    });
  }
  if (closed > 0) console.log(`[ShipGerman] Closed ${closed} stocked record(s) whose parcel already shipped.`);
  return closed;
}
