import assert from "node:assert/strict";
import test from "node:test";

import { ALL_SCOPES, parseScopes, SEARCH_SCOPES, scopeParam } from "../src/lib/search-scope";

test("izbor polj se prebere iz naslova, nerazumljeno pa pade na vsa polja", () => {
  assert.deepEqual(parseScopes("order,tracking"), ["order", "tracking"]);
  assert.deepEqual(parseScopes(" order , email "), ["order", "email"]);
  // Podvojeno ne podvoji pogojev v poizvedbi.
  assert.deepEqual(parseScopes("order,order"), ["order"]);

  // Prazno, neznano ali manjkajoče pomeni vsa polja: iskanje brez enega samega
  // polja ne bi vrnilo nikoli ničesar in bi bilo videti kot okvara.
  assert.deepEqual(parseScopes(null), ALL_SCOPES);
  assert.deepEqual(parseScopes(""), ALL_SCOPES);
  assert.deepEqual(parseScopes("naslov,xyz"), ALL_SCOPES);
});

test("poln izbor se v naslov ne zapiše, ker je privzetek", () => {
  assert.equal(scopeParam([...SEARCH_SCOPES]), null);
  assert.equal(scopeParam([]), null);
  // Vrstni red je vedno isti, da se naslov med kliki ne premetava.
  assert.equal(scopeParam(["tracking", "order"]), "order,tracking");
});

test("zapis in branje izbora se ujemata", () => {
  const chosen = ["order", "email"] as const;
  assert.deepEqual(parseScopes(scopeParam([...chosen])), [...chosen]);
});
