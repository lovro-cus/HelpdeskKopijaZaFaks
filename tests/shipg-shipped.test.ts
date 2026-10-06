import assert from "node:assert/strict";
import { test } from "node:test";

import { shippedStockNote, stockThatLeftShipGerman } from "../src/lib/shipg-shipped";

const record = (id: number, parcel: string | null, allocationStatus: string | null = null, status = "stocked") =>
  ({ id, status, shipgermanParcelId: parcel, allocationStatus });
const shipment = (parcelId: string, status: string, tracking: string | null = null, day = 1) =>
  ({ parcelId, status, tracking, actualShipDate: new Date(Date.UTC(2026, 7, day)) });

test("stock whose parcel ShipGerman shipped past the Desk is closed", () => {
  const result = stockThatLeftShipGerman([record(1, "70001")], [shipment("70001", "Shipped", "8759", 19)]);
  assert.deepEqual(result, [{ recordId: 1, parcelId: "70001", tracking: "8759", shippedAt: new Date(Date.UTC(2026, 7, 19)) }]);
});

test("a shipment still being prepared keeps the record in stock", () => {
  assert.deepEqual(stockThatLeftShipGerman([record(1, "70001")], [shipment("70001", "ReadyForProcessing")]), []);
});

test("parcels without a shipment, unlinked records and other statuses stay untouched", () => {
  const records = [record(1, "70001"), record(2, null), record(3, "70003", null, "check")];
  const shipments = [shipment("70003", "Shipped"), shipment("79999", "Shipped")];
  assert.deepEqual(stockThatLeftShipGerman(records, shipments), []);
});

test("an active reservation is left to the exchange or outbound flow", () => {
  const records = [record(1, "70001", "reserved"), record(2, "70002", "dispatching"), record(3, "70003", "shipped")];
  const shipments = [shipment("70001", "Shipped"), shipment("70002", "Shipped"), shipment("70003", "Shipped")];
  assert.deepEqual(stockThatLeftShipGerman(records, shipments).map((item) => item.recordId), [3]);
});

test("the latest actual dispatch wins when a parcel has several shipments", () => {
  const [item] = stockThatLeftShipGerman([record(1, "70001")], [shipment("70001", "Shipped", "old", 2), shipment("70001", "Shipped", "new", 9)]);
  assert.equal(item.tracking, "new");
});

test("thread note names the parcel and the outgoing tracking", () => {
  assert.equal(shippedStockNote({ parcelId: "70001", tracking: "8759" }), "ShipGerman 70001 · 8759");
  assert.equal(shippedStockNote({ parcelId: "70001", tracking: null }), "ShipGerman 70001");
});
