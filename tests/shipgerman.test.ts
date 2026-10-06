import assert from "node:assert/strict";
import test from "node:test";

import { inferShipGermanLinks, normalizeShipGermanTracking } from "../src/lib/shipgerman-data";

test("normalizeShipGermanTracking compares formatted tracking numbers", () => {
  assert.equal(normalizeShipGermanTracking(" 1z5-f71 w96827738985 "), "1Z5F71W96827738985");
  assert.equal(normalizeShipGermanTracking("Unknown"), null);
});
