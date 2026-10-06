import assert from "node:assert/strict";
import { test } from "node:test";

import "./support/catalog";
import { canonicalKey, canonicalLabel, canonicalParts, canonicalVariantLabel } from "../src/lib/catalog-canonical";

test("same physical pants collapse across IT and DACH names", () => {
  const dach = canonicalKey("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / 2XL / EU 52 / W36 / Herren");
  const it = canonicalKey("Testmoto ScudoStrada™ Pantaloni da Moto", "Nero / 2XL / EU 52 / W36 / Uomo");
  assert.equal(dach, it);
  assert.equal(dach, "#trailshield-pants|black|2xl|");
});

test("TrailShield pants ignore gender — men and women are the same physical item", () => {
  const men = canonicalKey("Testmoto TrailShield™ Black Motorcycle Pants", "Schwarz / M / EU 46 / W30 / Herren");
  const women = canonicalKey("Testmoto TrailShield™ Black Motorcycle Pants", "Schwarz / M / EU 46 / W30 / Damen");
  assert.equal(men, women);
});

test("colour differences keep items distinct", () => {
  const black = canonicalKey("Testmoto TrailShield™ Black Motorcycle Pants", "Schwarz / M / EU 46 / W30 / Herren");
  const green = canonicalKey("Testmoto TrailShield™ Green Motorcycle Pants", "Grün / M / EU 46 / W30 / Herren");
  assert.notEqual(black, green);
});

test("canonical-label variant matches the raw Shopify variant of the same item", () => {
  // Varianta je lahko shranjena kot kanonična oznaka ("Črna · XL") ali kot surova
  // Shopify vrednost ("Schwarz / XL / …"). Oba morata dati enak ključ, sicer se
  // zaloga in cilj menjave ne ujameta.
  const canonical = canonicalKey("Testmoto ScudoStrada™ Pantaloni da Moto", "Črna · XL");
  const rawDach = canonicalKey("Testmoto SchutzWerk™ Motorradhose", "Schwarz / XL / EU 44 / W28 / Herren");
  const rawIt = canonicalKey("Testmoto ScudoStrada™ Pantaloni da Moto", "Nero / XL / EU 46 / W30 / Uomo");
  assert.equal(canonical, "#trailshield-pants|black|xl|");
  assert.equal(rawDach, canonical);
  assert.equal(rawIt, canonical);
});

test("Slovene colour names resolve like their raw-market synonyms", () => {
  const pairs: [string, string][] = [
    ["Črna · M", "Schwarz / M / EU 46 / W30 / Herren"],
    ["Zelena · M", "Grün / M / EU 46 / W30 / Herren"],
    ["Siva · M", "Grau / M / EU 46 / W30 / Herren"],
  ];
  for (const [canonical, raw] of pairs) {
    assert.equal(
      canonicalKey("Testmoto TrailShield™ Motorcycle Pants", canonical),
      canonicalKey("Testmoto TrailShield™ Motorcycle Pants", raw),
      `"${canonical}" should match "${raw}"`,
    );
  }
});

test("canonical label keeps the colour for a canonical-form variant", () => {
  assert.equal(canonicalLabel("Testmoto ScudoStrada™ Pantaloni da Moto", "Črna · XL"), "TrailShield hlače · Črna · XL");
});

test("different size does not match", () => {
  const a = canonicalKey("Testmoto ScudoStrada™ Pantaloni da Moto", "Nero / M / EU 46 / W30 / Uomo");
  const b = canonicalKey("Testmoto ScudoStrada™ Pantaloni da Moto", "Nero / L / EU 48 / W32 / Uomo");
  assert.notEqual(a, b);
  assert.equal(a, "#trailshield-pants|black|m|");
});

test("unknown products fall back to exact name and variant comparison", () => {
  const one = canonicalKey("Motorcycle Pants", "Black / XL");
  const same = canonicalKey("Motorcycle Pants", "Black / XL");
  const other = canonicalKey("Jacket", "Black / XL");
  assert.equal(one, same);
  assert.notEqual(one, other);
  assert.equal(canonicalParts("Motorcycle Pants", "Black / XL").productId, null);
});

test("variant label drops the product and shows the same across markets", () => {
  const it = canonicalVariantLabel("Testmoto ScudoStrada™ Pantaloni da Moto", "Nero / M / EU 46 / W30 / Uomo");
  const dach = canonicalVariantLabel("Testmoto TrailShield™ Motorcycle Pants", "Schwarz / M / EU 46 / W30 / Herren");
  assert.equal(it, "Črna · M");
  assert.equal(dach, "Črna · M");
});

test("readable label describes the canonical item", () => {
  assert.equal(
    canonicalLabel("Testmoto ScudoStrada™ Pantaloni da Moto", "Nero / M / EU 46 / W30 / Uomo"),
    "TrailShield hlače · Črna · M",
  );
});
