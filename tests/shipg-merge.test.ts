import assert from "node:assert/strict";
import { test } from "node:test";

import "./support/catalog";
import { mergeDiff, mergeRows } from "../src/lib/shipg-merge";

const pkg = (name: string, variant: string | null, receivedQty: number) => ({ name, variant, expectedQty: receivedQty, receivedQty });
const line = (name: string, variant: string | null, qty: number, resolution: string) => ({ name, variant, qty, resolution });

test("identical contents across IT and DACH markets count as a clean match", () => {
  const rows = mergeDiff(
    [pkg("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / XL / EU 52 / W36 / Herren", 1)],
    [line("Testmoto ScudoStrada™ Pantaloni da Moto", "Nero / XL / EU 52 / W36 / Uomo", 1, "exchange")],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].state, "match");
  assert.equal(rows[0].packageQty, 1);
  assert.equal(rows[0].issueQty, 1);
});

test("quantity difference is flagged, not silently merged", () => {
  const rows = mergeDiff(
    [pkg("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / M / EU 46 / W30 / Herren", 2)],
    [line("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / M / EU 46 / W30 / Herren", 1, "refund")],
  );
  assert.equal(rows[0].state, "qty");
});

test("item only in the package is 'extra', item only in the order is 'missing'", () => {
  const rows = mergeDiff(
    [pkg("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / M / EU 46 / W30 / Herren", 1)],
    [line("Testmoto AirFlow™ Jacket", "Schwarz / L", 1, "exchange")],
  );
  const byState = Object.fromEntries(rows.map((row) => [row.state, row]));
  assert.ok(byState.extra, "package-only item is extra");
  assert.ok(byState.missing, "order-only item is missing");
});

test("items with no action are ignored when return items exist", () => {
  const rows = mergeDiff(
    [pkg("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / M / EU 46 / W30 / Herren", 1)],
    [
      line("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / M / EU 46 / W30 / Herren", 1, "exchange"),
      line("Testmoto™ Gürtel", "Schwarz", 1, "none"),
    ],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].state, "match");
});

test("with no return resolutions set, all order items form the baseline", () => {
  const rows = mergeDiff(
    [pkg("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / M / EU 46 / W30 / Herren", 1)],
    [line("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / M / EU 46 / W30 / Herren", 1, "none")],
  );
  assert.equal(rows[0].state, "match");
});

test("mergeRows keeps the order item's name/variant for a package-missing item", () => {
  // Ključno za urejljiv merge: manjkajoč kos mora nesti ime/varianto iz naročila,
  // da ga akcija lahko doda v zalogo s pravim zapisom.
  const rows = mergeRows(
    [pkg("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / S / EU 44 / W28 / Damen", 1)],
    [
      line("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / S / EU 44 / W28 / Damen", 1, "refund"),
      line("Testmoto™ Gürtel", "Schwarz", 2, "refund"),
    ],
  );
  const belt = rows.find((row) => row.state === "missing");
  assert.ok(belt, "belt is missing from the package");
  assert.equal(belt.name, "Testmoto™ Gürtel");
  assert.equal(belt.variant, "Schwarz");
  assert.equal(belt.orderQty, 2);
  assert.equal(belt.packageQty, 0);
});

test("mergeRows takes name/variant from the package when it exists there", () => {
  const rows = mergeRows(
    [pkg("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / XL / EU 52 / W36 / Herren", 2)],
    [line("Testmoto ScudoStrada™ Pantaloni da Moto", "Nero / XL / EU 52 / W36 / Uomo", 1, "exchange")],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Testmoto TrailShield™ Motorcycle Pants");
  assert.equal(rows[0].state, "qty");
});
