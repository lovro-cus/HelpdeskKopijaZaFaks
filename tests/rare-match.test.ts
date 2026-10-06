import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import "./support/catalog";
import { ordersForPackage, packagePieces, rareMatchFor, rareMatchReturnIds } from "../src/lib/rare-match";
import type { MatchReturn } from "../src/lib/shipg-matching";
import type { ShipGermanParcel } from "../src/lib/shipgerman-data";

function parcel(id: string, trackingNumber: string): ShipGermanParcel {
  return {
    id,
    trackingNumber,
    weightGrams: 2200,
    arrivalDate: new Date("2026-08-01T10:00:00Z"),
    barcode: id,
    carrier: "DHL",
    dimensionsMm: [300, 200, 100],
    sender: "Customer",
    location: "DE",
    labelAvailable: true,
  };
}

const XL = { name: "Motorcycle Pants", variant: "Black / XL", qty: 1 };
const M = { name: "Motorcycle Pants", variant: "Black / M", qty: 1 };
const now = new Date("2026-08-10T10:00:00Z");

test("paket z dvema kosoma, ki natanko pokrije naročilo, je redko ujemanje", () => {
  const returns: MatchReturn[] = [{ id: 7, matchQuality: "high", trackingNumber: "T7", items: [XL, M] }];
  const match = rareMatchFor({ orderNumber: "3301", customerCountryCode: "AT", items: [XL, M] }, returns, [parcel("SG-7", "T7")], now);
  assert.ok(match);
  assert.equal(rareMatchReturnIds(match), "7");
});

test("naročilo, ki ga pokrijeta dva paketa z enim kosom, ni redko", () => {
  const returns: MatchReturn[] = [
    { id: 1, matchQuality: "high", trackingNumber: "T1", items: [XL] },
    { id: 2, matchQuality: "high", trackingNumber: "T2", items: [M] },
  ];
  const match = rareMatchFor({ orderNumber: "3302", customerCountryCode: "AT", items: [XL, M] }, returns, [parcel("SG-1", "T1"), parcel("SG-2", "T2")], now);
  assert.equal(match, null);
});

test("redko ujemanje ima prednost pred dvema posameznima paketoma", () => {
  const returns: MatchReturn[] = [
    { id: 1, matchQuality: "high", trackingNumber: "T1", items: [XL] },
    { id: 2, matchQuality: "high", trackingNumber: "T2", items: [M] },
    { id: 3, matchQuality: "high", trackingNumber: "T3", items: [XL, M] },
  ];
  const match = rareMatchFor({ orderNumber: "3303", customerCountryCode: "IT", items: [XL, M] }, returns, [parcel("SG-1", "T1"), parcel("SG-2", "T2"), parcel("SG-3", "T3")], now);
  assert.equal(match && rareMatchReturnIds(match), "3");
});

test("rezerviran paket, nemško naročilo in pas ne sprožijo obvestila", () => {
  const live = [parcel("SG-7", "T7")];
  const reserved: MatchReturn[] = [{ id: 7, matchQuality: "high", trackingNumber: "T7", allocated: true, items: [XL, M] }];
  assert.equal(rareMatchFor({ orderNumber: "1", customerCountryCode: "AT", items: [XL, M] }, reserved, live, now), null);

  const free: MatchReturn[] = [{ id: 7, matchQuality: "high", trackingNumber: "T7", items: [XL, M] }];
  assert.equal(rareMatchFor({ orderNumber: "2", customerCountryCode: "DE", items: [XL, M] }, free, live, now), null);

  const belt = { name: "Gürtel", variant: null, qty: 1 };
  assert.equal(packagePieces([XL, belt]), 1);
  const withBelt: MatchReturn[] = [{ id: 8, matchQuality: "high", trackingNumber: "T8", items: [XL, belt] }];
  assert.equal(rareMatchFor({ orderNumber: "3", customerCountryCode: "AT", items: [XL] }, withBelt, [parcel("SG-8", "T8")], now), null);
});

test("obratna smer: nov paket najde naročila, redka najprej, tuja in nemška odpadejo", () => {
  const returns: MatchReturn[] = [
    { id: 1, matchQuality: "high", trackingNumber: "T1", items: [XL] },
    { id: 2, matchQuality: "high", trackingNumber: "T2", items: [XL, M] },
    { id: 3, matchQuality: "high", trackingNumber: "T3", items: [M] },
  ];
  const live = [parcel("SG-1", "T1"), parcel("SG-2", "T2"), parcel("SG-3", "T3")];
  const orders = [
    { orderNumber: "A", customerCountryCode: "AT", items: [XL] },
    { orderNumber: "B", customerCountryCode: "IT", items: [XL, M] },
    { orderNumber: "C", customerCountryCode: "DE", items: [XL, M] },
    { orderNumber: "D", customerCountryCode: "FR", items: [M] },
  ];

  const forPair = ordersForPackage(2, orders, returns, live, now);
  assert.deepEqual(forPair.map((found) => [found.order.orderNumber, found.rare]), [["B", true]]);

  const forSingle = ordersForPackage(1, orders, returns, live, now);
  // Naročilo B bi paket 1 pokril le v setu s paketom 3; najboljše tako ujemanje ostane v predlogu.
  assert.deepEqual(forSingle.map((found) => [found.order.orderNumber, rareMatchReturnIds(found.match)]), [["A", "1"], ["B", "1,3"]]);

  assert.deepEqual(ordersForPackage(99, orders, returns, live, now), []);
});
