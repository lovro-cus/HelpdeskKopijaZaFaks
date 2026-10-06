import assert from "node:assert/strict";
import test from "node:test";

import { detectLanguage, imageKey, optionKey, parseCsv, productFromShopify, productsFromCsv } from "../src/lib/catalog-import";

test("imena opcij vseh trgov dajo iste ključe", () => {
  assert.deepEqual(["Kleur", "Maat", "Geslacht"].map(optionKey), ["color", "size", "gender"]);
  assert.deepEqual(["Color", "Talla", "Género"].map(optionKey), ["color", "size", "gender"]);
  assert.deepEqual(["Couleur", "Taille", "Genre"].map(optionKey), ["color", "size", "gender"]);
  assert.equal(optionKey("Material", 2), "option3");
});

test("jezik izdelka se prepozna po opcijah, brez njih po nazivu", () => {
  assert.equal(detectLanguage(["Color", "Talla", "Género"], "Testmoto EscudoVial™ Pantalones de Moto"), "es");
  assert.equal(detectLanguage(["Colore", "Größe", "Genere"], "Testmoto ScudoStrada™ Pantaloni da Moto"), "it");
  assert.equal(detectLanguage(["Farbe", "Größe", "Geschlecht"], "Testmoto TrailShield™ Motorcycle Pants"), "de");
  assert.equal(detectLanguage(["Size", "Color"], "Testmoto™ GripLite Red Gloves"), "en");
  assert.equal(detectLanguage([], "Testmoto Motorrad-Sitzkissen für lange Fahrten"), "de");
  assert.equal(detectLanguage([], "Testmoto™ Gürtel"), "de");
  assert.equal(detectLanguage([], "Testmoto Mystery Box"), null);
});

test("slika se primerja po imenu datoteke, ne po verziji", () => {
  assert.equal(imageKey("https://cdn.shopify.com/s/files/1/0969/files/14.png?v=1778172249"), "14.png");
  assert.equal(imageKey(null), null);
});

test("izdelek iz Shopify API-ja ima enako obliko kot iz izvoza", () => {
  const product = productFromShopify({
    id: "gid://shopify/Product/1",
    handle: "testmoto-ritschild-motorbroek",
    title: "Testmoto RitSchild™ Motorbroek",
    status: "ACTIVE",
    featuredMedia: { preview: { image: { url: "https://cdn/main.png" } } },
    options: [{ name: "Kleur", position: 1 }, { name: "Maat", position: 2 }, { name: "Geslacht", position: 3 }],
    variants: {
      nodes: [{
        title: "Zwart / M / EU 46 / W30 / Heren",
        price: "129.00",
        selectedOptions: [{ name: "Maat", value: "M / EU 46 / W30" }, { name: "Kleur", value: "Zwart" }, { name: "Geslacht", value: "Heren" }],
        media: { nodes: [{ preview: { image: { url: "https://cdn/14.png?v=2" } } }] },
      }],
    },
  });
  assert.equal(product.language, "nl");
  assert.equal(product.status, "active");
  assert.equal(product.price, 129);
  assert.deepEqual(product.options.map((option) => option.key), ["color", "size", "gender"]);
  assert.deepEqual(product.variants[0], {
    title: "Zwart / M / EU 46 / W30 / Heren",
    selection: { color: "Zwart", size: "M / EU 46 / W30", gender: "Heren" },
    image: "https://cdn/14.png?v=2",
    price: 129,
  });
});

test("CSV izvoz: variante podedujejo naziv prve vrstice, izdelek brez opcij nima variant", () => {
  const csv = [
    "Handle,Title,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Option3 Name,Option3 Value,Variant Price,Image Src,Image Position,Variant Image,Status",
    "belt,Testmoto™ Gürtel,Title,Default Title,,,,,25.00,https://cdn/belt.png,1,,active",
    "pants,Testmoto Pantalon,Couleur,Noir,Taille,M,Genre,Homme,129.00,https://cdn/p.png,1,https://cdn/noir.png,active",
    "pants,,,Vert,,M,,Femme,129.00,,,https://cdn/vert.png,",
  ].join("\n");
  const [belt, pants] = productsFromCsv(parseCsv(csv)).sort((a, b) => a.handle.localeCompare(b.handle));
  assert.equal(belt!.variants.length, 0);
  assert.equal(belt!.language, "de");
  assert.equal(pants!.language, "fr");
  assert.deepEqual(pants!.variants.map((variant) => variant.title), ["Noir / M / Homme", "Vert / M / Femme"]);
});
