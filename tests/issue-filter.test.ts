import assert from "node:assert/strict";
import test from "node:test";

import { emailCountOf, issueFilterParams, issueWhere, readIssueFilter, sortIssues } from "../src/lib/issue-filter";
import type { Category } from "../src/lib/config/shared";

const cat = (key: string, position: number): Category => ({
  key,
  label: key,
  color: "var(--ink-2)",
  position,
  hidden: false,
  requiresReturn: false,
  watchFulfillment: false,
  builtin: true,
});

const TYPES = ["refund", "exchange", "other"].map(cat);
const PRIOS = ["urgent", "high", "medium", "low"].map(cat);
const ME = { id: "u1", level: 2 };

test("an unknown sort falls back to priority instead of breaking the list", () => {
  assert.equal(readIssueFilter({ sort: "sideways" }).sort, "priority");
  assert.equal(readIssueFilter({}).sort, "priority");
  assert.equal(readIssueFilter({ sort: "updated" }).sort, "updated");
});

test("the filter survives the trip to the ticket and back", () => {
  const filter = readIssueFilter({ view: "all", type: "refund", priority: "high", sort: "created" });
  const params = issueFilterParams(filter);
  assert.deepEqual(readIssueFilter(Object.fromEntries(params)), filter);
});

test("defaults leave no trace in the address", () => {
  const params = issueFilterParams(readIssueFilter({ view: "mine" }));
  assert.equal(params.toString(), "");
});

test("the pile is the view and the filter together, not one or the other", () => {
  const where = issueWhere(readIssueFilter({ view: "mine", type: "refund" }), ME, TYPES, PRIOS);
  assert.equal(where.status, "open");
  assert.equal(where.assigneeId, "u1");
  assert.equal(where.type, "refund");
});

test("each view brings its own state, and level looks at the whole level", () => {
  assert.equal(issueWhere(readIssueFilter({ view: "waiting" }), ME, TYPES, PRIOS).status, "waiting");
  assert.equal(issueWhere(readIssueFilter({ view: "archive" }), ME, TYPES, PRIOS).status, "closed");
  const level = issueWhere(readIssueFilter({ view: "level" }), ME, TYPES, PRIOS);
  assert.equal(level.level, 2);
  assert.equal(level.assigneeId, undefined);
});

test("system tickets have their own view and stay out of all open", () => {
  const system = issueWhere(readIssueFilter({ view: "system" }), ME, TYPES, PRIOS);
  assert.equal(system.status, "open");
  assert.equal(system.level, 0);
  assert.deepEqual(issueWhere(readIssueFilter({ view: "all" }), ME, TYPES, PRIOS).level, { not: 0 });
});

test("a type that no longer exists is dropped, not answered with an empty list", () => {
  const where = issueWhere(readIssueFilter({ view: "all", type: "garancija" }), ME, TYPES, PRIOS);
  assert.equal(where.type, undefined);
  assert.equal(where.status, "open");
});

test("search reaches into the archive too, so the state condition steps aside", () => {
  const where = issueWhere(readIssueFilter({ view: "mine", q: "CP 092 195" }), ME, TYPES, PRIOS);
  assert.equal(where.status, undefined);
  // Presledki iz prilepljene tracking številke ne smejo zgrešiti zapisa.
  const compact = JSON.stringify(where.OR);
  assert.ok(compact.includes("CP092195"));
});

const day = (n: number) => new Date(2026, 0, n);
const row = (key: string, type: string, priority: string, created: number, updated: number) => ({
  key, type, priority, createdAt: day(created), updatedAt: day(updated),
});

test("by priority, and within one priority the oldest first so nothing gets stuck", () => {
  const sorted = sortIssues(
    [row("a", "refund", "low", 1, 9), row("b", "refund", "urgent", 5, 9), row("c", "refund", "urgent", 2, 9)],
    "priority",
    TYPES,
    PRIOS,
  );
  assert.deepEqual(sorted.map((r) => r.key), ["c", "b", "a"]);
});

test("by type follows the catalogue order the admin set", () => {
  const sorted = sortIssues(
    [row("a", "other", "low", 1, 9), row("b", "refund", "low", 1, 9), row("c", "exchange", "low", 1, 9)],
    "type",
    TYPES,
    PRIOS,
  );
  assert.deepEqual(sorted.map((r) => r.key), ["b", "c", "a"]);
});

test("by email count, most or fewest first, and equal counts fall back to priority", () => {
  const rows = [
    { ...row("a", "refund", "low", 1, 9), emailCount: 5 },
    { ...row("b", "refund", "urgent", 2, 9), emailCount: 8 },
    { ...row("c", "refund", "high", 3, 9), emailCount: 5 },
    row("d", "refund", "low", 4, 9),
  ];
  assert.deepEqual(sortIssues(rows, "emails", TYPES, PRIOS).map((r) => r.key), ["b", "c", "a", "d"]);
  assert.deepEqual(sortIssues(rows, "emailsFew", TYPES, PRIOS).map((r) => r.key), ["d", "c", "a", "b"]);
  assert.equal(readIssueFilter({ sort: "emailsFew" }).sort, "emailsFew");
});

test("a ticket's email count adds up every linked thread, uncounted threads as zero", () => {
  assert.equal(emailCountOf([{ messageCount: 3 }, { messageCount: null }, { messageCount: 4 }]), 7);
  assert.equal(emailCountOf([]), 0);
});

test("sorting does not disturb the array it was given", () => {
  const rows = [row("a", "refund", "low", 1, 9), row("b", "refund", "urgent", 2, 9)];
  sortIssues(rows, "priority", TYPES, PRIOS);
  assert.deepEqual(rows.map((r) => r.key), ["a", "b"]);
});
