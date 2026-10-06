import "server-only";

import { ensureCatalog } from "./catalog-server";
import { db } from "./db";
import { loadSettings } from "./config/server";
import { shipCutoff, type ShipCutoff } from "./ship-cutoff";
import { findExactPackageMatches, type MatchReturn, type PackageMatch } from "./shipg-matching";
import type { ShipGermanParcel } from "./shipgerman-data";
import { findUnfulfilledOrders, type ShopifyLineItem, type ShopifyOrderSummary } from "./shopify";
import { getCachedShipGermanParcels } from "./shipgerman-sync";

/**
 * Nefulfillana naročila, ki še nimajo rezervirane odpreme. Naročilo z
 * rezervacijo v Shopifyju ostane nefulfillano, dokler ShipGerman paketa ne
 * odpošlje — brez tega filtra bi ga seznam in opozorila ponudila še enkrat z
 * drugim paketom, rezervacija pa bi spodletela.
 */
export async function findOrdersAwaitingStock(): Promise<ShopifyOrderSummary[]> {
  const [orders, reserved] = await Promise.all([
    findUnfulfilledOrders(),
    db.outboundOrder.findMany({
      where: { status: { not: "fulfilled" }, allocations: { some: {} } },
      select: { shopifyOrderId: true },
    }),
  ]);
  const taken = new Set(reserved.map((row) => row.shopifyOrderId));
  return orders.filter((order) => !order.shopifyId || !taken.has(order.shopifyId));
}

/** Posnetek zaloge, pripravljen za ujemanje: naši založeni paketi + živi paketi
 *  iz ShipGerman računa. Naložimo enkrat in ga uporabimo za vsa naročila. */
export type StockSnapshot = { returns: MatchReturn[]; live: ShipGermanParcel[]; cutoff: ShipCutoff };

export async function loadStockSnapshot(): Promise<StockSnapshot> {
  // Ujemanje, ki sledi posnetku, primerja kose med trgi.
  await ensureCatalog();
  const [records, live, settings] = await Promise.all([
    db.shipgReturn.findMany({ where: { status: "stocked" }, include: { items: true, allocation: true } }),
    getCachedShipGermanParcels(),
    loadSettings(),
  ]);
  const returns: MatchReturn[] = records.map((record) => ({
    id: record.id,
    trackingNumber: record.trackingNumber,
    externalParcelId: record.shipgermanParcelId,
    // Že rezerviran paket (za menjavo ali drugo odpremo) ni na voljo.
    allocated: Boolean(record.allocation),
    matchQuality: record.matchQuality,
    items: record.items.map((item) => ({
      name: item.name,
      variant: item.variant,
      qty: item.receivedQty > 0 ? item.receivedQty : item.expectedQty,
    })),
  }));
  return { returns, live, cutoff: shipCutoff(settings) };
}

/** Kombinacije celih paketov iz zaloge, ki natančno pokrijejo vsebino naročila —
 *  ista logika kot pri menjavi, le da je "povpraševanje" celotno naročilo. */
export function orderStockMatches(items: ShopifyLineItem[], stock: StockSnapshot): PackageMatch[] {
  const demand = items.map((item) => ({ name: item.name, variant: item.variant, qty: item.qty }));
  return findExactPackageMatches(demand, stock.returns, stock.live, undefined, undefined, stock.cutoff);
}

/** Odhodni ShipGerman tracking za rezerviran(e) paket(e) — iz scrape-a odposlanih
 *  pošiljk (ShipGermanCachedShipment). Ko se pojavi, je pošiljka odposlana in
 *  jo lahko fulfillamo v Shopifyju. Null, dokler tracking še ni na voljo. */
export async function trackingForParcels(
  parcelIds: string[],
): Promise<{ tracking: string; trackingLink: string | null; shipmentId: string } | null> {
  const ids = parcelIds.filter(Boolean);
  if (!ids.length) return null;
  const shipment = await db.shipGermanCachedShipment.findFirst({
    where: { parcelId: { in: ids }, tracking: { not: null } },
    orderBy: { actualShipDate: "desc" },
  });
  return shipment?.tracking
    ? { tracking: shipment.tracking, trackingLink: shipment.trackingLink, shipmentId: shipment.id }
    : null;
}
