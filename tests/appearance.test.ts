import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_APPEARANCE,
  appearanceAttributes,
  mergeAppearance,
  parseAppearance,
  resolveDark,
  serializeAppearance,
} from "../src/lib/appearance";

test("stored appearance falls back to defaults for anything broken or unknown", () => {
  assert.deepEqual(parseAppearance("{}"), DEFAULT_APPEARANCE);
  assert.deepEqual(parseAppearance("not json"), DEFAULT_APPEARANCE);
  assert.deepEqual(parseAppearance(null), DEFAULT_APPEARANCE);
  assert.deepEqual(
    parseAppearance('{"scheme":"blueprint","textSize":125,"font":"comic","grid":"no","mode":"dark"}'),
    { ...DEFAULT_APPEARANCE, scheme: "blueprint", textSize: 125, mode: "dark" },
  );
  assert.equal(parseAppearance({ textSize: 117 }).textSize, 100);
});

test("a patch changes only valid fields and can clear the theme choice", () => {
  const current = { ...DEFAULT_APPEARANCE, scheme: "pencil" as const, mode: "dark" as const };
  assert.deepEqual(mergeAppearance(current, { textSize: 140, scheme: "neon" }), { ...current, textSize: 140 });
  assert.equal(mergeAppearance(current, { mode: null }).mode, null);
  assert.equal(mergeAppearance(current, { mode: "sepia" }).mode, "dark");
});

test("only non-default values are stored and put on the page", () => {
  assert.equal(serializeAppearance(DEFAULT_APPEARANCE), "{}");
  const custom = { ...DEFAULT_APPEARANCE, scheme: "contrast" as const, grid: false, reduceMotion: true };
  assert.deepEqual(JSON.parse(serializeAppearance(custom)), { scheme: "contrast", grid: false, reduceMotion: true });
  assert.deepEqual(parseAppearance(serializeAppearance(custom)), custom);

  assert.deepEqual(appearanceAttributes(DEFAULT_APPEARANCE), {
    "data-scheme": "worksheet", "data-mode": undefined, "data-text-size": undefined,
    "data-font": undefined, "data-grid": undefined, "data-motion": undefined,
  });
  assert.deepEqual(appearanceAttributes({ ...custom, textSize: 110, font: "hyperlegible", mode: "light" }), {
    "data-scheme": "contrast", "data-mode": "light", "data-text-size": "110",
    "data-font": "hyperlegible", "data-grid": "off", "data-motion": "reduced",
  });
});

test("the profile choice wins over the old browser choice, which wins over the system", () => {
  assert.equal(resolveDark("light", "dark", true), false);
  assert.equal(resolveDark("system", "light", true), true);
  assert.equal(resolveDark(null, "dark", false), true);
  assert.equal(resolveDark(undefined, null, true), true);
  assert.equal(resolveDark(null, "garbage", false), false);
});
