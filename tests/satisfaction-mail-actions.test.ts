import assert from "node:assert/strict";
import test from "node:test";
import Module from "node:module";
import type { CustomerEmailDraft } from "@prisma/client";

// Exercise the real server actions with boundary doubles: no Gmail or live database.
const closedAt = new Date("2026-09-24T10:00:00Z");
let allowed = true;
let deliveryFails = false;
let translations = 0;
let sends = 0;
let sequence = 0;
let language = "de";
let issue = makeIssue();
let draft: CustomerEmailDraft | null = null;
let template = JSON.stringify({ subject: "Thank you {order}", body: "Thank you for your patience with {order}." });
function makeIssue() {
  return { id: 1, key: "TEST", orderNumber: "123", status: "closed", closedAt: new Date(closedAt), customerName: "Alex", customerEmail: "customer@example.test", customerCountryCode: "DE", inboxConversations: [], satisfaction: { status: "scored", score: 9, forClosedAt: new Date(closedAt) } };
}
type Where = { id?: number; status?: string; satisfactionCloseKey?: string; updatedAt?: Date };
const matches = (where: Where) => !!draft && Object.entries(where).every(([key, value]) => {
  const actual = draft![key as keyof CustomerEmailDraft];
  return value instanceof Date ? actual instanceof Date && actual.getTime() === value.getTime() : actual === value;
});
const store = {
  issue: { findUnique: async () => issue },
  appSetting: {
    findUnique: async () => ({ value: template }),
    upsert: async ({ update }: { update: { value: string } }) => { template = update.value; },
  },
  customerEmailDraft: {
    findUnique: async ({ where, include }: { where: Where; include?: unknown }) => matches(where) ? { ...draft!, ...(include ? { issue } : {}) } : null,
    create: async ({ data }: { data: Partial<CustomerEmailDraft> }) => {
      draft = { ...data, id: 1, updatedAt: new Date(++sequence) } as CustomerEmailDraft;
      return draft;
    },
    update: async ({ data }: { data: Partial<CustomerEmailDraft> }) => {
      draft = { ...draft!, ...data, updatedAt: new Date(++sequence) };
      return draft;
    },
    updateMany: async ({ where, data }: { where: Where; data: Partial<CustomerEmailDraft> }) => {
      if (!matches(where)) return { count: 0 };
      draft = { ...draft!, ...data, updatedAt: new Date(++sequence) };
      return { count: 1 };
    },
  },
};
const db = { ...store, $transaction: async <T,>(run: (tx: typeof store) => Promise<T>): Promise<T> => run(store) };
const doubles: Record<string, unknown> = {
  "server-only": {},
  "next/cache": { revalidatePath() {} },
  "../auth": { requirePermissionStrict: async (permission: string) => { assert.equal(permission, "satisfaction"); if (!allowed) throw new Error("Forbidden"); return { id: "user", locale: "en" }; } },
  "../catalog-server": { ensureCatalog: async () => {} },
  "../db": { db },
  "../gmail": { gmailConfigured: () => true, getEmailConversation: async () => ({ messages: [{ direction: "incoming", source: "customer", detectedLanguage: language, body: "Thank you" }] }) },
  "../groq": { translateCustomerText: async () => { translations++; return { subject: "Vielen Dank {order}", body: "Vielen Dank für Ihre Geduld mit {order}." }; } },
  "../customer-send": { deliverCustomerLetter: async (row: CustomerEmailDraft, body: string, _author: unknown, options: unknown) => {
    sends++;
    assert.equal(row.toEmail, issue.customerEmail);
    assert.equal(body, draft!.body);
    assert.deepEqual(options, { threadId: null });
    if (deliveryFails) throw new Error("Simulated timeout");
    draft = { ...draft!, status: "sent" };
  } },
  "../manage-log": { logManage: async () => {} },
};
const loader = Module as unknown as { _load: (request: string, ...args: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (request, ...args) { return request in doubles ? doubles[request] : originalLoad.call(this, request, ...args); };
const actions = require("../src/lib/actions/satisfaction-mail") as typeof import("../src/lib/actions/satisfaction-mail");
loader._load = originalLoad;

test.beforeEach(() => {
  allowed = true; deliveryFails = false; translations = 0; sends = 0; language = "de";
  issue = makeIssue(); draft = null;
  template = JSON.stringify({ subject: "Thank you {order}", body: "Thank you for your patience with {order}." });
});

test("preparation translates the English template, personalizes it, and sends nothing", async () => {
  const result = await actions.prepareThankYou(1);
  assert.ok(result.preview);
  assert.equal(translations, 1);
  assert.equal(sends, 0);
  assert.equal(result.preview.subject, "Vielen Dank 123");
  assert.match(result.preview.body, /Alex/);
  assert.match(result.preview.body, /Geduld mit 123/);
  assert.doesNotMatch(result.preview.body, /\{order\}/);
});

test("English customers receive the original without calling translation", async () => {
  language = "en";
  const result = await actions.prepareThankYou(1);
  assert.equal(translations, 0);
  assert.equal(result.preview?.subject, "Thank you 123");
});

test("concurrent clicks send the exact preview only once", async () => {
  const { preview } = await actions.prepareThankYou(1);
  assert.ok(preview);
  const results = await Promise.all([actions.sendThankYou(preview.id, preview.version), actions.sendThankYou(preview.id, preview.version)]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(sends, 1);
  assert.ok((await actions.prepareThankYou(1)).error);
});

test("reopened cases, changed recipients, and superseded previews cannot be sent", async () => {
  const { preview } = await actions.prepareThankYou(1);
  assert.ok(preview);
  issue.status = "open";
  assert.ok((await actions.sendThankYou(preview.id, preview.version)).error);
  issue.status = "closed";
  issue.customerEmail = "new@example.test";
  assert.ok((await actions.sendThankYou(preview.id, preview.version)).error);
  issue.customerEmail = "customer@example.test";
  await actions.prepareThankYou(1);
  assert.ok((await actions.sendThankYou(preview.id, preview.version)).error);
  assert.equal(sends, 0);
});

test("an uncertain delivery is retained and cannot be resent", async () => {
  const { preview } = await actions.prepareThankYou(1);
  assert.ok(preview);
  deliveryFails = true;
  const originalError = console.error;
  console.error = () => {};
  try { assert.ok((await actions.sendThankYou(preview.id, preview.version)).error); }
  finally { console.error = originalError; }
  assert.equal(draft?.status, "send_failed");
  assert.ok((await actions.sendThankYou(preview.id, preview.version)).error);
  assert.equal(sends, 1);
});

test("all actions require satisfaction permission", async () => {
  allowed = false;
  await assert.rejects(actions.prepareThankYou(1), /Forbidden/);
  await assert.rejects(actions.sendThankYou(1, closedAt.toISOString()), /Forbidden/);
  await assert.rejects(actions.saveThankYouTemplate({}, new FormData()), /Forbidden/);
  assert.equal(sends, 0);
});
