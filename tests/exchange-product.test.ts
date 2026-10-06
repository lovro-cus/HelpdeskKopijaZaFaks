import assert from "node:assert/strict";
import test from "node:test";

import "./support/catalog";
import { translate } from "../src/lib/i18n/dictionaries";
import { DEFAULT_TEXT_SETTINGS, parseTextSetting, TEXT_SETTING_DEFS } from "../src/lib/config/defaults";
import { canonicalLabel } from "../src/lib/catalog-canonical";
import { awaitsPriceSettlement, itemPriceDiff, priceDiffOf } from "../src/lib/exchange-price";
import { catalogGroupOptions, groupIdOfTitle, groupVariantsOf, representativeTitleOf, selectionOf } from "../src/lib/catalog";
import { exchangeDemand } from "../src/lib/shipg-matching";
import { itemsFingerprint, summarizeItems } from "../src/lib/items";
import { heldAfterRound, nextRoundItems, roundSummary, suggestedReturnRows, type RoundItem } from "../src/lib/exchange-round";

const PANTS = "Testmoto TrailShield™ Motorcycle Pants"; // 129 €
const JEANS = "Testmoto FlexArmor™ Black Motorcycle Jeans"; // 139 €

/** Primer iz prakse: stranka vrne 2 hlače in želi 2 jeansa. */
const swap = (extra: Record<string, unknown> = {}) => ({
  name: PANTS,
  variant: "Black / L",
  replacementVariant: "Black / L",
  replacementName: JEANS,
  qty: 2,
  resolution: "exchange",
  ...extra,
});

test("menjava v drug izdelek išče v zalogi tisto, kar stranka hoče dobiti", () => {
  assert.deepEqual(exchangeDemand([swap()]), [{ name: JEANS, variant: "Black / L", qty: 2 }]);

  // Brez drugega izdelka ostane vse po starem: menjava znotraj istega izdelka.
  assert.deepEqual(
    exchangeDemand([swap({ replacementName: null, replacementVariant: "Black / XL" })]),
    [{ name: PANTS, variant: "Black / XL", qty: 2 }],
  );
});

test("razlika v ceni šteje ceno obeh izdelkov in količino", () => {
  // 2× (139 − 129) = 20 € doplačila.
  assert.deepEqual(itemPriceDiff(swap()), { kind: "diff", amount: 20 });
  // Obratna smer: dražje vrne, cenejše dobi — razliko vrnemo stranki.
  assert.deepEqual(itemPriceDiff(swap({ name: JEANS, replacementName: PANTS })), { kind: "diff", amount: -20 });

  // Menjava znotraj istega izdelka cene ne spremeni.
  assert.deepEqual(itemPriceDiff(swap({ replacementName: null })), { kind: "none" });
  // Vračilo ni menjava.
  assert.deepEqual(itemPriceDiff(swap({ resolution: "refund" })), { kind: "none" });

  // Izdelek izven kataloga: cene ne poznamo in tega ne smemo brati kot "ni razlike".
  assert.deepEqual(itemPriceDiff(swap({ replacementName: "Nekaj tretjega" })), { kind: "unknown" });
  // Katalog je v evrih; pri naročilu v frankih razlike ne izračunavamo.
  assert.deepEqual(itemPriceDiff(swap(), "CHF"), { kind: "unknown" });

  // Enaki ceni ne terjata ničesar.
  assert.deepEqual(priceDiffOf(129, 129, 3), { kind: "none" });
});

test("menjava čaka, dokler razlika ni potrjena", () => {
  assert.equal(awaitsPriceSettlement(swap()), true);
  assert.equal(awaitsPriceSettlement(swap({ priceDiffSettled: true })), false);
  // Neznana cena potrditev potrebuje; enaka cena ne.
  assert.equal(awaitsPriceSettlement(swap({ replacementName: "Nekaj tretjega" })), true);
  assert.equal(awaitsPriceSettlement(swap({ replacementName: null })), false);
});

test("dnevnik in pisma povedo izdelek, ne le velikost", () => {
  assert.equal(
    summarizeItems([swap()], (r) => r),
    `${PANTS} Black / L ×2 · exchange → ${JEANS} Black / L`,
  );
});

test("z novim krogom postavka postane izdelek, ki ga ima stranka zdaj", () => {
  const item: RoundItem = { id: 1, ...swap() } as RoundItem;

  assert.deepEqual(nextRoundItems([item])[0], {
    id: 1,
    name: JEANS,
    variant: "Black / L",
    replacementVariant: null,
    replacementName: null,
    resolution: "exchange",
  });

  assert.equal(roundSummary([item]), `2× ${PANTS} Black / L → ${JEANS} Black / L`);
  assert.equal(heldAfterRound([item]), `2× ${JEANS} Black / L`);
  // Vrne se tisto, kar smo poslali — jeans, ne hlače.
  assert.deepEqual(suggestedReturnRows([item]), {
    newRound: true,
    rows: [{ name: JEANS, variant: "Black / L", qty: 2 }],
  });
});

test("potrjena razlika je sprememba, tudi če je povzetek enak", () => {
  const row = { ...swap(), variant: "Black / L", amount: 258, priceDiffSettled: false };
  const settled = { ...row, priceDiffSettled: true };

  // Povzetek je za človeka in potrditve ne pokaže — po njem bi se izgubila.
  assert.equal(summarizeItems([row], (r) => r), summarizeItems([settled], (r) => r));
  assert.notEqual(itemsFingerprint([row]), itemsFingerprint([settled]));
  assert.equal(itemsFingerprint([row]), itemsFingerprint([{ ...row }]));
});

test("izdelek se izbira po skupinah iz admina, ne po vseh nazivih trgov", () => {
  const options = catalogGroupOptions();
  const labels = options.map((option) => option.label);

  // Ene hlače so v Shopifyju svoj izdelek za vsak trg in vsako barvo; v izbiri
  // nastopijo enkrat, pod imenom skupine.
  assert.equal(labels.filter((label) => label === "TrailShield hlače").length, 1);
  assert.ok(labels.includes("FlexArmor jeans"));
  assert.ok(!labels.some((label) => label.includes("TrailShield™ Green")));

  // Izdelek brez skupine se ne izgubi — nastopa pod svojim nazivom.
  assert.ok(labels.includes("Testmoto GardeVoie™ Pantalon Moto"));

  // Skupina je krajša od surovega seznama nazivov.
  assert.ok(options.length < 21);
});

test("variante skupine pokrijejo vse njene izdelke, vsak fizični kos enkrat", () => {
  const id = groupIdOfTitle(PANTS);
  assert.equal(id, "g:trailshield-pants");
  const variants = groupVariantsOf(id);
  const labels = variants.map((variant) => variant.label);

  // Barva je pri Shopifyju svoj izdelek, pri nas varianta — zato mora biti v
  // enem seznamu, sicer zelenih hlač pod črnim izdelkom ni mogoče izbrati.
  assert.ok(labels.some((label) => label.startsWith("Črna")));
  assert.ok(labels.some((label) => label.startsWith("Zelena")));
  assert.ok(labels.some((label) => label.startsWith("Camo")));

  // Vsak kos enkrat: isti kos z italijanskega in nemškega trga se zloži skupaj.
  assert.equal(new Set(variants.map((variant) => variant.key)).size, variants.length);
  assert.equal(new Set(labels).size, labels.length);

  // Izbrana varianta pove, kateri Shopifyjev izdelek jo v resnici nosi — in ta
  // izdelek jo mora res imeti, sicer slike in ujemanje zaloge zgrešijo.
  const green = variants.find((variant) => variant.label.startsWith("Zelena"))!;
  assert.notDeepEqual(selectionOf(green.title, green.variant), {});
});

test("naziv nadomestka vzame trg, na katerem je stranka naročila", () => {
  const EN = "Testmoto TrailShield™ Black Motorcycle Pants";
  const IT = "Testmoto ScudoStrada™ Pantaloni da Moto";
  const id = groupIdOfTitle(EN);

  // Naziv gre v pismo stranki: italijanski naziv v angleškem pismu bi bil
  // napaka, čeprav gre za iste hlače.
  assert.equal(representativeTitleOf(id, EN), EN);
  assert.equal(representativeTitleOf(id, IT), IT);
  assert.equal(groupVariantsOf(id, IT).every((variant) => variant.title === IT), true);
});

test("prošnja dobavitelju našteje natanko to, kar Desk išče v zalogi", () => {
  const items = [
    { name: PANTS, variant: "Black / L", replacementVariant: "Black / L", replacementName: null, qty: 1, resolution: "exchange" },
    { name: PANTS, variant: "Black / L", replacementVariant: "Green / L", replacementName: null, qty: 1, resolution: "exchange" },
  ];
  // Isti izračun kot v kartici in v dejanju: povpraševanje → berljive oznake.
  const wanted = exchangeDemand(items)
    .map((item) => `${item.qty}× ${canonicalLabel(item.name, item.variant)}`)
    .join(", ");
  assert.equal(wanted, "1× TrailShield hlače · Črna · L, 1× TrailShield hlače · Zelena · L");

  // Ime dobavitelja je nastavitev, ne del besedila — prošnja ga samo vstavi.
  const vars = { items: wanted, supplier: "Klara", code: "SUP-7", address: "Ana, Wien" };
  const sl = translate("sl", "shipg.exchange.supplierNote", vars);
  assert.ok(sl.includes("pri Klara"));
  assert.ok(sl.includes(wanted));
  assert.ok(sl.includes("SUP-7") && sl.includes("Ana, Wien"));
  assert.ok(translate("sl", "shipg.exchange.supplierNote", { ...vars, supplier: "Klara" }).includes("pri Klara"));
  assert.ok(translate("en", "shipg.exchange.supplierNote", { items: wanted, supplier: "Klara" }).includes(wanted));
});

test("ime dobavitelja se privzame, prazno pa se zavrne", () => {
  assert.equal(DEFAULT_TEXT_SETTINGS.supplierName, "Tekstil Mura");
  assert.equal(parseTextSetting("supplierName", " Klara "), "Klara");
  // Prazno ime bi dalo prošnjo brez naslovnika.
  assert.equal(parseTextSetting("supplierName", "   "), null);
  assert.equal(parseTextSetting("supplierName", null), null);
  // Predolgo ime se odreže, ne zavrne.
  assert.equal(parseTextSetting("supplierName", "x".repeat(200))?.length, TEXT_SETTING_DEFS.supplierName.maxLength);
});
