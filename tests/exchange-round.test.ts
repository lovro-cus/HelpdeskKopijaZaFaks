import assert from "node:assert/strict";
import test from "node:test";

import { requiresReturnProof } from "../src/lib/domain";
import {
  exchangeChanged,
  expectedReturnLines,
  heldAfterRound,
  isRoundFault,
  nextRoundItems,
  parseLines,
  parseReturnRows,
  rankPackages,
  returningNow,
  suggestedReturnRows,
  roundBlocker,
  roundSummary,
  snapshotLines,
  type RoundItem,
} from "../src/lib/exchange-round";

const pants = (extra: Partial<RoundItem> = {}): RoundItem => ({
  id: 1,
  name: "Nero pants",
  variant: "M",
  replacementVariant: "L",
  qty: 1,
  resolution: "exchange",
  ...extra,
});
const jacket = (extra: Partial<RoundItem> = {}): RoundItem => ({
  id: 2,
  name: "Jacket",
  variant: "XL",
  replacementVariant: null,
  qty: 1,
  resolution: "refund",
  ...extra,
});

test("nov krog: stranka ima zdaj poslani kos, novega še ni izbrala", () => {
  const next = nextRoundItems([pants(), jacket()]);
  assert.deepEqual(next[0], { id: 1, variant: "L", replacementVariant: null, replacementName: null, resolution: "exchange" });
  // Jakna je bila vrnjena že v prvem krogu; drugič je ne pričakujemo.
  assert.deepEqual(next[1], { id: 2, variant: "XL", replacementVariant: null, replacementName: null, resolution: "none" });
});

test("menjava brez izbrane zamenjave v novem krogu ostane, kakor je", () => {
  const [item] = nextRoundItems([pants({ replacementVariant: null })]);
  assert.deepEqual(item, { id: 1, variant: "M", replacementVariant: null, replacementName: null, resolution: "exchange" });
});

test("nov krog se ne začne, dokler rezerviran paket ni odšel ali ni česa menjati", () => {
  assert.equal(roundBlocker([pants()], 1), "active");
  assert.equal(roundBlocker([jacket()], 0), "noExchange");
  assert.equal(roundBlocker([pants({ replacementVariant: null })], 0), "noExchange");
  assert.equal(roundBlocker([pants(), jacket()], 0), null);
});

test("paket tekočega kroga pričakuje kos, ki ga ima stranka zdaj", () => {
  // Drugi krog: stranka vrača L, ki smo ji ga poslali.
  const items = [pants({ variant: "L", replacementVariant: null }), jacket({ resolution: "none" })];
  const expected = expectedReturnLines(2, 2, items, []);
  assert.deepEqual(expected, [{ issueItemId: 1, name: "Nero pants", variant: "L", qty: 1 }]);
});

test("pozno prispel paket prvega kroga pričakuje kose prvega kroga", () => {
  const firstRound = [pants(), jacket()];
  const rounds = [{ number: 2, previous: JSON.stringify(snapshotLines(firstRound)) }];
  const items = [pants({ variant: "L", replacementVariant: null }), jacket({ resolution: "none" })];
  const expected = expectedReturnLines(1, 2, items, rounds);
  assert.deepEqual(expected.map((line) => [line.name, line.variant]), [["Nero pants", "M"], ["Jacket", "XL"]]);
});

test("povezava na postavko, ki je ni več, se ne prenese", () => {
  const rounds = [{ number: 2, previous: JSON.stringify(snapshotLines([pants({ id: 99 })])) }];
  const [line] = expectedReturnLines(1, 2, [pants({ id: 5 })], rounds);
  assert.equal(line!.issueItemId, null);
});

test("brez posnetka register ne ugiba", () => {
  assert.deepEqual(expectedReturnLines(1, 3, [pants()], []), []);
  assert.deepEqual(parseLines("ni json"), []);
  assert.deepEqual(parseLines('[{"name":1}]'), []);
});

test("po odpremi se ne sme spremeniti, kaj menjamo; ostalo se sme", () => {
  const before = [pants(), jacket()];
  assert.equal(exchangeChanged(before, [pants({ replacementVariant: "XL" }), jacket()]), true);
  assert.equal(exchangeChanged(before, [pants({ resolution: "refund" }), jacket()]), true);
  assert.equal(exchangeChanged(before, [pants(), jacket({ variant: "L" })]), false);
  assert.equal(exchangeChanged(before, [jacket(), pants()]), false, "vrstni red ni sprememba");
});

test("pri naši napaki stranka kos obdrži, zato menjava paketa ne zahteva", () => {
  assert.equal(requiresReturnProof("exchange", [{ resolution: "exchange" }], undefined, "ours"), false);
  assert.equal(requiresReturnProof("exchange", [{ resolution: "exchange" }], undefined, "customer"), true);
  // Vračilo denarja paket še vedno zahteva, tudi v krogu naše napake.
  assert.equal(requiresReturnProof("exchange", [{ resolution: "exchange" }, { resolution: "refund" }], undefined, "ours"), true);
});

test("zgodovina kroga pove, kaj je odšlo in kaj ima stranka zdaj", () => {
  const items = [pants(), jacket()];
  assert.equal(roundSummary(items), "1× Nero pants M → L");
  assert.equal(heldAfterRound(items), "1× Nero pants L");
  assert.equal(returningNow(items), "1× Nero pants M, 1× Jacket XL");
});

test("vračilo po odposlani menjavi se izpolni s tem, kar smo poslali", () => {
  assert.deepEqual(suggestedReturnRows([pants(), jacket()]), {
    newRound: true,
    rows: [{ name: "Nero pants", variant: "L", qty: 1 }],
  });
});

test("brez odposlane menjave je to še en paket istega kroga", () => {
  assert.deepEqual(suggestedReturnRows([pants({ replacementVariant: null }), jacket(), jacket({ id: 3, resolution: "none" })]), {
    newRound: false,
    rows: [{ name: "Nero pants", variant: "M", qty: 1 }, { name: "Jacket", variant: "XL", qty: 1 }],
  });
});

test("vsebino paketa je mogoče popraviti; prazna vrstica odpade, nepopolna ne gre skozi", () => {
  assert.deepEqual(
    parseReturnRows(["Nero pants", "", " Jacket "], ["XL", "", ""], ["1", "1", "2"]),
    [{ name: "Nero pants", variant: "XL", qty: 1 }, { name: "Jacket", variant: null, qty: 2 }],
  );
  assert.equal(parseReturnRows(["", ""], ["", ""], ["1", "1"]), null, "prazen paket");
  assert.equal(parseReturnRows([""], ["L"], ["1"]), null, "varianta brez imena");
  assert.equal(parseReturnRows(["Nero pants"], ["L"], ["0"]), null, "količina nič");
  assert.equal(parseReturnRows(["Nero pants"], ["L"], ["1.5"]), null, "neceloštevilska količina");
});

test("paketi s pošiljateljem, ki nosi ime stranke, so predlagani prvi", () => {
  const packages = [
    { id: "1", sender: "DHL Retoure" },
    { id: "2", sender: "Müller Anna" },
    { id: "3", sender: "Annabelle Shop" },
  ];
  const ranked = rankPackages(packages, "Anna Müller");
  assert.deepEqual(ranked.suggested.map((parcel) => parcel.id), ["2"]);
  assert.deepEqual(ranked.other.map((parcel) => parcel.id), ["1", "3"], "del besede ni ujemanje");
  assert.deepEqual(rankPackages(packages, null).suggested, []);
});

test("neznan razlog kroga se ne sprejme", () => {
  assert.ok(isRoundFault("ours"));
  assert.ok(isRoundFault("customer"));
  assert.ok(!isRoundFault("both"));
  assert.ok(!isRoundFault(null));
});
