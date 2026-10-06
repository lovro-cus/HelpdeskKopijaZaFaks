import assert from "node:assert/strict";
import test from "node:test";

import { cleanSubject } from "../src/lib/subject";

test("naslov zapisa izgubi predpone odgovorov in posredovanj", () => {
  assert.equal(cleanSubject("Re:  Aw: Wg: Aw: Re:  Wg: Bestellung #2510 bestätigt"), "Bestellung #2510 bestätigt");
  assert.equal(cleanSubject("R: I: Ordine 2647"), "Ordine 2647");
  assert.equal(cleanSubject("FWD: Re[2]: Rücksendung"), "Rücksendung");
  assert.equal(cleanSubject("SV: Retur"), "Retur");
});

test("vsebina, ki samo spominja na predpono, ostane", () => {
  assert.equal(cleanSubject("Reklamacija hlač"), "Reklamacija hlač");
  assert.equal(cleanSubject("Retoure: falsche Größe"), "Retoure: falsche Größe");
  assert.equal(cleanSubject("Re:"), "Re:");
  assert.equal(cleanSubject(null), "");
});
