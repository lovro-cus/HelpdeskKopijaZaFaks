import assert from "node:assert/strict";
import test from "node:test";

import { readTemplateTexts, templateLanguageFor, templateLetter } from "../src/lib/mail-template";

test("template texts keep only languages with a body", () => {
  const texts = readTemplateTexts(JSON.stringify({
    en: { subject: " Customs {order} ", body: " The parcel is at customs. " },
    de: { subject: "Zoll", body: "   " },
    xyz: { body: "nope" },
  }));
  assert.deepEqual(texts, { en: { subject: "Customs {order}", body: "The parcel is at customs." } });
  assert.deepEqual(readTemplateTexts("not json"), {});
  assert.deepEqual(readTemplateTexts({ en: { body: "Hi" }, it: { body: "Ciao" } }, ["en"]), { en: { subject: "", body: "Hi" } });
});

test("a missing language falls back to English, then to the first one", () => {
  assert.equal(templateLanguageFor({ de: { subject: "", body: "a" }, en: { subject: "", body: "b" } }, "it"), "en");
  assert.equal(templateLanguageFor({ de: { subject: "", body: "a" } }, "it"), "de");
  assert.equal(templateLanguageFor({ it: { subject: "", body: "a" } }, "it"), "it");
  assert.equal(templateLanguageFor({}, "it"), null);
});

test("the letter gets greeting, order number and signature in the template's language", () => {
  const texts = { en: { subject: "Your order {order} at customs", body: "Your order {order} is held at customs.\n\nPlease pay the duty." } };
  const letter = templateLetter(texts, "en", { customerName: "Dario Rossi", orderNumber: "3301" });
  assert.equal(letter?.subject, "Your order #3301 at customs");
  assert.equal(letter?.body, "Hello Dario,\n\nYour order #3301 is held at customs.\n\nPlease pay the duty.\n\nKind regards\nAna\nKroj");
  const noSubject = templateLetter({ en: { subject: "", body: "Text" } }, "en", { customerName: null, orderNumber: "3301" });
  assert.equal(noSubject?.subject, "Your order #3301");
  assert.equal(templateLetter(texts, "de", { customerName: null, orderNumber: "1" }), null);
});
