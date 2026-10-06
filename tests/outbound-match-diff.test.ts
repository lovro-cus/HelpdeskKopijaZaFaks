import assert from "node:assert/strict";
import { test } from "node:test";

import { newMatchOrders, outboundMatchKeys } from "../src/lib/outbound-match-diff";
import type { WorklistRow } from "../src/lib/outbound-worklist";

function row(partial: Partial<WorklistRow> & Pick<WorklistRow, "kind">): WorklistRow {
  return {
    shipgReturnId: 1,
    parcelId: "70000",
    sender: null,
    contents: "",
    arrival: new Date("2026-07-01T00:00:00Z"),
    days: 30,
    tier: "danger",
    accruedCost: 9.6,
    weightGrams: 1200,
    matchQuality: "high",
    tooOld: false,
    ...partial,
  };
}

test("only anchors count — a two-parcel order is one match, not two", () => {
  const rows = [
    row({ kind: "anchor", shipgReturnId: 4, parcelId: "70004", order: { orderNumber: "3075", customerName: "A", packageCount: 2, shipgReturnIds: [9, 4], rare: false } }),
    row({ kind: "member", shipgReturnId: 9, parcelId: "70009", memberOf: { orderNumber: "3075", anchorParcelId: "70004" } }),
    row({ kind: "reserved", shipgReturnId: 5, parcelId: "70005", reservedOrderNumber: "3070" }),
    row({ kind: "none", shipgReturnId: 6, parcelId: "70006" }),
    row({ kind: "unidentified", shipgReturnId: 0, parcelId: "70007" }),
  ];

  assert.deepEqual(outboundMatchKeys(rows), [{ orderNumber: "3075", returnIds: "4,9" }]);
});

test("new matches are the orders that were not in the previous snapshot", () => {
  const current = [
    { orderNumber: "3075", returnIds: "4" },
    { orderNumber: "3080", returnIds: "7" },
  ];

  assert.deepEqual([...newMatchOrders(current, ["3075"])], ["3080"]);
  assert.equal(newMatchOrders(current, ["3075", "3080"]).size, 0);
  assert.equal(newMatchOrders(current, []).size, 2);
});

test("a known order covered by a different parcel is not a new match", () => {
  const current = [{ orderNumber: "3075", returnIds: "11" }];
  assert.equal(newMatchOrders(current, ["3075"]).size, 0);
});
