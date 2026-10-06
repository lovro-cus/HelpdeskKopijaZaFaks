import assert from "node:assert/strict";
import test from "node:test";

import { customerEmailMiddle, trackingLine } from "../src/lib/customer-email";
import { addressLine } from "../src/lib/supplier-address";
import {
  matchImportRows,
  parseImportTable,
  parseSupplierCode,
  splitTrackings,
  supplierOrderCode,
} from "../src/lib/supplier-import";

test("koda zahteve gre tja in nazaj, tudi zapisana po svoje", () => {
  assert.equal(supplierOrderCode(12), "SUP-12");
  assert.equal(parseSupplierCode("SUP-12"), 12);
  assert.equal(parseSupplierCode(" sup 12 "), 12);
  assert.equal(parseSupplierCode("12"), 12);
  assert.equal(parseSupplierCode("SUP-"), null);
  assert.equal(parseSupplierCode("ABC-12"), null);
});

test("ena celica z več številkami; neveljavno ostane vidno", () => {
  assert.deepEqual(splitTrackings("1Z999AA10123456784, 1z999aa10123456784\nJJD0001234567"), {
    trackings: ["1Z999AA10123456784", "JJD0001234567"],
    invalid: [],
  });
  assert.deepEqual(splitTrackings("sent tomorrow"), { trackings: [], invalid: ["sent tomorrow"] });
});

test("glava se najde po imenu, ne po položaju, in lahko ni v prvi vrstici", () => {
  const parsed = parseImportTable([
    ["Testmoto replacements"],
    ["Tracking number", "Order", "Request ID", "Carrier"],
    ["1Z999AA10123456784", "#1140", "SUP-3", "UPS"],
    ["", "1141", "SUP-4", ""],
    ["JJD0001234567", "1142", "", ""],
  ]);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.rows.map((row) => [row.line, row.code, row.orderNumber, row.trackings, row.carrier]), [
    [3, 3, "1140", ["1Z999AA10123456784"], "UPS"],
    [5, null, "1142", ["JJD0001234567"], null],
  ]);
});

test("brez stolpca za tracking ali za povezavo ni uvoza", () => {
  assert.deepEqual(parseImportTable([["Order", "Name"], ["1140", "Ana"]]), { ok: false, error: "noTracking" });
  assert.deepEqual(parseImportTable([["Tracking", "Name"], ["1Z999AA10123456784", "Ana"]]), { ok: false, error: "noHeader" });
  assert.deepEqual(parseImportTable([]), { ok: false, error: "empty" });
});

test("ujemanje: ID ima prednost, številka naročila samo, kadar je enolična", () => {
  const orders = [
    { id: 1, orderNumber: "1140", status: "exported", tracking: null },
    { id: 2, orderNumber: "1141", status: "open", tracking: null },
    { id: 3, orderNumber: "1141", status: "exported", tracking: null },
    { id: 4, orderNumber: "1142", status: "shipped", tracking: "X" },
    { id: 5, orderNumber: "1143", status: "cancelled", tracking: null },
  ];
  const row = (code: number | null, orderNumber: string | null, trackings = ["1Z999AA10123456784"]) =>
    ({ line: 1, code, orderNumber, trackings, invalid: [], carrier: null });
  const verdicts = matchImportRows([
    row(1, "9999"),
    row(null, "#1140"),
    row(null, "1141"),
    row(4, null),
    row(5, null),
    row(77, null),
    row(2, null, []),
  ], orders).map((item) => [item.supplierOrderId, item.verdict]);
  assert.deepEqual(verdicts, [
    [1, "ready"],
    [1, "merged"],
    [null, "ambiguous"],
    [4, "alreadyShipped"],
    [5, "cancelled"],
    [null, "unknown"],
    [2, "invalidTracking"],
  ]);
});

test("zahteva z več kosi: tracking iz vseh njenih vrstic gre skupaj", () => {
  const orders = [{ id: 7, orderNumber: "1140", status: "exported", tracking: null }];
  const row = (trackings: string[], carrier: string | null) => ({ line: 1, code: 7, orderNumber: "1140", trackings, invalid: [], carrier });
  const [lead, second, third] = matchImportRows([row(["AAA111111"], null), row(["BBB222222", "AAA111111"], "UPS"), row([], null)], orders);
  assert.deepEqual([lead!.verdict, lead!.trackings, lead!.carrier], ["ready", ["AAA111111", "BBB222222"], "UPS"]);
  assert.equal(second!.verdict, "merged");
  // Vrstica brez številke ne podre zahteve, ki jo ima v drugi vrstici.
  assert.equal(third!.verdict, "invalidTracking");
});

test("pismo o odposlanem nadomestku nosi tracking v jeziku stranke", () => {
  assert.equal(trackingLine("de", ["1Z1"]), "Sendungsnummer: 1Z1");
  assert.equal(trackingLine("en", ["A", "B"]), "Tracking numbers: A, B");
  assert.equal(trackingLine("xx", ["A"]), "Tracking number: A");
  assert.equal(trackingLine("en", []), null);
  const middle = customerEmailMiddle("exchangeShipped", "en", [{ qty: 1, name: "TrailShield", variant: "M" }], ["1Z999AA10123456784"]);
  assert.ok(middle.includes("Tracking number: 1Z999AA10123456784"));
  // Drugim pismom tracking ne pripada.
  assert.ok(!customerEmailMiddle("whichSize", "en", [], ["1Z1"]).some((line) => line.includes("1Z1")));
});

test("naslov v eni vrstici izpusti prazna polja", () => {
  assert.equal(addressLine({ recipient: "Ana Novak", address1: "Hauptstraße 1", zip: "1010", city: "Wien", countryCode: "AT" }),
    "Ana Novak, Hauptstraße 1, 1010 Wien, AT");
});
