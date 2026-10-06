import assert from "node:assert/strict";
import test from "node:test";
import { canThankCustomer, readThankYouTemplate, satisfactionCloseKey, validThankYouTemplate } from "../src/lib/satisfaction-mail";

const closedAt = new Date("2026-09-24T10:00:00Z");
const issue = { status: "closed", closedAt, customerEmail: "customer@example.test", satisfaction: { status: "scored", score: 8, forClosedAt: closedAt } };

test("thank-you requires a rating for the current closure and a recipient", () => {
  assert.equal(canThankCustomer(issue), true);
  assert.equal(canThankCustomer({ ...issue, satisfaction: { ...issue.satisfaction, score: 2 } }), true);
  assert.equal(canThankCustomer({ ...issue, status: "open" }), false);
  assert.equal(canThankCustomer({ ...issue, closedAt: null }), false);
  assert.equal(canThankCustomer({ ...issue, customerEmail: null }), false);
  assert.equal(canThankCustomer({ ...issue, satisfaction: null }), false);
  assert.equal(canThankCustomer({ ...issue, satisfaction: { ...issue.satisfaction, score: null } }), false);
  assert.equal(canThankCustomer({ ...issue, satisfaction: { ...issue.satisfaction, status: "failed" } }), false);
  assert.equal(canThankCustomer({ ...issue, closedAt: new Date(closedAt.getTime() + 1000) }), false);
});

test("thank-you settings reject empty, oversized and multiline subjects", () => {
  const valid = { subject: "Thank you — {order}", body: "Thank you for your patience.\nWe appreciate it." };
  assert.equal(validThankYouTemplate(valid), true);
  assert.equal(validThankYouTemplate({ ...valid, subject: " " }), false);
  assert.equal(validThankYouTemplate({ ...valid, subject: "Thank you\nBcc: other@example.test" }), false);
  assert.equal(validThankYouTemplate({ ...valid, subject: "x".repeat(301) }), false);
  assert.equal(validThankYouTemplate({ ...valid, body: "x".repeat(3001) }), false);
  assert.equal(validThankYouTemplate({ ...valid, body: " " }), false);
  assert.deepEqual(readThankYouTemplate(JSON.stringify(valid)), valid);
  assert.deepEqual(readThankYouTemplate("broken"), { subject: "", body: "" });
  assert.deepEqual(readThankYouTemplate('{"subject":42,"body":"text"}'), { subject: "", body: "" });
});

test("duplicate protection distinguishes closures and cases", () => {
  assert.equal(satisfactionCloseKey(10, closedAt), satisfactionCloseKey(10, new Date(closedAt)));
  assert.notEqual(satisfactionCloseKey(10, closedAt), satisfactionCloseKey(11, closedAt));
  assert.notEqual(satisfactionCloseKey(10, closedAt), satisfactionCloseKey(10, new Date(closedAt.getTime() + 1)));
});
