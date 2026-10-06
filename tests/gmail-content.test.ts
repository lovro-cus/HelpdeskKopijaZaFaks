import assert from "node:assert/strict";
import test from "node:test";

import { chooseEmailBody, decodeGmailPart, htmlEmailToText, isCustomerAlias, mentionsOrderNumber } from "../src/lib/gmail-content";

test("an empty plain MIME part falls back to the complete HTML body", () => {
  const body = chooseEmailBody([
    { mimeType: "text/plain", content: "   " },
    { mimeType: "text/html", content: "<p>Hello Ana,</p><p>I returned the trousers and want a refund.</p>" },
  ], "short snippet");
  assert.equal(body, "Hello Ana,\nI returned the trousers and want a refund.");
});

test("a suspiciously short plain alternative does not hide a complete HTML message", () => {
  const body = chooseEmailBody([
    { mimeType: "text/plain", content: "View online" },
    { mimeType: "text/html", content: "<p>Hello Ana,</p><p>The parcel was delivered yesterday. Please exchange the trousers for size XL.</p>" },
  ], "");
  assert.match(body, /exchange the trousers for size XL/);
});

test("plain-text attachments are not mistaken for the message body", () => {
  const body = chooseEmailBody([
    { mimeType: "text/plain", filename: "notes.txt", disposition: "attachment", content: "Attachment contents" },
    { mimeType: "text/html", content: "<div>Actual message</div>" },
  ], "");
  assert.equal(body, "Actual message");
});

test("HTML conversion keeps block boundaries and common European entities", () => {
  assert.equal(htmlEmailToText("<p>Gr&uuml;&szlig;e</p><p>Remboursement&nbsp;demand&eacute;</p>").trim(), "Grüße\nRemboursement demandé");
});

test("MIME charset is respected after Gmail base64url decoding", () => {
  const encoded = Buffer.from([0x47, 0x72, 0xfc, 0xdf, 0x65]).toString("base64url");
  assert.equal(decodeGmailPart(encoded, "text/plain; charset=iso-8859-1"), "Grüße");
});

test("the Gmail snippet remains a last-resort body", () => {
  assert.equal(chooseEmailBody([], "Customer asks for an exchange"), "Customer asks for an exchange");
});

test("a customer writing from a second address is recognised by name or mailbox", () => {
  const own = "podpora@kroj.example";
  const email = "heidi.muster@gmx.at";
  assert.equal(isCustomerAlias("Heidi Muster <heidi.muster@meinebank.cc>\nAna Testmoto <podpora@kroj.example>", email, "Heidi Muster", own), true);
  assert.equal(isCustomerAlias("Ana Testmoto <podpora@kroj.example>\nheidi.muster@firma.at", email, null, own), true);
  assert.equal(isCustomerAlias("Heidi Andere <andere8@web.de>\nAna <podpora@kroj.example>", email, "Heidi Muster", own), false);
  // Splošen lokalni del ni dovolj, da bi bil tuj naslov strankin.
  assert.equal(isCustomerAlias("info@other.at", "info@gmx.at", null, own), false);
  assert.equal(mentionsOrderNumber("AW: Rücksendungsantrag #1708", "1708"), true);
  assert.equal(mentionsOrderNumber("Bestellung 17080", "1708"), false);
});
