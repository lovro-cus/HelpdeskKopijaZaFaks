import assert from "node:assert/strict";
import test from "node:test";

import { capitalizeName, enforceGreeting } from "../src/lib/letter-greeting";

const SIGN = "Kind regards\nAna\nKroj";

test("pozdrav po času dneva zamenja nagovor iz šifranta", () => {
  // Primer iz prakse: stranka je napisala "Good morning Ana", model ob devetih zvečer za njo.
  assert.equal(
    enforceGreeting(`Good morning, Luca,\n\nThank you for the photos.\n\n${SIGN}`, "Hello Luca,"),
    `Hello Luca,\n\nThank you for the photos.\n\n${SIGN}`,
  );
  assert.equal(
    enforceGreeting("Buonasera Luca,\n\ngrazie per le foto.", "Gentile Luca,"),
    "Gentile Luca,\n\ngrazie per le foto.",
  );
  assert.equal(enforceGreeting("Guten Morgen Herr Weber,\n\ndanke.", "Guten Tag Herr,"), "Guten Tag Herr,\n\ndanke.");
});

test("pravi nagovor ostane, manjkajoč se doda, besedilo se ne dotakne", () => {
  const letter = `Hello Luca,\n\nThank you.\n\n${SIGN}`;
  assert.equal(enforceGreeting(letter, "Hello Luca,"), letter);
  // Model je začel naravnost z besedilom: nagovor pride pred njim.
  assert.equal(enforceGreeting("Thank you for the photos.", "Hello Luca,"), "Hello Luca,\n\nThank you for the photos.");
  // Prazne vrstice na začetku izpadejo.
  assert.equal(enforceGreeting("\n\nHi Luca,\n\nThanks.", "Hello Luca,"), "Hello Luca,\n\nThanks.");
  // Dolg prvi stavek, ki se začne s "Hello", ni nagovor — ostane in nagovor pride pred njim.
  const long = "Hello, we checked your order again and the replacement left our warehouse this morning.";
  assert.equal(enforceGreeting(long, "Hello Luca,"), `Hello Luca,\n\n${long}`);
});

test("ime z malo začetnico dobi veliko, ostalo ostane", () => {
  assert.equal(capitalizeName("luca"), "Luca");
  assert.equal(capitalizeName("jean-luc"), "Jean-Luc");
  assert.equal(capitalizeName("đuro"), "Đuro");
  // Kdor si je ime zapisal po svoje (McDonald, deVries), tega ne popravljamo.
  assert.equal(capitalizeName("McDonald"), "McDonald");
  assert.equal(capitalizeName("deVries"), "deVries");
});
