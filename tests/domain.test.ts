import assert from "node:assert/strict";
import test from "node:test";
import "./support/catalog";
import {
  asMatchQuality,
  canAccessShipg,
  canDispatchMatch,
  canClose,
  entryStance,
  handoffLevelOf,
  ISSUE_TYPES,
  PRIORITIES,
  isShipgermanMarket,
  issueStatusForParcel,
  normalizeCurrency,
  RETURN_TYPES,
  parcelHolds,
  parcelOutcome,
  parcelTimeGuard,
  refundTotal,
  requiresReturnProof,
  PENDING_RESOLUTION,
  hasPendingResolution,
  unresolvedMessage,
  SYSTEM_LEVEL,
  WAIT_PRESETS,
  isoDay,
  waitDeadline,
} from "../src/lib/domain";

import { parseItems, summarizeItems } from "../src/lib/items";
import { lineTotalAfterDiscounts } from "../src/lib/money";
import { normalizeNumber } from "../src/lib/tracking/provider";
import { asLocale } from "../src/lib/i18n/shared";
import { translate } from "../src/lib/i18n/dictionaries";
import { PARCEL_DEFAULTS } from "../src/lib/config/defaults";
import { meetsThreshold, rankOf, type Category } from "../src/lib/config/shared";

/** Šifrant, kakršnega dobi koda iz baze — v testih ga sestavimo iz zasnove. */
const asCategories = (items: readonly { id: string }[]): Category[] =>
  items.map((item, position) => ({
    key: item.id,
    label: item.id,
    color: "var(--ink-2)",
    position,
    hidden: false,
    requiresReturn: false,
    watchFulfillment: false,
    builtin: true,
  }));

const TYPES = asCategories(ISSUE_TYPES);
const PRIOS = asCategories(PRIORITIES);
const STALE_HOURS = PARCEL_DEFAULTS.staleHours;
import { failedRules } from "../src/lib/password-rules";
import { imageOf, optionsOf, selectionOf, variantTitleOf } from "../src/lib/catalog";
import { looksLikeOrderNumber, orderNumberKey } from "../src/lib/order-number";
import { paymentInfoFromTransactions, priorityForPayment } from "../src/lib/payment";

test("ShipGerman ships anywhere except Germany", () => {
  for (const code of ["IT", "AT", "CH", "FR"]) assert.equal(isShipgermanMarket(code), true);
  assert.equal(isShipgermanMarket("DE"), false);
  assert.equal(isShipgermanMarket(null), false);
  assert.equal(isShipgermanMarket(""), false);
});

test("ShipG inventory is restricted to level 2 and above", () => {
  assert.equal(canAccessShipg({ level: 1, isAdmin: false }), false);
  assert.equal(canAccessShipg({ level: 2, isAdmin: false }), true);
  assert.equal(canAccessShipg({ level: 3, isAdmin: false }), true);
  assert.equal(canAccessShipg({ level: 1, isAdmin: true }), false);
});

test("level 1 cannot close, level 2 and admin can", () => {
  assert.equal(canClose({ level: 1, isAdmin: false }), false);
  assert.equal(canClose({ level: 2, isAdmin: false }), true);
  assert.equal(canClose({ level: 1, isAdmin: true }), true);
});

test("level handoff targets accept only configured levels", () => {
  assert.equal(handoffLevelOf("level:2"), 2);
  assert.equal(handoffLevelOf("level:5"), 5);
  assert.equal(handoffLevelOf("level:0"), null);
  assert.equal(handoffLevelOf("level:6"), null);
  assert.equal(handoffLevelOf("user-id"), null);
});

test("an entry from the level holding the ticket claims it, anyone else is external", () => {
  const ana = { id: "ana", level: 3 };
  const bine = { id: "bine", level: 1 };

  // Predano na nivo 3: vnos s tretjega nivoja je prevzem, vnos s prvega zunanji.
  const queued = { assigneeId: null, level: 3 };
  assert.equal(entryStance(queued, ana), "claim");
  assert.equal(entryStance(queued, bine), "outsider");

  // Prevzeto naročilo: nivo ne šteje več, šteje samo prevzemnik.
  assert.equal(entryStance({ assigneeId: "ana", level: 3 }, ana), "mine");
  assert.equal(entryStance({ assigneeId: "cene", level: 3 }, ana), "outsider");
  assert.equal(entryStance({ assigneeId: "cene", level: 1 }, bine), "outsider");

  // Sistemska vrsta ni vrsta nobenega nivoja — tam ni ne prevzema ne zunanjega vnosa.
  assert.equal(entryStance({ assigneeId: null, level: SYSTEM_LEVEL }, ana), "unsorted");
  assert.equal(entryStance({ assigneeId: null, level: SYSTEM_LEVEL }, bine), "unsorted");
});

test("a waiting deadline is a plain local day, presets counted from today", () => {
  // Pozno zvečer v naši coni je UTC že naslednji dan — rok mora ostati današnji.
  const evening = new Date(2026, 8, 21, 23, 30);
  assert.equal(isoDay(evening), "2026-09-21");

  assert.equal(waitDeadline(7, evening), "2026-09-28");
  assert.equal(waitDeadline(3, evening), "2026-09-24");
  // Čez mejo meseca in leta prešteje koledar, ne aritmetika dni v mesecu.
  assert.equal(waitDeadline(14, new Date(2026, 11, 28, 9, 0)), "2027-01-11");

  // Teden dni je predlog, ki ga je zahteval postopek — mora obstajati.
  assert.ok(WAIT_PRESETS.some((preset) => preset.id === "1w" && preset.days === 7));
});

test("return workflows require confirmation", () => {
  assert.deepEqual([...RETURN_TYPES].sort(), ["exchange", "quality", "refund"]);
  assert.equal(RETURN_TYPES.has("tracking"), false);
  // Neodpremljeno naročilo ni prišlo do stranke, zato tudi nazaj ne pride nič.
  assert.equal(RETURN_TYPES.has("unfulfilled"), false);
});

test("unfulfilled is a type of its own, ranked next to tracking", () => {
  assert.ok(ISSUE_TYPES.some((type) => type.id === "unfulfilled"));
  assert.equal(rankOf(TYPES, "unfulfilled"), rankOf(TYPES, "tracking") + 1);
  assert.ok(rankOf(TYPES, "unfulfilled") < rankOf(TYPES, "other"));
});

test("an unknown value sorts last — a deleted type must not jump to the front", () => {
  assert.equal(rankOf(TYPES, "no-such-type"), TYPES.length);
});

test("with items entered, the items decide whether a return is expected", () => {
  // Refund brez sporne postavke: vse ostane pri stranki, vračila ni.
  assert.equal(requiresReturnProof("refund", [{ resolution: "none" }]), false);
  // En sporen artikel med petimi zadošča.
  assert.equal(
    requiresReturnProof("other", [
      { resolution: "none" },
      { resolution: "refund" },
      { resolution: "none" },
    ]),
    true,
  );
  // Brez postavk obvelja vrsta težave — stara naročila delujejo naprej.
  assert.equal(requiresReturnProof("refund", []), true);
  assert.equal(requiresReturnProof("tracking", []), false);
});

test("only refunded items count towards the amount to pay back", () => {
  assert.equal(
    refundTotal([
      { resolution: "refund", amount: 129 },
      { resolution: "exchange", amount: 79 },
      { resolution: "none", amount: 25 },
    ]),
    129,
  );
  assert.equal(refundTotal([{ resolution: "none", amount: 25 }]), null);
});

test("item rows survive the round trip through the form", () => {
  const fd = new FormData();
  for (const [name, values] of [
    ["item.name", ["Testmoto Jacket", "", "Gloves"]],
    ["item.variant", ["XL", "", ""]],
    ["item.replacementVariant", ["", "", ""]],
    ["item.qty", ["2", "1", "abc"]],
    ["item.amount", ["129,50", "10", ""]],
    ["item.resolution", ["refund", "refund", "bogus"]],
  ] as const) {
    for (const value of values) fd.append(name, value);
  }

  const items = parseItems(fd);
  // Vrstica brez naziva je izbrisana vrstica in odpade.
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    name: "Testmoto Jacket",
    variant: "XL",
    replacementVariant: null,
    replacementName: null,
    priceDiffSettled: false,
    wrongItemSent: false,
    orderedName: null,
    orderedVariant: null,
    qty: 2,
    amount: 129.5,
    resolution: "refund",
    position: 0,
  });
  // Neveljavna količina pade na 1, neznana rešitev na vračilo.
  assert.equal(items[1].qty, 1);
  assert.equal(items[1].resolution, "refund");
  assert.equal(items[1].amount, null);

  assert.equal(
    summarizeItems(items, (r) => r),
    "Testmoto Jacket XL ×2 · refund, Gloves ×1 · refund",
  );
});

test("a wrong item sent keeps what was ordered next to what arrived", () => {
  const fd = new FormData();
  for (const [name, values] of [
    ["item.name", ["Pants", "Pants"]],
    ["item.variant", ["4XL", "XL"]],
    ["item.resolution", ["exchange", "exchange"]],
    ["item.wrongItemSent", ["1", "1"]],
    // Oznaka brez naročenega kosa ne pove ničesar in odpade.
    ["item.orderedName", ["Pants", ""]],
    ["item.orderedVariant", ["XL", ""]],
  ] as const) {
    for (const value of values) fd.append(name, value);
  }
  const [wrong, plain] = parseItems(fd);
  assert.deepEqual(
    [wrong.wrongItemSent, wrong.orderedName, wrong.orderedVariant, wrong.variant],
    [true, "Pants", "XL", "4XL"],
  );
  assert.deepEqual([plain.wrongItemSent, plain.orderedName, plain.orderedVariant], [false, null, null]);
});

test("an unchosen resolution stays unchosen and blocks moving the ticket on", () => {
  const fd = new FormData();
  fd.append("item.name", "Testmoto Jacket");
  fd.append("item.resolution", PENDING_RESOLUTION);
  const items = parseItems(fd);
  assert.equal(items[0].resolution, PENDING_RESOLUTION);
  assert.equal(hasPendingResolution(items), true);
  assert.equal(hasPendingResolution([{ resolution: "none" }, { resolution: "exchange" }]), false);
});

test("\"not known yet\" survives the form and blocks the ticket like an unchosen resolution", () => {
  const fd = new FormData();
  fd.append("item.name", "Testmoto Jacket");
  fd.append("item.resolution", "undecided");
  const items = parseItems(fd);
  assert.equal(items[0].resolution, "undecided");
  assert.equal(hasPendingResolution(items), true);
  assert.equal(unresolvedMessage(items), "error.resolutionUndecided");
  assert.equal(unresolvedMessage([{ resolution: PENDING_RESOLUTION }, { resolution: "undecided" }]), "error.resolutionPending");
});

test("catalog keeps Shopify option categories separate", () => {
  const title = "Testmoto TrailShield™ Motorcycle Pants";
  assert.deepEqual(optionsOf(title).map((option) => option.key), ["color", "size", "gender"]);

  const combined = "Schwarz / L / EU 48 / W32 / Damen";
  const selection = selectionOf(title, combined);
  assert.deepEqual(selection, {
    color: "Schwarz",
    size: "L / EU 48 / W32",
    gender: "Damen",
  });
  assert.equal(variantTitleOf(title, selection), combined);
});

test("catalog image follows the selected color", () => {
  const title = "Testmoto TrailShield™ Motorcycle Pants";
  const black = imageOf(title, 96, { color: "Schwarz" });
  const green = imageOf(title, 96, { color: "Grün" });
  const camouflage = imageOf(title, 96, { color: "Camouflage" });

  assert.ok(black?.includes("14.png"));
  assert.ok(green?.includes("8_f186d70e"));
  assert.ok(camouflage?.includes("3_8d6dc79b"));
  assert.notEqual(black, green);
  assert.notEqual(green, camouflage);
});

test("line totals follow what the customer paid, not the list price", () => {
  // Naročilo 1953: hlače s 129,00 znižane na 99,50 prek alokacije.
  assert.equal(lineTotalAfterDiscounts("129.00", ["29.50"]), "99.50");
  // Darilo: cena je bila 0 že v naročilu, alokacije ni.
  assert.equal(lineTotalAfterDiscounts("0.00", []), "0.00");
  // Več popustov na isti vrstici se sešteje.
  assert.equal(lineTotalAfterDiscounts("100.00", ["10.00", "5.50"]), "84.50");
  // Popust nikoli ne potisne vrstice pod nič.
  assert.equal(lineTotalAfterDiscounts("20.00", ["25.00"]), "0.00");
  // Drobci pri plavajoči vejici se ne smejo prikazati.
  assert.equal(lineTotalAfterDiscounts("129.00", ["29.51"]), "99.49");
  // Brez podatka raje nič kot izmišljena številka.
  assert.equal(lineTotalAfterDiscounts(null, []), null);
  assert.equal(lineTotalAfterDiscounts("nekaj", []), null);
});

test("an order keeps the currency it was paid in", () => {
  assert.equal(normalizeCurrency("chf"), "CHF");
  assert.equal(normalizeCurrency(" EUR "), "EUR");
  // Karkoli, kar ni koda treh črk, ne sme obveljati za valuto.
  assert.equal(normalizeCurrency("€"), null);
  assert.equal(normalizeCurrency("EURO"), null);
  assert.equal(normalizeCurrency(""), null);
  assert.equal(normalizeCurrency(null), null);
});

test("carrier statuses map to what the desk should do next", () => {
  assert.equal(parcelOutcome("Delivered").state, "arrived");
  assert.equal(parcelOutcome("InTransit").state, "transit");
  assert.equal(parcelOutcome("OutForDelivery").state, "transit");
  // Neznana številka še ni napaka — o njej odloči čas, ne prvi odgovor.
  assert.equal(parcelOutcome("NotFound").state, "pending");
  // Paket na prevzemnem mestu bo vrnjen pošiljatelju, če ponj nihče ne gre.
  assert.deepEqual(parcelOutcome("AvailableForPickup"), { state: "manual", reason: "pickup" });
  assert.deepEqual(parcelOutcome("Exception"), { state: "manual", reason: "exception" });
  // Statusa, ki ga ne poznamo, ne smemo brati kot "vse v redu".
  assert.deepEqual(parcelOutcome("SomethingNew"), { state: "manual", reason: "unknown" });
});

test("only a parcel in transit puts an order on hold", () => {
  assert.equal(parcelHolds("transit"), true);
  assert.equal(parcelHolds("pending"), false);
  assert.equal(parcelHolds("arrived"), false);
  assert.equal(parcelHolds("manual"), false);
  assert.equal(parcelHolds("untracked"), false);
});

test("parcel changes move orders into the right work group", () => {
  assert.equal(
    issueStatusForParcel({ issueStatus: "open", direction: "return", parcelState: "transit", otherReturnHolds: false }),
    "waiting",
  );
  assert.equal(
    issueStatusForParcel({ issueStatus: "waiting", direction: "return", parcelState: "manual", otherReturnHolds: false }),
    "manual",
  );
  assert.equal(
    issueStatusForParcel({ issueStatus: "open", direction: "replacement", parcelState: "manual", otherReturnHolds: false }),
    "manual",
  );
  // Manual assistance ostane vidna, dokler jo človek ne nadaljuje.
  assert.equal(
    issueStatusForParcel({ issueStatus: "manual", direction: "return", parcelState: "transit", otherReturnHolds: false }),
    null,
  );
  assert.equal(
    issueStatusForParcel({ issueStatus: "closed", direction: "return", parcelState: "manual", otherReturnHolds: false }),
    null,
  );
});

test("time guards stop an order from sleeping forever", () => {
  const now = new Date("2026-08-12T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const base = { registeredAt: hoursAgo(1), lastEventAt: null, createdAt: hoursAgo(1) };

  // Sveža številka sme biti nekaj časa neznana.
  assert.equal(parcelTimeGuard({ ...base, state: "pending" }, now), null);

  // Tudi brez prvega carrier zapisa velja isti 48-urni prag.
  assert.equal(
    parcelTimeGuard({ ...base, state: "pending", registeredAt: hoursAgo(47), createdAt: hoursAgo(47) }, now),
    null,
  );
  const old = { ...base, registeredAt: hoursAgo(48), createdAt: hoursAgo(48) };
  assert.deepEqual(parcelTimeGuard({ ...old, state: "pending" }, now), {
    state: "manual",
    reason: "not_found",
  });

  // Paket brez novega dogodka 48 ur ne sme držati naročila na čakanju.
  const stuck = {
    state: "transit",
    registeredAt: hoursAgo(72),
    lastEventAt: hoursAgo(STALE_HOURS),
    createdAt: hoursAgo(72),
  };
  assert.deepEqual(parcelTimeGuard(stuck, now), { state: "manual", reason: "stale" });
  assert.equal(parcelTimeGuard({ ...stuck, lastEventAt: hoursAgo(STALE_HOURS - 1) }, now), null);

  // Kar je enkrat prispelo ali že čaka človeka, varovala ne premikajo.
  assert.equal(parcelTimeGuard({ ...old, state: "arrived" }, now), null);
  assert.equal(parcelTimeGuard({ ...old, state: "manual" }, now), null);
});

test("tracking numbers are validated before they reach the provider", () => {
  assert.equal(normalizeNumber(" cp092195155it "), "CP092195155IT");
  assert.equal(normalizeNumber("00340434392031371717"), "00340434392031371717");
  // Prevozniki jih v mailih pišejo s presledki.
  assert.equal(normalizeNumber("CP 092 195 155 IT"), "CP092195155IT");
  assert.equal(normalizeNumber("short"), null);
  // Brez te varovalke bi kos besedila iz maila obveljal za številko.
  assert.equal(normalizeNumber("has spaces inside"), null);
  assert.equal(normalizeNumber("drop';--table"), null);
});

test("new and invalid locales safely default to English", () => {
  assert.equal(asLocale("sl"), "sl");
  assert.equal(asLocale("en"), "en");
  assert.equal(asLocale("de"), "en");
});

test("both dictionaries interpolate business messages", () => {
  assert.equal(translate("en", "error.closeLevel", { level: 2 }).includes("level 2"), true);
  assert.equal(translate("sl", "error.closeLevel", { level: 2 }).includes("2. nivo"), true);
});

test("password rules stay shared with server validation", () => {
  assert.equal(failedRules("Weak").length > 0, true);
  assert.equal(failedRules("Strong-2026").length, 0);
});

test("order numbers have one canonical duplicate key", () => {
  assert.equal(orderNumberKey(" #1234 "), "1234");
  assert.equal(orderNumberKey("ab 12"), "AB12");
  assert.equal(orderNumberKey("ＡＢ-12"), "AB-12");
});

test("only a number offers to open a ticket from search", () => {
  assert.equal(looksLikeOrderNumber("2957"), true);
  assert.equal(looksLikeOrderNumber(" #2957 "), true);
  assert.equal(looksLikeOrderNumber("2 957"), true);

  // Iskanje zajame tudi imena, naslove in tracking — tam ponudbe ni.
  assert.equal(looksLikeOrderNumber("kessare"), false);
  assert.equal(looksLikeOrderNumber("ana@primer.si"), false);
  assert.equal(looksLikeOrderNumber("CP108408323IT"), false);
  assert.equal(looksLikeOrderNumber("BRV-20"), false);
  assert.equal(looksLikeOrderNumber(""), false);
  // Ena ali dve številki sta prej tipkarska napaka kot naročilo.
  assert.equal(looksLikeOrderNumber("29"), false);
});

test("successful Shopify payments expose method, card brand, and last four digits", () => {
  const payment = paymentInfoFromTransactions([
    {
      status: "SUCCESS",
      kind: "SALE",
      formattedGateway: "Shopify Payments",
      gateway: "shopify_payments",
      accountNumber: "•••• 9764",
      paymentDetails: { paymentMethodName: "Shop Pay", company: "Mastercard", number: "•••• 9764" },
    },
  ]);
  assert.deepEqual(payment, { method: "Shop Pay", brand: "mastercard", last4: "9764" });
});

test("Klarna is detected while failed and refund transactions are ignored", () => {
  const payment = paymentInfoFromTransactions([
    {
      status: "SUCCESS",
      kind: "REFUND",
      formattedGateway: "Shopify Payments",
      gateway: "shopify_payments",
      accountNumber: null,
      paymentDetails: { paymentMethodName: "Visa", company: "Visa", number: "•••• 1111" },
    },
    {
      status: "SUCCESS",
      kind: "SALE",
      formattedGateway: "Klarna",
      gateway: "klarna_payments",
      accountNumber: null,
      paymentDetails: { paymentMethodName: "Klarna" },
    },
  ]);
  assert.deepEqual(payment, { method: "Klarna", brand: "klarna", last4: null });
  assert.equal(priorityForPayment("medium", payment.brand), "high");
  assert.equal(priorityForPayment("urgent", payment.brand), "urgent");
});

test("only a high-confidence match may be dispatched", () => {
  assert.equal(canDispatchMatch("high"), true);
  assert.equal(canDispatchMatch("medium"), false);
  assert.equal(canDispatchMatch("low"), false);
});

test("an unknown confidence reads as the lowest, never as high", () => {
  assert.equal(asMatchQuality("nonsense"), "low");
  assert.equal(asMatchQuality(null), "low");
  assert.equal(asMatchQuality(undefined), "low");
  assert.equal(asMatchQuality("high"), "high");
  assert.equal(canDispatchMatch(null), false);
});

test("the email threshold is itself a priority: high means urgent and high", () => {
  assert.equal(meetsThreshold(PRIOS, "urgent", "high"), true);
  assert.equal(meetsThreshold(PRIOS, "high", "high"), true);
  assert.equal(meetsThreshold(PRIOS, "medium", "high"), false);
  assert.equal(meetsThreshold(PRIOS, "low", "high"), false);
});

test("the lowest threshold lets everything through, and so does an unknown one", () => {
  for (const priority of ["urgent", "high", "medium", "low"]) {
    assert.equal(meetsThreshold(PRIOS, priority, "low"), true);
    assert.equal(meetsThreshold(PRIOS, priority, "nonsense"), true);
    assert.equal(meetsThreshold(PRIOS, priority, null), true);
  }
  assert.equal(meetsThreshold(PRIOS, "high", "urgent"), false);
  assert.equal(meetsThreshold(PRIOS, "urgent", "urgent"), true);
});

