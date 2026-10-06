import assert from "node:assert/strict";
import test from "node:test";

import { accruedCost, ageTier, dailyCost, freeDaysLeft, storageDays } from "../src/lib/storage-cost";

const DAY = 86_400_000;

test("storageDays counts whole days since arrival, never negative", () => {
  const now = new Date("2026-08-18T12:00:00Z");
  assert.equal(storageDays(new Date(now.getTime() - 5 * DAY), now), 5);
  assert.equal(storageDays(new Date(now.getTime() - 0.5 * DAY), now), 0);
  assert.equal(storageDays(new Date(now.getTime() + 3 * DAY), now), 0);
});

test("first 14 days are free, then 0.60 EUR/day accrues", () => {
  assert.equal(accruedCost(14), 0);
  assert.equal(accruedCost(0), 0);
  assert.equal(Number(accruedCost(15).toFixed(2)), 0.6);
  assert.equal(Number(accruedCost(30).toFixed(2)), 9.6); // (30-14)*0.60
});

test("dailyCost is the current daily rate only past the free window", () => {
  assert.equal(dailyCost(14), 0);
  assert.equal(dailyCost(15), 0.6);
});

test("ageTier: <10 free (green), 10-14 warning (yellow), >=15 danger (red)", () => {
  assert.equal(ageTier(0), "free");
  assert.equal(ageTier(9), "free");
  assert.equal(ageTier(10), "warning");
  assert.equal(ageTier(14), "warning");
  assert.equal(ageTier(15), "danger");
  assert.equal(ageTier(40), "danger");
});

test("freeDaysLeft counts remaining free days (incl. today), 0 once paid", () => {
  assert.equal(freeDaysLeft(10), 5); // 15 - 10
  assert.equal(freeDaysLeft(14), 1); // last free day
  assert.equal(freeDaysLeft(15), 0);
  assert.equal(freeDaysLeft(40), 0);
});
