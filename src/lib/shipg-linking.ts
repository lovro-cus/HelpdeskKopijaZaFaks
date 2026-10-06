import "server-only";

import { db } from "./db";
import type { ShipGermanParcel } from "./shipgerman-data";
import { inferShipGermanLinks } from "./shipgerman-data";

/**
 * Varno poveže samo nedvoumna 1:1 ujemanja trackingov. Ponavljajoče ali prazne
 * številke ostanejo nepovezane za ročno odločitev.
 */
export async function reconcileShipGermanLinks(parcels: ShipGermanParcel[]) {
  const records = await db.shipgReturn.findMany({
    select: { id: true, trackingNumber: true, shipgermanParcelId: true },
  });
  const inferred = inferShipGermanLinks(records.map((record) => ({
    id: record.id,
    trackingNumber: record.trackingNumber,
    externalParcelId: record.shipgermanParcelId,
  })), parcels);
  for (const link of inferred) {
    await db.shipgReturn.updateMany({
      where: { id: link.recordId, shipgermanParcelId: null },
      data: {
        shipgermanParcelId: link.parcelId,
        shipgermanMatchSource: "automatic",
        shipgermanLinkedAt: new Date(),
      },
    }).catch((error) => console.error("Automatic ShipGerman link failed", error));
  }
}
