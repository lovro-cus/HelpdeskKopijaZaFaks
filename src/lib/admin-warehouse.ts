import "server-only";

import { ensureCatalog } from "./catalog-server";
import { db } from "./db";
import { shipCutoff, tooOldToShip } from "./ship-cutoff";
import { packagePieces } from "./shipg-matching";
import { accruedCost, ageTier, dailyCost, storageDays, type AgeTier } from "./storage-cost";
import { storageConfig } from "./config/defaults";
import { loadSettings } from "./config/server";

export type WarehouseStats = {
  parcels: number;
  identified: number;
  unidentified: number;
  /** Paketi, vezani na zapis v naši zalogi (vemo, čigavi so). */
  linked: number;
  /** Plačljivi ("danger") so tu brez tistih čez prag starosti — ti so spodaj. */
  byTier: Record<AgeTier, number>;
  /** Čez prag starosti (Urejanje → Skladišče), razdeljeni kot na seznamu Za
   *  odpremo: ne pošiljamo jih / paket z več kosi čaka na redko ujemanje /
   *  ostali (neidentificirani, rezervirani, niso v naši zalogi). Brez praga 0. */
  old: { notShipping: number; rareWaiting: number; other: number };
  maxAgeDays: number;
  oldestDays: number;
  medianDays: number;
  dailyCost: number;
  accruedCost: number;
};

export type CostPoint = { date: string; cost: number; parcels: number };

const DAY_MS = 86_400_000;
const startOfDay = (value: Date) => {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
};

/** Trenutna slika skladišča: koliko paketov, kako starih in kaj to stane. */
export async function collectWarehouse(now: Date = new Date()): Promise<WarehouseStats> {
  // Kosi v paketu se štejejo kanonično (pas ni kos) — kot pri ujemanju.
  await ensureCatalog();
  const [parcels, linkedIds, stocked] = await Promise.all([
    db.shipGermanCachedParcel.findMany({
      where: { active: true },
      select: { id: true, arrivalDate: true, unidentifiable: true },
    }),
    db.shipgReturn.findMany({
      where: { shipgermanParcelId: { not: null } },
      select: { shipgermanParcelId: true },
    }),
    db.shipgReturn.findMany({
      where: { status: "stocked", shipgermanParcelId: { not: null } },
      select: {
        shipgermanParcelId: true,
        allocation: { select: { id: true } },
        items: { select: { name: true, variant: true, receivedQty: true, expectedQty: true } },
      },
    }),
  ]);

  const settings = await loadSettings();
  const storage = storageConfig(settings);
  const cutoff = shipCutoff(settings);
  const maxAgeDays = cutoff.maxDays;
  const stockedByParcel = new Map(stocked.map((row) => [row.shipgermanParcelId!, row] as const));
  const linkedSet = new Set(linkedIds.flatMap((row) => (row.shipgermanParcelId ? [row.shipgermanParcelId] : [])));
  const ages = parcels.map((parcel) => storageDays(parcel.arrivalDate, now)).sort((a, b) => a - b);
  const byTier: Record<AgeTier, number> = { free: 0, warning: 0, danger: 0 };
  const old = { notShipping: 0, rareWaiting: 0, other: 0 };
  for (const parcel of parcels) {
    const days = storageDays(parcel.arrivalDate, now);
    if (maxAgeDays <= 0 || days <= maxAgeDays) {
      byTier[ageTier(days, storage)] += 1;
      continue;
    }
    // Ista razvrstitev kot na seznamu Za odpremo, da se številki ujemata.
    const record = stockedByParcel.get(parcel.id);
    if (!record || record.allocation) {
      old.other += 1;
      continue;
    }
    const pieces = packagePieces(record.items.map((item) => ({
      name: item.name,
      variant: item.variant,
      qty: item.receivedQty > 0 ? item.receivedQty : item.expectedQty,
    })));
    if (tooOldToShip(days, pieces, cutoff)) old.notShipping += 1;
    else old.rareWaiting += 1;
  }

  return {
    parcels: parcels.length,
    identified: parcels.filter((parcel) => !parcel.unidentifiable).length,
    unidentified: parcels.filter((parcel) => parcel.unidentifiable).length,
    linked: parcels.filter((parcel) => linkedSet.has(parcel.id)).length,
    byTier,
    old,
    maxAgeDays,
    oldestDays: ages.length ? ages[ages.length - 1] : 0,
    medianDays: ages.length ? ages[Math.floor(ages.length / 2)] : 0,
    dailyCost: ages.reduce((sum, days) => sum + dailyCost(days, storage), 0),
    accruedCost: ages.reduce((sum, days) => sum + accruedCost(days, storage), 0),
  };
}

/**
 * Dnevni strošek skladiščenja nazaj skozi čas.
 *
 * Zgodovine ne hranimo, a je ni treba: vsak paket ima datum prihoda, odposlani
 * pa datum odpreme. Iz tega se da za katerikoli pretekli dan izračunati, kateri
 * paketi so takrat ležali v centru in koliko so tisti dan stali. Krivulja je
 * torej rekonstruirana iz istih podatkov, ki jih že imamo — brez novih tabel in
 * brez čakanja, da se zgodovina šele nabere.
 *
 * Omejitev, ki jo je pošteno poznati: paketi, ki jih ShipGerman ne vrača več in
 * jih nimamo v predpomnilniku, v računu manjkajo, zato so najstarejši dnevi
 * lahko podcenjeni.
 */
export async function collectCostHistory(days = 60, now: Date = new Date()): Promise<CostPoint[]> {
  const [parcels, shipments] = await Promise.all([
    db.shipGermanCachedParcel.findMany({ select: { id: true, arrivalDate: true, active: true, lastSeenAt: true } }),
    db.shipGermanCachedShipment.findMany({
      where: { parcelId: { not: null } },
      select: { parcelId: true, actualShipDate: true, plannedShipDate: true },
    }),
  ]);

  const storage = storageConfig(await loadSettings());

  // Odhod paketa: datum odpreme, sicer zadnji dan, ko smo ga še videli v zalogi.
  const departure = new Map<string, number>();
  for (const shipment of shipments) {
    if (!shipment.parcelId) continue;
    const left = shipment.actualShipDate ?? shipment.plannedShipDate;
    if (left) departure.set(shipment.parcelId, startOfDay(left).getTime());
  }

  const stock = parcels.map((parcel) => ({
    arrival: startOfDay(parcel.arrivalDate).getTime(),
    left: departure.get(parcel.id) ?? (parcel.active ? null : startOfDay(parcel.lastSeenAt).getTime()),
  }));

  const today = startOfDay(now).getTime();
  const points: CostPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const dayMs = today - offset * DAY_MS;
    let cost = 0;
    let count = 0;
    for (const parcel of stock) {
      if (parcel.arrival > dayMs) continue;
      if (parcel.left !== null && parcel.left <= dayMs) continue;
      count += 1;
      cost += dailyCost(Math.max(0, Math.floor((dayMs - parcel.arrival) / DAY_MS)), storage);
    }
    points.push({ date: new Date(dayMs).toISOString().slice(0, 10), cost: Number(cost.toFixed(2)), parcels: count });
  }
  return points;
}
