import "server-only";

import type { ShipGermanParcel, ShipGermanShipment } from "./shipgerman-data";

export { normalizeShipGermanTracking } from "./shipgerman-data";
export type { ShipGermanParcel, ShipGermanShipment } from "./shipgerman-data";

/**
 * Zunanje skladišče.
 *
 * Kopija za faks nima povezave s skladiščem: paketi v zalogi so izmišljeni in
 * živijo v bazi (ShipGermanCachedParcel, napolni jih prisma/seed.ts). Branje
 * "v živo" zato vedno pove, da skladišče ni povezano, in obstoječa koda ostane
 * pri podatkih iz baze.
 */

export type ShipGermanResult =
  | { ok: true; parcels: ShipGermanParcel[]; fetchedAt: Date }
  | { ok: false; reason: "not_configured" | "authentication" | "unavailable" };

export type ShipGermanShipmentsResult =
  | { ok: true; shipments: ShipGermanShipment[]; fetchedAt: Date }
  | { ok: false; reason: "not_configured" | "authentication" | "unavailable" };

export async function getShipGermanParcels(): Promise<ShipGermanResult> {
  return { ok: false, reason: "not_configured" };
}

export async function getShipGermanShipments(_maxPages?: number): Promise<ShipGermanShipmentsResult> {
  return { ok: false, reason: "not_configured" };
}
