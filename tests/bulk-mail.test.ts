import assert from "node:assert/strict";
import test from "node:test";

import { fillOrderToken, isBulkMailKind, planBulkMail, type MailCandidate } from "../src/lib/bulk-mail";
import { customerEmailDraft, customerEmailMiddle, wrapCustomerLetter } from "../src/lib/customer-email";

const order = (
  id: number,
  country: string | null,
  email: string | null = `k${id}@example.com`,
): MailCandidate => ({
  id,
  key: `BRV-${id}`,
  orderNumber: String(3000 + id),
  customerName: `Kupec ${id}`,
  customerEmail: email,
  customerCountryCode: country,
});

test("vsak prejemnik pristane v jeziku svoje države", () => {
  const plan = planBulkMail([order(1, "DE"), order(2, "IT"), order(3, "AT"), order(4, "US")]);
  assert.deepEqual(
    plan.groups.map((group) => [group.language, group.recipients.length]),
    [["de", 2], ["it", 1], ["en", 1]],
  );
});

test("naročilo brez e-naslova ne pade v nobeno skupino, ampak se prizna", () => {
  const plan = planBulkMail([order(1, "DE"), order(2, "DE", null), order(3, "DE", "   ")]);
  assert.equal(plan.groups[0]?.recipients.length, 1);
  assert.equal(plan.noEmail.length, 2);
});

test("ista stranka z dvema naročiloma dobi dve pismi, a na to opozorimo", () => {
  const plan = planBulkMail([order(1, "IT", "ana@example.com"), order(2, "IT", "Ana@example.com"), order(3, "IT")]);
  assert.equal(plan.groups[0]?.recipients.length, 3);
  assert.equal(plan.repeatedAddresses, 1);
});

test("vrstni red skupin je vrstni red šifranta, ne vrstni red naročil", () => {
  const plan = planBulkMail([order(1, "SI"), order(2, "DE"), order(3, "FR")]);
  assert.deepEqual(plan.groups.map((group) => group.language), ["de", "fr", "sl"]);
});

test("prazen kup ne naredi praznih skupin", () => {
  const plan = planBulkMail([]);
  assert.deepEqual(plan.groups, []);
  assert.equal(plan.repeatedAddresses, 0);
});

test("oznaka {order} se zamenja povsod in dobi lojtro", () => {
  assert.equal(fillOrderToken("Naročilo {order} zamuja. {order}", "3044"), "Naročilo #3044 zamuja. #3044");
  // Številka, ki lojtro že ima, je ne dobi dvakrat.
  assert.equal(fillOrderToken("{order}", "#3044"), "#3044");
  assert.equal(fillOrderToken("brez oznake", "3044"), "brez oznake");
  // Lojtra iz predloge zadeve in lojtra iz številke ne smeta dati "##".
  assert.equal(fillOrderToken("Ihre Bestellung #{order} – Umtausch?", "3044"), "Ihre Bestellung #3044 – Umtausch?");
});

test("samo pisma, ki ne naštevajo artiklov posameznega naročila", () => {
  assert.ok(isBulkMailKind("custom"));
  assert.ok(isBulkMailKind("refundOrExchange"));
  assert.ok(!isBulkMailKind("exchangeShipped"));
  assert.ok(!isBulkMailKind("whichSize"));
});

test("skupinsko pismo sestavi isto besedilo kot pismo enega naročila", () => {
  const single = customerEmailDraft({
    kind: "refundOrExchange",
    language: "de",
    customerName: "Jürgen Stolz",
    orderNumber: "3044",
    lines: [],
  });
  const bulk = wrapCustomerLetter("de", "Jürgen Stolz", customerEmailMiddle("refundOrExchange", "de"));
  assert.equal(bulk, single.body);
  // Nagovor je na prvo ime, podpis je na koncu — pri kupu enako kot pri enem.
  assert.ok(bulk.startsWith("Guten Tag Jürgen,"));
  assert.ok(bulk.trimEnd().endsWith("Kroj"));
});
