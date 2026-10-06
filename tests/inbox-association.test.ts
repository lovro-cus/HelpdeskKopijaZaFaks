import assert from "node:assert/strict";
import test from "node:test";

import { chooseInboxIssue, contactDetails, inboxOrderNumbers, orderMatchesContact, senderName, unlinkedReasonFor } from "../src/lib/inbox-association";

const issues = [
  { id: 1, orderNumber: "234" },
  { id: 2, orderNumber: "1234" },
];

test("an exact order number chooses the right ticket, not a numeric substring", () => {
  assert.equal(chooseInboxIssue(issues, "Re: Return for order #1234")?.id, 2);
});

test("a shared customer without an order number stays unassigned", () => {
  assert.equal(chooseInboxIssue(issues, "I would like to return the trousers."), null);
});

test("email alone is safe when the customer has only one ticket", () => {
  assert.equal(chooseInboxIssue([issues[0]], "I would like to return the trousers.")?.id, 1);
});

test("a mail without a ticket says why", () => {
  assert.equal(unlinkedReasonFor([], 0), "no_order");
  assert.equal(unlinkedReasonFor([], 2), "many_tickets");
  assert.equal(unlinkedReasonFor(["1234", "1250"], 0), "many_orders");
});

test("the sender name comes from the From header, a bare address has none", () => {
  assert.equal(senderName("Sanne de Vries <sanne@example.com>"), "Sanne de Vries");
  assert.equal(senderName("\"Marco Bianchi\" <marco@example.com>"), "Marco Bianchi");
  assert.equal(senderName("marco@example.com"), null);
});

test("Shopify contact form order numbers are extracted without AI", () => {
  assert.deepEqual(inboxOrderNumbers("Order number: #7812\nI need help"), ["7812"]);
  assert.deepEqual(inboxOrderNumbers("Bestellnummer 7813"), ["7813"]);
});

test("ordinary words after 'order' are not order numbers", () => {
  assert.deepEqual(inboxOrderNumbers("Your order is on the way"), []);
  assert.deepEqual(inboxOrderNumbers("Die Bestellung ist unterwegs"), []);
  assert.deepEqual(inboxOrderNumbers("Ordine Federico Lisi"), []);
  assert.deepEqual(inboxOrderNumbers("Bestellung vom 8.7.2026"), []);
  assert.deepEqual(inboxOrderNumbers("Re: Ordine n. #3305"), ["3305"]);
  assert.deepEqual(inboxOrderNumbers("Order #3694 can ship. Open order in Desk"), ["3694"]);
});

test("order numbers in common phrasings", () => {
  assert.deepEqual(inboxOrderNumbers("Retoure aus Bestellnr. 3351"), ["3351"]);
  assert.deepEqual(inboxOrderNumbers("il numero d'ordine è 3305"), ["3305"]);
  assert.deepEqual(inboxOrderNumbers("RE: número de pedido 3366"), ["3366"]);
  assert.deepEqual(inboxOrderNumbers("BESTELLUNG Nr. 2250 vom 8.7.2026"), ["2250"]);
});

test("order numbers inside formatted text", () => {
  assert.deepEqual(inboxOrderNumbers("il tuo ordine *#3610* è attualmente"), ["3610"]);
  assert.deepEqual(inboxOrderNumbers("(#3610)"), ["3610"]);
});

test("Shopify contact form phone and name", () => {
  const form = "Nome:\nMario Rossi\n\nEmail:\nmariorossi@yahoo.it\n\nNumero Di Telefono:\n3750000001\n\nPhone Number:\n3750000001";
  const found = contactDetails(form);
  assert.deepEqual(found.phones, ["3750000001"]);
  assert.deepEqual(found.names, ["Mario Rossi"]);
});

test("an order matches the sender by email, phone or full name", () => {
  const order = { emails: ["mario@yahoo.com"], phones: ["+39 375 000 0001"], names: ["Mario Rossi"] };
  assert.equal(orderMatchesContact(order, { emails: ["mariorossi@yahoo.it"], phones: ["3750000001"], names: [] }), true);
  assert.equal(orderMatchesContact(order, { emails: ["x@y.it"], phones: [], names: ["Rossi Mario"] }), true);
  // Lastna domena podjetja velja, javni ponudnik ne.
  const company = { emails: ["thomas@firma-muster.ch"], phones: [null], names: ["Thomas Muster"] };
  assert.equal(orderMatchesContact(company, { emails: ["thomas.muster@firma-muster.ch"], phones: [], names: [] }), true);
  const freemail = { emails: ["jon.doe@gmail.com"], phones: [null], names: [null] };
  assert.equal(orderMatchesContact(freemail, { emails: ["someone.else@gmail.com"], phones: [], names: [] }), false);
  assert.equal(orderMatchesContact(order, { emails: ["x@y.it"], phones: ["3331234567"], names: ["Mario"] }), false);
});
