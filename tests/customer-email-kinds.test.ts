import assert from "node:assert/strict";
import { test } from "node:test";

import { customerEmailDraft, DRAFT_KINDS } from "../src/lib/customer-email";

const base = { customerName: "Anita Muster", orderNumber: "3182", lines: [] };

test("every kind produces a subject and a signed body in every language", () => {
  for (const kind of DRAFT_KINDS) {
    for (const language of ["de", "it", "fr", "es", "en", "sl"] as const) {
      const { subject, body } = customerEmailDraft({ ...base, kind, language });
      assert.ok(subject.includes("#3182"), `${kind}/${language} subject`);
      assert.match(body, /\nAna\nKroj$/, `${kind}/${language} signature`);
      assert.ok(body.split("\n")[0].includes("Anita"), `${kind}/${language} greeting`);
    }
  }
});

test("refund-or-exchange lists both options and never the items", () => {
  const { body } = customerEmailDraft({
    ...base,
    kind: "refundOrExchange",
    language: "sl",
    lines: [{ qty: 1, name: "Testmoto TrailShield™ Motorcycle Pants", variant: "Črna / XL" }],
  });
  assert.match(body, /– vračilo plačanega zneska/);
  assert.match(body, /– menjava za drugo velikost ali barvo/);
  assert.ok(!body.includes("TrailShield"), "options mail must not list the items");
});

test("which-size names the item the customer already has", () => {
  const { body, subject } = customerEmailDraft({
    ...base,
    kind: "whichSize",
    language: "de",
    lines: [{ qty: 1, name: "Testmoto TrailShield™ Motorcycle Pants", variant: "Schwarz / L" }],
  });
  assert.match(subject, /welche Größe/);
  assert.match(body, /Testmoto TrailShield™ Motorcycle Pants – Schwarz \/ L/);
});

test("the custom kind is an empty frame: greeting, room to write, signature", () => {
  const { body } = customerEmailDraft({ ...base, kind: "custom", language: "en" });
  const lines = body.split("\n");
  assert.equal(lines[0], "Hello Anita,");
  assert.deepEqual(lines.slice(-3), ["Kind regards", "Ana", "Kroj"]);
  assert.ok(!/[A-Za-z]/.test(lines.slice(1, -3).join("")), "the middle must be blank");
});

test("return instructions contain the exact warehouse address", () => {
  const { body } = customerEmailDraft({ ...base, kind: "returnInstructions", language: "en" });
  assert.match(body, /Kroj Info\nc\/o Skladišče Kroj\nTestna ulica 1\n1000 Ljubljana\nSlovenia/);
  assert.ok(!body.includes("a refund of the amount paid"));
  const german = customerEmailDraft({ ...base, kind: "returnInstructions", language: "de" }).body;
  assert.match(german, /1000 Ljubljana\nSlowenien/);
});

test("return instructions follow the policy: the customer pays postage and sends the tracking number", () => {
  const { body } = customerEmailDraft({ ...base, kind: "returnInstructions", language: "en" });
  assert.equal(body, [
    "Hello Anita,",
    "",
    "Thank you for your message.",
    "",
    "After carefully reviewing your order, we can confirm that you received the same sizes that you ordered. However, we understand that the items did not fit as expected, and we are sorry that they did not meet your expectations.",
    "",
    "Of course, you may return the items, provided they are unworn, unused and in their original packaging.",
    "",
    "Please return the items to the following address:",
    "",
    "Kroj Info",
    "c/o Skladišče Kroj",
    "Testna ulica 1",
    "1000 Ljubljana",
    "Slovenia",
    "",
    "Please note that the return shipping cost is your responsibility.",
    "",
    "Once you have shipped the return, please send us the return tracking number so we can monitor the shipment. After we receive and inspect the returned items, we will proceed with the next steps regarding your refund or replacement, as requested.",
    "",
    "Thank you for your understanding and cooperation.",
    "",
    "Kind regards",
    "Ana",
    "Kroj",
  ].join("\n"));
  for (const language of ["de", "it", "fr", "es", "sl"] as const) {
    const letter = customerEmailDraft({ ...base, kind: "returnInstructionsWithChoice", language }).body;
    assert.ok(letter.indexOf("Ljubljana") < letter.indexOf("– "), `${language}: options come after the address and the postage note`);
  }
});

test("return instructions with choice ask for refund or exchange", () => {
  const { body } = customerEmailDraft({ ...base, kind: "returnInstructionsWithChoice", language: "en" });
  assert.match(body, /– a refund of the amount paid/);
  assert.match(body, /– an exchange for a different size or colour/);
  assert.match(body, /c\/o Skladišče Kroj/);
});

test("Spanish return instructions stay in the customer's language", () => {
  const { body } = customerEmailDraft({ ...base, kind: "returnInstructionsWithChoice", language: "es" });
  assert.match(body, /^Hola Anita,/);
  assert.match(body, /Envíe los artículos a la siguiente dirección:/);
  assert.match(body, /los gastos de envío de la devolución corren de su cuenta/);
  assert.match(body, /– el reembolso del importe pagado/);
  assert.match(body, /Un cordial saludo\nAna\nKroj$/);
});
