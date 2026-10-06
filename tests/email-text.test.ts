import assert from "node:assert/strict";
import test from "node:test";

import { repairEmailEncoding, stripQuotedReply } from "../src/lib/email-text";

test("repairs common Gmail mojibake without changing valid UTF-8", () => {
  assert.equal(repairEmailEncoding("SĂ¬, puĂ˛ restituire lâ€™invio"), "Sì, può restituire l’invio");
  assert.equal(repairEmailEncoding("È già corretto — hvala"), "È già corretto — hvala");
});

test("removes Gmail quoted history from replies", () => {
  const body = `Hi Antonio,

Please send a photo.

Best regards,
Ana

On Sun, 2 Aug 2026 at 19:25, Antonio <antonio@example.com> wrote:

> Old message
> Previous line`;
  assert.equal(stripQuotedReply(body), "Hi Antonio,\n\nPlease send a photo.\n\nBest regards,\nAna");
});

test("removes iPhone reply history and mobile signature", () => {
  const body = `Grazie  Inviato da iPhone

Il giorno 6 ago 2026, alle ore 18:47, Ana <ana@example.com> ha scritto:

Vecchio messaggio`;
  assert.equal(stripQuotedReply(body), "Grazie");
});

test("removes reply history when the attribution line wraps mid-phrase", () => {
  const body = "Buongiorno ANA\r\nHo provveduto alla spedizione.\r\n\r\nAttendo riscontro\r\n\r\n" +
    "Il giorno mar 21 lug 2026 alle ore 13:06 Ana Testmoto <podpora@kroj.example> ha\r\nscritto:\r\n\r\n> Salve Pietro,\r\n>\r\n> Grazie.";
  assert.equal(stripQuotedReply(body), "Buongiorno ANA\nHo provveduto alla spedizione.\n\nAttendo riscontro");
});

test("a Yahoo reply full of non-breaking spaces is cut quickly at its German attribution", () => {
  const nbsp = " ".repeat(40);
  const body = ` Hallo !${nbsp}Habe ich also nicht bezahlt ???${"  ".repeat(30)}Bitte um Info .${nbsp}LG Ralf\r\n` +
    "    Am Mittwoch, 5. August 2026 um 18:43:52 MESZ hat Ana Testmoto <podpora@kroj.example> Folgendes geschrieben:  \r\n \r\nHallo Ralf,\r\nAna";
  const started = Date.now();
  const text = stripQuotedReply(body);
  assert.ok(Date.now() - started < 200);
  assert.match(text, /LG Ralf$/);
  assert.doesNotMatch(text, /Hallo Ralf/);
});

test("keeps a standalone message intact", () => {
  const body = "Salve, oggi ho consegnato il pacco.\n\nGrazie e distinti saluti\nAntonio Setaro";
  assert.equal(stripQuotedReply(body), body);
});
