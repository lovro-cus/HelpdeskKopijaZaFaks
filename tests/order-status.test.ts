import assert from "node:assert/strict";
import test from "node:test";

import {
  becameFulfilled,
  financialTone,
  fulfillmentTone,
  isFulfilled,
  isKnownFinancial,
  isKnownFulfillment,
  resolveFulfillment,
} from "../src/lib/order-status";

test("without a parcel the order status stands on its own", () => {
  assert.equal(resolveFulfillment("UNFULFILLED", []), "UNFULFILLED");
  assert.equal(resolveFulfillment("FULFILLED", []), "FULFILLED");
  assert.equal(resolveFulfillment(null, []), null);
});

test("the parcel knows about delivery, the order does not", () => {
  assert.equal(resolveFulfillment("FULFILLED", ["DELIVERED"]), "DELIVERED");
  assert.equal(resolveFulfillment("FULFILLED", ["IN_TRANSIT"]), "IN_TRANSIT");
  assert.equal(resolveFulfillment("FULFILLED", ["OUT_FOR_DELIVERY"]), "OUT_FOR_DELIVERY");
  // Stanja, ki o poti ne povedo nič, pustijo besedo naročilu.
  assert.equal(resolveFulfillment("FULFILLED", ["SUCCESS", null]), "FULFILLED");
});

test("with several parcels the slowest one decides — one delivered box is not the order", () => {
  assert.equal(resolveFulfillment("FULFILLED", ["DELIVERED", "IN_TRANSIT"]), "IN_TRANSIT");
  assert.equal(resolveFulfillment("FULFILLED", ["DELIVERED", "DELIVERED"]), "DELIVERED");
  // Delna odprema ostane delna, tudi če je odposlani del že prispel: nekaj je
  // še doma in naročilo ni opravljeno.
  assert.equal(resolveFulfillment("PARTIALLY_FULFILLED", ["DELIVERED"]), "PARTIALLY_FULFILLED");
});

test("shipped means gone, not merely scheduled", () => {
  for (const status of ["FULFILLED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]) {
    assert.equal(isFulfilled(status), true, status);
  }
  for (const status of ["UNFULFILLED", "SCHEDULED", "ON_HOLD", "IN_PROGRESS", "PARTIALLY_FULFILLED", "RESTOCKED", null]) {
    assert.equal(isFulfilled(status), false, String(status));
  }
});

test("only the crossing counts, so the daily run cannot report the same shipment twice", () => {
  assert.equal(becameFulfilled("UNFULFILLED", "FULFILLED"), true);
  assert.equal(becameFulfilled(null, "DELIVERED"), true);
  assert.equal(becameFulfilled("FULFILLED", "DELIVERED"), false);
  assert.equal(becameFulfilled("FULFILLED", "FULFILLED"), false);
  // Vrnjeno v zalogo ni odprema.
  assert.equal(becameFulfilled("UNFULFILLED", "RESTOCKED"), false);
});

test("statuses we do not know are refused rather than stored as noise", () => {
  assert.equal(isKnownFinancial("PAID"), true);
  assert.equal(isKnownFinancial("paid"), false);
  assert.equal(isKnownFinancial("SOMETHING_NEW"), false);
  assert.equal(isKnownFulfillment("DELIVERED"), true);
  assert.equal(isKnownFulfillment(null), false);
});

test("colour marks what wants a look: money lost, order stuck, work done", () => {
  assert.equal(financialTone("REFUNDED"), "var(--stamp)");
  assert.equal(financialTone("PARTIALLY_REFUNDED"), "var(--warning)");
  assert.equal(financialTone("PAID"), "var(--success)");
  assert.equal(fulfillmentTone("UNFULFILLED"), "var(--warning)");
  assert.equal(fulfillmentTone("DELIVERED"), "var(--success)");
  assert.equal(fulfillmentTone("IN_TRANSIT"), "var(--ink-2)");
});
