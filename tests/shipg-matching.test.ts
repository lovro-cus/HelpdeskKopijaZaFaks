import assert from "node:assert/strict";
import test from "node:test";

import "./support/catalog";
import { findExactPackageMatches, type MatchReturn } from "../src/lib/shipg-matching";
import type { ShipGermanParcel } from "../src/lib/shipgerman-data";

function parcel(id: string, trackingNumber: string, weightGrams = 1200): ShipGermanParcel {
  return {
    id,
    trackingNumber,
    weightGrams,
    arrivalDate: new Date("2026-08-01T10:00:00Z"),
    barcode: id,
    carrier: "DHL",
    dimensionsMm: [300, 200, 100],
    sender: "Customer",
    location: "DE",
    labelAvailable: true,
  };
}

test("a package is only suggested when its paid contents exactly match", () => {
  const matches = findExactPackageMatches(
    [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 1 }],
    [{ matchQuality: "high", id: 1, trackingNumber: "TRACK-1", items: [
      { name: "Motorcycle Pants", variant: "Black / XL", qty: 1 },
      { name: "Jacket", variant: "Black / XL", qty: 1 },
    ] }],
    [parcel("SG-1", "TRACK1", 2400)],
  );
  assert.equal(matches.length, 0, "the jacket cannot be split from the pants");
});

test("multiple indivisible packages may jointly satisfy one exchange", () => {
  const matches = findExactPackageMatches(
    [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 2 }],
    [
      { matchQuality: "high", id: 1, trackingNumber: "A1", items: [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 1 }] },
      { matchQuality: "high", id: 2, trackingNumber: "A2", items: [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 1 }] },
    ],
    [parcel("SG-1", "A1"), parcel("SG-2", "A2")],
  );
  assert.deepEqual(matches[0]?.packages.map((item) => item.shipgReturnId), [1, 2]);
});

test("with two packages, a combination already fully in the paid period is offered first", () => {
  const demand = [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 2 }];
  const single = [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 1 }];
  const now = new Date("2026-08-18T10:00:00Z");
  // A in B sta že v plačilnem obdobju (>14 dni), C je še v brezplačnem oknu.
  const a = { ...parcel("SG-A", "A1"), arrivalDate: new Date("2026-07-01T10:00:00Z") };
  const b = { ...parcel("SG-B", "A2"), arrivalDate: new Date("2026-07-20T10:00:00Z") };
  const c = { ...parcel("SG-C", "A3"), arrivalDate: new Date("2026-08-15T10:00:00Z") };
  const matches = findExactPackageMatches(
    demand,
    [
      { matchQuality: "high", id: 1, trackingNumber: "A1", items: single },
      { matchQuality: "high", id: 2, trackingNumber: "A2", items: single },
      { matchQuality: "high", id: 3, trackingNumber: "A3", items: single },
    ],
    [a, b, c],
    24,
    now,
  );
  // Oba plačljiva paketa (1+2) pred vsako kombinacijo, ki vključuje svež paket (3).
  assert.deepEqual(matches[0]?.packages.map((item) => item.shipgReturnId).sort((x, y) => x - y), [1, 2]);
});

test("a free belt does not invalidate an otherwise exact package", () => {
  const matches = findExactPackageMatches(
    [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 1 }],
    [{ matchQuality: "high", id: 1, trackingNumber: "A1", items: [
      { name: "Motorcycle Pants", variant: "Black / XL", qty: 1 },
      { name: "Free belt", variant: null, qty: 1 },
    ] }],
    [parcel("SG-1", "A1")],
  );
  assert.equal(matches.length, 1);
});

test("a belt is ignored no matter how it is named across markets", () => {
  const demand = [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 1 }];
  for (const beltName of ["Testmoto™ Ledergürtel", "Testmoto Cintura in Pelle", "Leather Belt", "Črn pas"]) {
    const matches = findExactPackageMatches(
      demand,
      [{ matchQuality: "high", id: 1, trackingNumber: "A1", items: [
        { name: "Motorcycle Pants", variant: "Black / XL", qty: 1 },
        { name: beltName, variant: null, qty: 1 },
      ] }],
      [parcel("SG-1", "A1")],
    );
    assert.equal(matches.length, 1, `belt "${beltName}" must not block the match`);
  }
});

test("with equivalent packages the oldest in the warehouse is suggested first", () => {
  const demand = [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 1 }];
  const older = { ...parcel("SG-old", "A1"), arrivalDate: new Date("2026-06-01T10:00:00Z") };
  const newer = { ...parcel("SG-new", "A2"), arrivalDate: new Date("2026-09-01T10:00:00Z") };
  const matches = findExactPackageMatches(
    demand,
    [
      { matchQuality: "high", id: 1, trackingNumber: "A1", items: demand },
      { matchQuality: "high", id: 2, trackingNumber: "A2", items: demand },
    ],
    [older, newer],
  );
  assert.equal(matches[0]?.packages[0]?.shipgReturnId, 1);
  assert.equal(matches[0]?.packages[0]?.parcel.id, "SG-old");
});

test("the oldest package is suggested first even when its weight looks suspicious", () => {
  const demand = [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 1 }];
  // Najstarejši paket ima sumljivo težo (izven pričakovanega okna), novejši je
  // verjetne teže. FIFO mora vseeno predlagati najstarejšega.
  const oldSuspicious = { ...parcel("SG-old", "A1", 3200), arrivalDate: new Date("2026-06-01T10:00:00Z") };
  const newPlausible = { ...parcel("SG-new", "A2", 1200), arrivalDate: new Date("2026-09-01T10:00:00Z") };
  const matches = findExactPackageMatches(
    demand,
    [
      { matchQuality: "high", id: 1, trackingNumber: "A1", items: demand },
      { matchQuality: "high", id: 2, trackingNumber: "A2", items: demand },
    ],
    [oldSuspicious, newPlausible],
  );
  assert.equal(matches[0]?.packages[0]?.parcel.id, "SG-old");
});

test("with more equivalent packages than the result limit, the oldest survives the cut", () => {
  const demand = [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 1 }];
  // Pet enakovrednih paketov; NAJSTAREJŠI po prihodu je ZADNJI v vhodni poizvedbi
  // (kot najkasneje vpisan v zalogo). Pri limitu, manjšem od števila kandidatov,
  // mora vseeno preživeti in biti priporočen prvi (FIFO).
  const records: MatchReturn[] = [];
  const parcels: ShipGermanParcel[] = [];
  for (let i = 0; i < 5; i++) {
    records.push({ matchQuality: "high", id: i + 1, trackingNumber: `A${i}`, items: demand });
    parcels.push({ ...parcel(`SG-${i}`, `A${i}`), arrivalDate: new Date(2026, 6, 20 - i) });
  }
  const matches = findExactPackageMatches(demand, records, parcels, 3);
  assert.equal(matches.length, 3);
  assert.equal(matches[0]?.packages[0]?.shipgReturnId, 5, "oldest package must survive the limit and rank first");
});

test("reserved or no-longer-live packages are excluded", () => {
  const demand = [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 1 }];
  const record = { matchQuality: "high", id: 1, trackingNumber: "A1", items: demand, allocated: true };
  assert.equal(findExactPackageMatches(demand, [record], [parcel("SG-1", "A1")]).length, 0);
  assert.equal(findExactPackageMatches(demand, [{ ...record, allocated: false }], []).length, 0);
});

test("a parcel whose match is not certain is never suggested", () => {
  const demand = [{ name: "Motorcycle Pants", variant: "Black / XL", qty: 1 }];
  const record: MatchReturn = { matchQuality: "high", id: 1, trackingNumber: "A1", items: demand };

  assert.equal(findExactPackageMatches(demand, [record], [parcel("SG-1", "A1")]).length, 1);
  assert.equal(findExactPackageMatches(demand, [{ ...record, matchQuality: "medium" }], [parcel("SG-1", "A1")]).length, 0);
  assert.equal(findExactPackageMatches(demand, [{ ...record, matchQuality: "low" }], [parcel("SG-1", "A1")]).length, 0);
});
