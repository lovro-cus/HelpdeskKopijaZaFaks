import assert from "node:assert/strict";
import { test } from "node:test";

import { emailSummaryFromUnknown, parseEmailSummary } from "../src/lib/email-summary";

const base = {
  overview: "The customer returned the trousers.",
  customerRequest: "The requested outcome is not stated.",
  returnIntent: "unknown",
  facts: ["Parcel sent"],
  timeline: ["2 Mar – Customer: sends the trousers back"],
  commitments: [],
  currentState: "Waiting for the customer's choice.",
  nextStep: "Ask whether they want a refund or an exchange.",
  warnings: [],
};

test("a summary carries an explicit return outcome", () => {
  assert.deepEqual(emailSummaryFromUnknown(base), base);
  for (const returnIntent of ["refund", "exchange", "unknown", "not_applicable"]) {
    assert.equal(emailSummaryFromUnknown({ ...base, returnIntent })?.returnIntent, returnIntent);
  }
});

test("old cached summaries are rejected so the return outcome is regenerated", () => {
  const { returnIntent: _missing, ...oldSummary } = base;
  assert.equal(emailSummaryFromUnknown(oldSummary), null);
});

test("an invented return outcome is rejected instead of shown as fact", () => {
  assert.equal(emailSummaryFromUnknown({ ...base, returnIntent: "store_credit" }), null);
});

test("JSON fences from a model are accepted", () => {
  const parsed = parseEmailSummary(`\`\`\`json\n${JSON.stringify({ ...base, returnIntent: "refund" })}\n\`\`\``);
  assert.equal(parsed?.returnIntent, "refund");
});

test("summaries cached before the timeline existed still load, without a timeline", () => {
  const { timeline: _missing, ...oldSummary } = base;
  assert.deepEqual(emailSummaryFromUnknown(oldSummary)?.timeline, []);
});
