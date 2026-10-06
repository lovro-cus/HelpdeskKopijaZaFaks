import "server-only";

import { canonicalLabel } from "./catalog-canonical";
import { ensureCatalog } from "./catalog-server";
import { db } from "./db";
import { packagePieces, RARE_PACKAGE_PIECES } from "./rare-match";
import { shipCutoff, tooOldToShip } from "./ship-cutoff";
import { findExactPackageMatches, isIgnorableShipgItem, type MatchReturn } from "./shipg-matching";
import { getCachedShipGermanParcels } from "./shipgerman-sync";
import type { ShopifyOrderSummary } from "./shopify";
import { accruedCost, ageTier, dailyCost, storageDays, type AgeTier } from "./storage-cost";
import { storageConfig } from "./config/defaults";
import { loadSettings } from "./config/server";

/** Ena vrstica seznama = en fizični paket iz ShipG zaloge. */
export type WorklistRow = {
  shipgReturnId: number;
  /** ShipGermanov ID fizičnega paketa. */
  parcelId: string;
  sender: string | null;
  contents: string;
  arrival: Date;
  days: number;
  tier: AgeTier;
  accruedCost: number;
  /** Teža fizičnega paketa; v pogledu ujemanj se po njej sortira. */
  weightGrams: number;
  /** Gotovost ujemanja; pri nižji od "high" paket ne more v odpremo. */
  matchQuality: string;
  /** Starejši od praga za odpremo (Urejanje → Skladišče) — ne pošiljamo ga. */
  tooOld: boolean;
  /** reserved = že rezerviran; anchor = najstarejši v predlaganem setu (akcija);
   *  member = del seta, ki ga vodi drug paket; none = brez ujemajočega naročila;
   *  unidentified = neznana vsebina (straži strošek, a ni ga mogoče ujeti z naročilom). */
  kind: "reserved" | "anchor" | "member" | "none" | "unidentified";
  reservedOrderNumber?: string | null;
  reservedExchange?: boolean;
  /** Za rezervirane: kam pelje povezava in kaj sprostimo. Odprema uporablja
   *  outboundId, menjava pa issueId/issueKey. */
  reservedOutboundId?: string | null;
  reservedIssueKey?: string | null;
  reservedIssueId?: number | null;
  /** Za anchor: predlagano naročilo + cel set za rezervacijo. */
  order?: { orderNumber: string; customerName: string | null; packageCount: number; shipgReturnIds: number[]; rare: boolean };
  /** Za member: kateremu naročilu/paketu pripada. */
  memberOf?: { orderNumber: string; anchorParcelId: string };
};

export type WorklistSummary = {
  packages: number;
  /** Paketi čez prag starosti, ki jih ne pošiljamo, in prag sam (0 = brez). */
  tooOldCount: number;
  maxAgeDays: number;
  agingCount: number;
  dailyBurn: number;
  accruedCost: number;
};

/**
 * Sestavi seznam zaloge za odpremo, urejen od najstarejšega paketa. Vsakemu
 * paketu poišče ustrezno nefulfillano naročilo (kanonično ujemanje), pri čemer
 * naročila, ki potrebujejo več paketov, sidra na NAJSTAREJŠI paket v setu, da
 * kurimo najdražjo zalogo najprej. Dodelitev je požrešna po starosti; en paket
 * gre k največ enemu naročilu in obratno.
 */
export async function buildOutboundWorklist(orders: ShopifyOrderSummary[]): Promise<{ rows: WorklistRow[]; summary: WorklistSummary }> {
  await ensureCatalog();
  const [records, live, unidentifiedParcels] = await Promise.all([
    db.shipgReturn.findMany({
      where: { status: "stocked" },
      include: {
        items: true,
        allocation: { include: { outboundOrder: { select: { id: true, orderNumber: true } }, exchangeIssue: { select: { id: true, key: true } } } },
      },
    }),
    getCachedShipGermanParcels(),
    // Neidentificirani paketi: v centru so, stražijo strošek, a vsebine ne poznamo.
    db.shipGermanCachedParcel.findMany({
      where: { active: true, unidentifiable: true },
      select: { id: true, sender: true, arrivalDate: true, weightGrams: true },
    }),
  ]);
  const liveById = new Map(live.map((parcel) => [parcel.id, parcel] as const));

  // Le paketi, ki so še v aktivnem centru — zanje ShipGerman zaračunava.
  const stocked = records.flatMap((record) => {
    const parcel = record.shipgermanParcelId ? liveById.get(record.shipgermanParcelId) : undefined;
    return parcel ? [{ record, parcel }] : [];
  });
  const arrivalOf = (returnId: number) =>
    stocked.find((entry) => entry.record.id === returnId)?.parcel.arrivalDate.getTime() ?? Infinity;

  // Ujemanje: rezervirani (allocated) so izločeni znotraj findExactPackageMatches.
  const matchReturns: MatchReturn[] = stocked.map(({ record }) => ({
    id: record.id,
    trackingNumber: record.trackingNumber,
    externalParcelId: record.shipgermanParcelId,
    allocated: Boolean(record.allocation),
    matchQuality: record.matchQuality,
    items: record.items.map((item) => ({
      name: item.name,
      variant: item.variant,
      qty: item.receivedQty > 0 ? item.receivedQty : item.expectedQty,
    })),
  }));

  // Redko ujemanje: v setu je paket z več kosi.
  const piecesById = new Map(matchReturns.map((record) => [record.id, packagePieces(record.items)] as const));
  const isRare = (ids: number[]) => ids.some((id) => (piecesById.get(id) ?? 0) >= RARE_PACKAGE_PIECES);

  // Najboljše (FIFO) ujemanje na naročilo, z najstarejšim paketom v setu.
  // Nastavitve (cena skladiščenja, prag starosti) preberemo enkrat za cel seznam.
  const settings = await loadSettings();
  const cutoff = shipCutoff(settings);
  const orderMatches = orders.flatMap((order) => {
    if (!order.shopifyId) return [];
    const demand = order.items.map((item) => ({ name: item.name, variant: item.variant, qty: item.qty }));
    const best = findExactPackageMatches(demand, matchReturns, live, undefined, undefined, cutoff)[0];
    if (!best) return [];
    const shipgReturnIds = best.packages.map((pkg) => pkg.shipgReturnId);
    return [{
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      shipgReturnIds,
      oldest: Math.min(...shipgReturnIds.map(arrivalOf)),
    }];
  });
  // Prioriteta: seti z najstarejšim paketom naprej (kuri najdražje najprej).
  orderMatches.sort((a, b) => a.oldest - b.oldest);

  const usedReturns = new Set<number>();
  const usedOrders = new Set<string>();
  const assignment = new Map<number, { orderNumber: string; customerName: string | null; shipgReturnIds: number[]; anchorReturnId: number }>();
  for (const match of orderMatches) {
    if (usedOrders.has(match.orderNumber) || match.shipgReturnIds.some((id) => usedReturns.has(id))) continue;
    const anchorReturnId = [...match.shipgReturnIds].sort((a, b) => arrivalOf(a) - arrivalOf(b))[0];
    for (const id of match.shipgReturnIds) {
      usedReturns.add(id);
      assignment.set(id, { orderNumber: match.orderNumber, customerName: match.customerName, shipgReturnIds: match.shipgReturnIds, anchorReturnId });
    }
    usedOrders.add(match.orderNumber);
  }

  const storage = storageConfig(settings);
  const now = new Date();
  const identifiedRows: WorklistRow[] = stocked.map(({ record, parcel }) => {
    const days = storageDays(parcel.arrivalDate, now);
    const contents = record.items
      .filter((item) => !isIgnorableShipgItem(item))
      .map((item) => `${item.receivedQty || item.expectedQty}× ${canonicalLabel(item.name, item.variant)}`)
      .join(", ");
    const base = {
      shipgReturnId: record.id,
      parcelId: parcel.id,
      sender: parcel.sender,
      contents,
      arrival: parcel.arrivalDate,
      days,
      tier: ageTier(days, storage),
      accruedCost: accruedCost(days, storage),
      weightGrams: parcel.weightGrams,
      matchQuality: record.matchQuality,
      tooOld: !record.allocation && tooOldToShip(days, piecesById.get(record.id) ?? 0, cutoff),
    };

    if (record.allocation) {
      return {
        ...base,
        kind: "reserved" as const,
        reservedOrderNumber: record.allocation.outboundOrder?.orderNumber ?? null,
        reservedExchange: !record.allocation.outboundOrderId,
        reservedOutboundId: record.allocation.outboundOrderId ?? null,
        reservedIssueKey: record.allocation.exchangeIssue?.key ?? null,
        reservedIssueId: record.allocation.exchangeIssueId ?? null,
      };
    }
    const assigned = assignment.get(record.id);
    if (assigned && assigned.anchorReturnId === record.id) {
      return { ...base, kind: "anchor" as const, order: { orderNumber: assigned.orderNumber, customerName: assigned.customerName, packageCount: assigned.shipgReturnIds.length, shipgReturnIds: assigned.shipgReturnIds, rare: isRare(assigned.shipgReturnIds) } };
    }
    if (assigned) {
      const anchorParcelId = stocked.find((entry) => entry.record.id === assigned.anchorReturnId)?.parcel.id ?? "";
      return { ...base, kind: "member" as const, memberOf: { orderNumber: assigned.orderNumber, anchorParcelId } };
    }
    return { ...base, kind: "none" as const };
  });

  // Neidentificirani paketi kot lastne vrstice (brez vsebine in predloga). Tiste,
  // ki so že zajeti kot založena zaloga, izpustimo, da ni podvojitev.
  const stockedParcelIds = new Set(stocked.map((entry) => entry.parcel.id));
  const unidentifiedRows: WorklistRow[] = unidentifiedParcels
    .filter((parcel) => !stockedParcelIds.has(parcel.id))
    .map((parcel) => {
      const days = storageDays(parcel.arrivalDate, now);
      return {
        shipgReturnId: 0,
        parcelId: parcel.id,
        sender: parcel.sender,
        contents: "",
        arrival: parcel.arrivalDate,
        days,
        tier: ageTier(days, storage),
        accruedCost: accruedCost(days, storage),
        weightGrams: parcel.weightGrams,
        // Neidentificiran paket sploh nima ujemanja, ki bi mu lahko zaupali.
        matchQuality: "low",
        tooOld: false,
        kind: "unidentified" as const,
      };
    });

  const rows = [...identifiedRows, ...unidentifiedRows].sort((a, b) => a.arrival.getTime() - b.arrival.getTime());

  const summary: WorklistSummary = {
    packages: rows.length,
    tooOldCount: rows.filter((row) => row.tooOld).length,
    maxAgeDays: cutoff.maxDays,
    agingCount: rows.filter((row) => row.days > storage.freeDays).length,
    dailyBurn: rows.reduce((sum, row) => sum + dailyCost(row.days, storage), 0),
    accruedCost: rows.reduce((sum, row) => sum + row.accruedCost, 0),
  };
  return { rows, summary };
}
