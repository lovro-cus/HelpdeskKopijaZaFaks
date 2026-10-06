import assert from "node:assert/strict";
import test from "node:test";

import { customerEmailDraft, customerLanguage, customerLanguageForReply, languageName } from "../src/lib/customer-email";
import {
  assignCountries,
  readTemplates,
  readWords,
  setLanguages,
  unknownOptionWords,
  type LanguageInfo,
} from "../src/lib/language-registry";
import { BUILTIN_LANGUAGES, ENGLISH_TEMPLATES } from "../src/lib/language-seed";

test("država pripada enemu jeziku: ko jo dobi nizozemščina, jo francoščina izgubi", () => {
  const next = assignCountries(
    [{ code: "fr", countries: ["FR", "BE", "LU"] }, { code: "nl", countries: [] }],
    "nl",
    ["nl", " be ", "XYZ"],
  );
  assert.deepEqual(next, [{ code: "fr", countries: ["FR", "LU"] }, { code: "nl", countries: ["NL", "BE"] }]);
});

test("nepopolna besedila dobijo manjkajoče iz angleščine, naslov skladišča ostane lastnost vrste", () => {
  const templates = readTemplates({ greeting: "Hallo {name},", kinds: { returnInstructions: { subject: "Uw bestelling {order}", lead: "stuur de artikelen naar:" } } }, ENGLISH_TEMPLATES);
  assert.equal(templates.greeting, "Hallo {name},");
  assert.equal(templates.signOff, ENGLISH_TEMPLATES.signOff);
  assert.equal(templates.kinds.returnInstructions.address, true);
  assert.deepEqual(templates.kinds.whichSize, ENGLISH_TEMPLATES.kinds.whichSize);
});

test("besede sprejmejo samo znane pomene", () => {
  assert.deepEqual(readWords({ color: { zwart: "black", paars: "purple" }, gender: { heren: "men", kind: "child" } }), {
    color: { zwart: "black" },
    gender: { heren: "men" },
  });
});

test("neznane besede iz izdelkov jezika — kar razume katerikoli jezik, ni neznano", () => {
  const products = [
    { language: "nl", options: [{ key: "color", values: ["Zwart", "Paars/Zwart"] }, { key: "gender", values: ["Heren", "Dames"] }, { key: "size", values: ["M"] }] },
    { language: "de", options: [{ key: "color", values: ["Lila"] }] },
  ];
  assert.deepEqual(unknownOptionWords(products, "nl", { color: { zwart: "black" }, gender: { heren: "men" } }), {
    color: ["Paars"],
    gender: ["Dames"],
  });
});

test("nov jezik iz šifranta: država, prepoznava maila in pismo", () => {
  const dutch: LanguageInfo = {
    code: "nl",
    name: "Nederlands",
    englishName: "Dutch",
    countries: ["NL"],
    markers: ["bestelling", "retour", "maat", "bedankt"],
    words: { color: {}, gender: {} },
    active: true,
    builtin: false,
    templates: readTemplates({ greeting: "Beste {name},", greetingAnonymous: "Beste klant,", signOff: "Met vriendelijke groet", kinds: { custom: { subject: "Uw bestelling {order}", lead: "" } } }, ENGLISH_TEMPLATES),
  };
  setLanguages([...BUILTIN_LANGUAGES, dutch]);
  try {
    assert.equal(customerLanguage("NL"), "nl");
    assert.equal(languageName("nl"), "Dutch");
    assert.equal(customerLanguageForReply([{ direction: "incoming", body: "Bedankt, ik wil mijn bestelling retour sturen, de maat klopt niet." }], "DE"), "nl");
    const { subject, body } = customerEmailDraft({ kind: "custom", language: "nl", customerName: "Sanne de Vries", orderNumber: "3301", lines: [] });
    assert.equal(subject, "Uw bestelling #3301");
    assert.match(body, /^Beste Sanne,/);
    assert.match(body, /Met vriendelijke groet\nAna\nKroj$/);
  } finally {
    setLanguages(BUILTIN_LANGUAGES);
  }
});
