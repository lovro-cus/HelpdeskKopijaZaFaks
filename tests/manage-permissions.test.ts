import assert from "node:assert/strict";
import test from "node:test";

import { can, manageAreas, parsePermissions, serializePermissions } from "../src/lib/permissions";

test("pravice se berejo in pišejo v stalnem vrstnem redu, neznano se izpusti", () => {
  assert.deepEqual(parsePermissions("languages,products"), ["products", "languages"]);
  assert.deepEqual(parsePermissions(" products , , admin,users "), ["products"]);
  assert.deepEqual(parsePermissions(""), []);
  assert.deepEqual(parsePermissions(null), []);

  // Obrazec pošlje vsako kljukico posebej; podvojeno ali ponarejeno ne pride v bazo.
  assert.equal(serializePermissions(["languages", "warehouse", "languages", "settings", 7]), "warehouse,languages");
  assert.equal(serializePermissions([]), "");
});

test("admin sme vse, ostali samo odkljukano", () => {
  const admin = { isAdmin: true, permissions: [] };
  const editor = { isAdmin: false, permissions: parsePermissions("products,satisfaction") };
  const agent = { isAdmin: false, permissions: [] };

  assert.equal(can(admin, "languages"), true);
  assert.equal(can(editor, "products"), true);
  // Kljukica »izdelki« ne odpre jezikov.
  assert.equal(can(editor, "languages"), false);
  assert.equal(can(agent, "languages"), false);

  assert.deepEqual(manageAreas(admin), ["warehouse", "products", "languages", "satisfaction"]);
  assert.deepEqual(manageAreas(editor), ["products", "satisfaction"]);
  // Brez področja stran »Urejanje« nima česa pokazati — povezava izgine.
  assert.deepEqual(manageAreas(agent), []);
});
