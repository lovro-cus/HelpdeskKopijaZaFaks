import assert from "node:assert/strict";
import test from "node:test";

import { replyCue, replyCueIds } from "../src/lib/reply-cue";

const at = (minute: number) => new Date(2026, 8, 16, 10, minute);

test("the cue shows while nobody has touched a ticket the customer's reply woke up", () => {
  assert.equal(replyCue("open", at(5), null), true);
  assert.equal(replyCue("open", at(5), at(1)), true);
  assert.equal(replyCue("open", at(5), at(9)), false);
  assert.equal(replyCue("open", null, null), false);
  // Spet čaka ali je zaprt: ni več v delu, klicaj nima kaj povedati.
  assert.equal(replyCue("waiting", at(5), null), false);
  assert.equal(replyCue("closed", at(5), null), false);
});

test("cue ids come from the latest reply and the latest human event per ticket", () => {
  const ids = replyCueIds(
    [{ id: 1, status: "open" }, { id: 2, status: "open" }, { id: 3, status: "open" }],
    [{ issueId: 1, _max: { createdAt: at(5) } }, { issueId: 2, _max: { createdAt: at(5) } }],
    [{ issueId: 2, _max: { createdAt: at(7) } }, { issueId: 3, _max: { createdAt: at(7) } }],
  );
  assert.deepEqual([...ids], [1]);
});
