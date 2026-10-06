import assert from "node:assert/strict";
import test from "node:test";

import { deliveryFailureOf } from "../src/lib/order-status";

test("a failed delivery takes the time of the latest failure event and the tracking number", () => {
  const failure = deliveryFailureOf([
    { displayStatus: "DELIVERED", trackingNumbers: ["OLD1"], events: [] },
    {
      displayStatus: "FAILURE",
      trackingNumbers: ["OMGO0000002610634"],
      events: [
        { status: "IN_TRANSIT", happenedAt: "2026-09-03T08:00:00Z" },
        { status: "FAILURE", happenedAt: "2026-09-11T10:30:00Z" },
        { status: "FAILURE", happenedAt: "2026-09-10T09:00:00Z" },
      ],
    },
  ]);
  assert.equal(failure?.tracking, "OMGO0000002610634");
  assert.equal(failure?.failedAt?.toISOString(), "2026-09-11T10:30:00.000Z");
});

test("no failed parcel means no failure; a failure without events has no date", () => {
  assert.equal(deliveryFailureOf([{ displayStatus: "IN_TRANSIT", trackingNumbers: [], events: [] }]), null);
  assert.equal(deliveryFailureOf([]), null);
  assert.deepEqual(deliveryFailureOf([{ displayStatus: "NOT_DELIVERED", trackingNumbers: [], events: [] }]), { failedAt: null, tracking: null });
});
