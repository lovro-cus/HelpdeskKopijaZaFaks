import assert from "node:assert/strict";
import { test } from "node:test";

import { customerLanguage, customerLanguageForReply, exchangeItemLine, exchangeShippedDraft } from "../src/lib/customer-email";

test("country picks the language, unknown markets fall back to English", () => {
  assert.equal(customerLanguage("AT"), "de");
  assert.equal(customerLanguage("ch"), "de");
  assert.equal(customerLanguage("IT"), "it");
  assert.equal(customerLanguage("FR"), "fr");
  assert.equal(customerLanguage("ES"), "es");
  assert.equal(customerLanguage("SI"), "sl");
  assert.equal(customerLanguage("NL"), "en");
  assert.equal(customerLanguage(null), "en");
});

test("the latest meaningful customer message decides the reply language", () => {
  const language = customerLanguageForReply([
    { direction: "incoming", subject: "Re: devolución", body: "Hola, sí claro. Quiero devolver el pedido." },
    { direction: "outgoing", subject: "Re: devolución", body: "Thank you for contacting us." },
  ], "DE");
  assert.equal(language, "es", "the Spanish email must override the German delivery country and our English reply");
});

test("a short last message falls back to an earlier customer message, not the country", () => {
  const language = customerLanguageForReply([
    { direction: "incoming", subject: "Rücksendung", body: "Guten Tag, ich möchte meine Bestellung zurückschicken." },
    { direction: "incoming", subject: "Re: Rücksendung", body: "OK" },
  ], "ES");
  assert.equal(language, "de");
});

test("provider language detection wins and country remains the final fallback", () => {
  assert.equal(customerLanguageForReply([
    { direction: "incoming", subject: "3303", body: "OK", detectedLanguage: "fr-FR" },
  ], "ES"), "fr");
  assert.equal(customerLanguageForReply([
    { direction: "incoming", subject: "3303", body: "OK" },
  ], "IT"), "it");
});

test("the item line keeps the Shopify name and variant the customer knows", () => {
  assert.equal(
    exchangeItemLine({ qty: 1, name: "Testmoto TrailShield™ Motorcycle Pants", variant: "Schwarz / XL / EU 50 / W34 / Herren" }),
    "Testmoto TrailShield™ Motorcycle Pants – Schwarz / XL / EU 50 / W34 / Herren",
  );
  assert.equal(exchangeItemLine({ qty: 2, name: "Testmoto™ Gürtel", variant: null }), "2× Testmoto™ Gürtel");
});

test("German draft greets by first name and signs off as Ana", () => {
  const { subject, body } = exchangeShippedDraft({
    language: "de",
    customerName: "Anita Paulitsch-Grünwald",
    orderNumber: "3182",
    lines: [{ qty: 1, name: "Testmoto TrailShield™ Motorcycle Pants", variant: "Schwarz / XL" }],
  });

  assert.equal(subject, "Ihre Bestellung #3182 – Ersatz ist unterwegs");
  assert.match(body, /^Guten Tag Anita,/);
  assert.match(body, /wir haben Ihnen den Ersatz zugeschickt:/);
  assert.match(body, /Testmoto TrailShield™ Motorcycle Pants – Schwarz \/ XL/);
  assert.match(body, /Freundliche Grüße\nAna\nKroj$/);
});

test("a missing customer name leaves a clean greeting, not an empty slot", () => {
  const { body } = exchangeShippedDraft({
    language: "sl",
    customerName: null,
    orderNumber: "#3182",
    lines: [{ qty: 1, name: "Testmoto ImpactWeave™ Motorcycle Jeans", variant: "XL" }],
  });
  assert.match(body, /^Pozdravljeni,\n/);
});

test("the order number is hashed exactly once", () => {
  const withHash = exchangeShippedDraft({ language: "en", customerName: "A", orderNumber: "#3182", lines: [] });
  const without = exchangeShippedDraft({ language: "en", customerName: "A", orderNumber: "3182", lines: [] });
  assert.equal(withHash.subject, without.subject);
  assert.match(withHash.subject, /#3182/);
});
