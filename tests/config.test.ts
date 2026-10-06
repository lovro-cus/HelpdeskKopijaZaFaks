import assert from "node:assert/strict";
import test from "node:test";

import { parseSetting, SETTING_DEFS, storageConfig, DEFAULT_SETTINGS } from "../src/lib/config/defaults";
import {
  colorValue,
  isCategoryColor,
  labelOf,
  meetsThreshold,
  normalizeCategoryKey,
  rankOf,
  visible,
  type Category,
} from "../src/lib/config/shared";
import { accruedCost, ageTier, dailyCost, freeDaysLeft } from "../src/lib/storage-cost";

const cat = (key: string, extra: Partial<Category> = {}): Category => ({
  key,
  label: key,
  color: "var(--ink-2)",
  position: 0,
  hidden: false,
  requiresReturn: false,
  watchFulfillment: false,
  builtin: false,
  ...extra,
});

test("a key is derived from the name, with our letters folded down", () => {
  assert.equal(normalizeCategoryKey("Garancija"), "garancija");
  assert.equal(normalizeCategoryKey("  Čakanje na Šefa "), "cakanje-na-sefa");
  assert.equal(normalizeCategoryKey("Refund / exchange"), "refund-exchange");
  // Ključ ne sme biti prazen ali sama ločila — tak bi trčil sam vase.
  assert.equal(normalizeCategoryKey("!!"), null);
  assert.equal(normalizeCategoryKey("a"), null);
});

test("hidden entries drop out of pickers but keep their label", () => {
  const types = [cat("refund"), cat("garancija", { hidden: true, label: "Garancija" })];
  assert.deepEqual(visible(types).map((type) => type.key), ["refund"]);
  // Star ticket s skrito vrsto se mora še vedno pravilno izpisati.
  assert.equal(labelOf(types, "garancija"), "Garancija");
});

test("a value that is no longer in the catalogue falls back to its key, not to blank", () => {
  assert.equal(labelOf([cat("refund")], "izbrisano"), "izbrisano");
  assert.equal(rankOf([cat("refund")], "izbrisano"), 1);
});

test("the email threshold follows the catalogue order, whatever the admin renamed", () => {
  const priorities = [cat("kriticno"), cat("urgent"), cat("normalno")];
  assert.equal(meetsThreshold(priorities, "kriticno", "urgent"), true);
  assert.equal(meetsThreshold(priorities, "urgent", "urgent"), true);
  assert.equal(meetsThreshold(priorities, "normalno", "urgent"), false);
  // Neznan prag pomeni najnižjega: bolje preveč pošte kot zamolčana predaja.
  assert.equal(meetsThreshold(priorities, "normalno", "nesmisel"), true);
  assert.equal(meetsThreshold(priorities, "normalno", null), true);
});

test("colours are limited to the tokens from DESIGN.md", () => {
  assert.equal(isCategoryColor("stamp"), true);
  assert.equal(isCategoryColor("#ff0000"), false);
  assert.equal(colorValue("petrol", "var(--ink-2)"), "var(--petrol)");
  assert.equal(colorValue("hotpink", "var(--ink-2)"), "var(--ink-2)");
});

test("a setting outside its range is refused, not silently clamped", () => {
  assert.equal(parseSetting("storageFreeDays", "20"), 20);
  assert.equal(parseSetting("storageFreeDays", "-1"), null);
  assert.equal(parseSetting("storageFreeDays", "3.5"), null);
  assert.equal(parseSetting("parcelPollHours", String(SETTING_DEFS.parcelPollHours.max + 1)), null);
  assert.equal(parseSetting("storageRate", "0.85"), 0.85);
  // Slovenska vejica je tisto, kar človek dejansko natipka.
  assert.equal(parseSetting("storageRate", "0,75"), 0.75);
  assert.equal(parseSetting("storageRate", ""), null);
});

test("the storage sums follow the admin's numbers, not the built-in ones", () => {
  const config = storageConfig({ ...DEFAULT_SETTINGS, storageFreeDays: 7, storageWarnDays: 5, storageRate: 1 });
  assert.equal(accruedCost(10, config), 3);
  assert.equal(dailyCost(7, config), 0);
  assert.equal(dailyCost(8, config), 1);
  assert.equal(freeDaysLeft(3, config), 5);
  assert.equal(ageTier(4, config), "free");
  assert.equal(ageTier(5, config), "warning");
  assert.equal(ageTier(8, config), "danger");
});

test("without a config the built-in numbers still apply", () => {
  assert.equal(accruedCost(15), 0.6);
  assert.equal(ageTier(9), "free");
});
