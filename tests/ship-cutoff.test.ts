import assert from "node:assert/strict";
import test from "node:test";

import "./support/catalog";
import { rareMatchFor } from "../src/lib/rare-match";
import { NO_CUTOFF, shipCutoff, tooOldToShip } from "../src/lib/ship-cutoff";
import { findExactPackageMatches, type MatchReturn } from "../src/lib/shipg-matching";
import type { ShipGermanParcel } from "../src/lib/shipgerman-data";

function parcel(id: string, trackingNumber: string, arrival: string): ShipGermanParcel {
  return {
    id,
    trackingNumber,
    weightGrams: 1200,
    arrivalDate: new Date(arrival),
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
const now = new Date("2026-09-24T10:00:00Z");
const limit45 = { maxDays: 45, rareExempt: true };

test("prag: do vključno praga pošiljamo, čez ne; 0 prag izklopi", () => {
  assert.equal(tooOldToShip(45, 1, limit45), false);
  assert.equal(tooOldToShip(46, 1, limit45), true);
  assert.equal(tooOldToShip(400, 1, NO_CUTOFF), false);
  // Paket z več kosi je izvzet, dokler je kljukica vklopljena.
  assert.equal(tooOldToShip(90, 2, limit45), false);
  assert.equal(tooOldToShip(90, 2, { maxDays: 45, rareExempt: false }), true);
  assert.deepEqual(shipCutoff({ shipMaxAgeDays: 45, shipMaxAgeRareExempt: 0 }), { maxDays: 45, rareExempt: false });
});

test("star paket z enim kosom se ne ponudi; mlajši enak paket se", () => {
  const returns: MatchReturn[] = [
    { id: 1, matchQuality: "high", trackingNumber: "OLD", items: [XL] },
    { id: 2, matchQuality: "high", trackingNumber: "NEW", items: [XL] },
  ];
  // 50 dni in 20 dni star paket.
  const live = [parcel("SG-1", "OLD", "2026-08-05T10:00:00Z"), parcel("SG-2", "NEW", "2026-09-04T10:00:00Z")];
  const ids = (cutoff = NO_CUTOFF) =>
    findExactPackageMatches([XL], returns, live, 24, now, cutoff).map((match) => match.packages[0]!.shipgReturnId);
  // Brez praga FIFO izbere najstarejšega.
  assert.deepEqual(ids(), [1, 2]);
  assert.deepEqual(ids(limit45), [2]);
});

test("redko ujemanje: star paket z dvema kosoma ostane, če je izvzet", () => {
  const returns: MatchReturn[] = [{ id: 7, matchQuality: "high", trackingNumber: "T7", items: [XL, M] }];
  const live = [parcel("SG-7", "T7", "2026-07-01T10:00:00Z")];
  const order = { orderNumber: "3301", customerCountryCode: "AT", items: [XL, M] };
  assert.ok(rareMatchFor(order, returns, live, now, limit45));
  assert.equal(rareMatchFor(order, returns, live, now, { maxDays: 45, rareExempt: false }), null);
});
