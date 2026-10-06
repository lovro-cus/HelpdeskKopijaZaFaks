import assert from "node:assert/strict";
import test from "node:test";

import { NEW_GROUP, shortLabel, suggestGroups, type SuggestProduct } from "../src/lib/catalog-suggest";

const cdn = (file: string) => `https://cdn.shopify.com/s/files/1/0969/files/${file}?v=17`;

const product = (id: string, images: string[], extra: Partial<SuggestProduct> = {}): SuggestProduct => ({
  id,
  title: id,
  image: images[0] ? cdn(images[0]) : null,
  variants: images.map((file) => ({ image: cdn(file) })),
  groupId: null,
  dismissed: [],
  missing: false,
  status: "active",
  ...extra,
});

test("izdelek s sliko obstoječe skupine je predlagan zanjo", () => {
  const suggestions = suggestGroups([
    product("de", ["black.png", "green.png"], { groupId: "pants" }),
    product("fr", ["black.png", "green.png"]),
    product("nl", ["green.png"]),
    product("cushion", ["cushion.png"]),
  ]);
  assert.deepEqual(suggestions, [{ kind: "join", groupId: "pants", productIds: ["fr", "nl"] }]);
});

test("slika, ki jo nosita dve skupini, ne pove ničesar", () => {
  const suggestions = suggestGroups([
    product("pants", ["size-chart.png", "pants.png"], { groupId: "pants" }),
    product("jacket", ["size-chart.png", "jacket.png"], { groupId: "jacket" }),
    product("new", ["size-chart.png"]),
  ]);
  assert.deepEqual(suggestions, []);
});

test("zavrnjen predlog se ne vrne", () => {
  const suggestions = suggestGroups([
    product("de", ["black.png"], { groupId: "pants" }),
    product("fr", ["black.png"], { dismissed: ["pants"] }),
  ]);
  assert.deepEqual(suggestions, []);
});

test("nepovezani izdelki z isto sliko so predlog za novo skupino", () => {
  const suggestions = suggestGroups([
    product("a", ["cushion.png"], { title: "Testmoto Motorrad-Sitzkissen für lange Fahrten" }),
    product("b", ["cushion.png", "side.png"], { title: "Testmoto™ Seat Cushion" }),
    product("c", ["other.png"]),
  ]);
  assert.deepEqual(suggestions, [{ kind: "new", productIds: ["a", "b"], label: "Seat Cushion" }]);
});

test("izdelek, ki ga v Shopifyju ni več, ne dobi predloga", () => {
  const suggestions = suggestGroups([
    product("de", ["black.png"], { groupId: "pants" }),
    product("old", ["black.png"], { missing: true }),
    product("x", ["solo.png"], { dismissed: [NEW_GROUP] }),
    product("y", ["solo.png"], { dismissed: [NEW_GROUP] }),
  ]);
  assert.deepEqual(suggestions, []);
});

test("kratko ime skupine je brez znamke in oznak", () => {
  assert.equal(shortLabel(["Testmoto™ AirFlow Breathable Motorcycle Jacket (Black)", "Testmoto™ AirFlow Jacket"]), "AirFlow Jacket");
});
