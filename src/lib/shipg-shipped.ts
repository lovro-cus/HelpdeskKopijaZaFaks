/**
 * Zaloga, ki je odšla iz ShipGermana mimo Deska (odprema v portalu, pred
 * rezervacijami ...). Register tega sam ne izve — status zapisa spreminjajo le
 * dejanja v Desku — zato zapis ostane "v zalogi", čeprav paketa ni več.
 *
 * Kriterij je pošiljka s statusom "Shipped" za povezan paket. "ReadyForProcessing"
 * še ni dokončen odhod (pošiljko je mogoče preklicati), zato tak zapis ostane v
 * zalogi; iz ponudb in štetja ga izloči neaktiven paket.
 *
 * Aktivne rezervacije (reserved/dispatching) pustimo pri miru: te zaključi
 * tok menjave ali odpreme, ki ve, komu je paket šel.
 */
export type StockRecordForShipment = {
  id: number;
  status: string;
  shipgermanParcelId: string | null;
  allocationStatus: string | null;
};

export type ShipmentForStock = {
  parcelId: string | null;
  status: string;
  tracking: string | null;
  actualShipDate: Date | null;
};

export type ShippedStock = {
  recordId: number;
  parcelId: string;
  tracking: string | null;
  shippedAt: Date | null;
};

export function stockThatLeftShipGerman(records: StockRecordForShipment[], shipments: ShipmentForStock[]): ShippedStock[] {
  const shippedByParcel = new Map<string, ShipmentForStock>();
  for (const shipment of shipments) {
    if (shipment.status !== "Shipped" || !shipment.parcelId) continue;
    const known = shippedByParcel.get(shipment.parcelId);
    // Več pošiljk za isti paket: vzemi zadnjo dejansko odpremo.
    if (!known || (shipment.actualShipDate?.getTime() ?? 0) > (known.actualShipDate?.getTime() ?? 0)) {
      shippedByParcel.set(shipment.parcelId, shipment);
    }
  }

  return records.flatMap((record): ShippedStock[] => {
    if (record.status !== "stocked" || !record.shipgermanParcelId) return [];
    if (record.allocationStatus && record.allocationStatus !== "shipped") return [];
    const shipment = shippedByParcel.get(record.shipgermanParcelId);
    if (!shipment) return [];
    return [{
      recordId: record.id,
      parcelId: record.shipgermanParcelId,
      tracking: shipment.tracking,
      shippedAt: shipment.actualShipDate,
    }];
  });
}

/** Besedilo dogodka v niti ticketa: "ShipGerman 72539 · 875990092070". */
export function shippedStockNote(item: Pick<ShippedStock, "parcelId" | "tracking">): string {
  return [`ShipGerman ${item.parcelId}`, item.tracking].filter(Boolean).join(" · ");
}
