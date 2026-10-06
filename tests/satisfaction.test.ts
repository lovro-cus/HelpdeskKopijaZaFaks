import assert from "node:assert/strict";
import test from "node:test";

import { needsReview, parseSatisfaction, REVIEW_BELOW, scoreTone } from "../src/lib/satisfaction";

test("v pregled gre ocena pod 5, ne 5 sama", () => {
  assert.equal(REVIEW_BELOW, 5);
  assert.equal(needsReview(4), true);
  assert.equal(needsReview(1), true);
  // »Manj kot 5«: petica je meja, ki še ne sproži pregleda.
  assert.equal(needsReview(5), false);
  assert.equal(needsReview(9), false);
  // Brez ocene (stranka ni pisala) ni česa pregledovati.
  assert.equal(needsReview(null), false);
  assert.equal(needsReview(undefined), false);
});

test("odgovor modela se bere strogo", () => {
  assert.deepEqual(parseSatisfaction('{"score": 3, "reason": "Customer threatens a chargeback."}'), {
    score: 3,
    reason: "Customer threatens a chargeback.",
  });
  // Ograjen JSON in število kot niz sta še vedno berljiva.
  assert.deepEqual(parseSatisfaction('```json\n{"score": "8", "reason": "Thanked us."}\n```'), { score: 8, reason: "Thanked us." });
  // Stranka ni pisala: ocene ni, razlog ni obvezen.
  assert.deepEqual(parseSatisfaction('{"score": null, "reason": ""}'), { score: null, reason: "" });

  // Izmišljena ali pokvarjena številka ni ocena — ticket bi po krivem šel v pregled ali iz njega.
  assert.equal(parseSatisfaction('{"score": 0, "reason": "x"}'), null);
  assert.equal(parseSatisfaction('{"score": 11, "reason": "x"}'), null);
  assert.equal(parseSatisfaction('{"score": 6.5, "reason": "x"}'), null);
  assert.equal(parseSatisfaction('{"score": "high", "reason": "x"}'), null);
  // Ocena brez razloga je neuporabna za pregled.
  assert.equal(parseSatisfaction('{"score": 2, "reason": "  "}'), null);
  assert.equal(parseSatisfaction("not json"), null);
});

test("barva ocene sledi meji pregleda", () => {
  assert.equal(scoreTone(4), "low");
  assert.equal(scoreTone(5), "mid");
  assert.equal(scoreTone(7), "mid");
  assert.equal(scoreTone(8), "high");
  assert.equal(scoreTone(null), "none");
});

test("nastavljen prag za pregled", () => {
  assert.equal(needsReview(6, 7), true);
  assert.equal(needsReview(7, 7), false);
  assert.equal(needsReview(4, 3), false);
  assert.equal(scoreTone(6, 7), "low");
  assert.equal(scoreTone(4, 3), "mid");
});
