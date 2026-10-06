import assert from "node:assert/strict";
import test from "node:test";

import { channelFor, notifyMatrix, readNotifyMatrix } from "../src/lib/notify-prefs";

test("brez shranjene tabele veljajo dosedanja stikala", () => {
  const on = notifyMatrix({ notifyKinds: null, notifyEmail: true, notifyOutsider: true });
  assert.equal(on.handoff, "mail");
  assert.equal(on.outsider, "mail");
  assert.equal(on.reply, "bell");
  const noOutsider = notifyMatrix({ notifyKinds: null, notifyEmail: true, notifyOutsider: false });
  assert.equal(noOutsider.outsider, "bell");
  assert.equal(noOutsider.handoff, "mail");
  const noMail = notifyMatrix({ notifyKinds: null, notifyEmail: false, notifyOutsider: true });
  assert.equal(noMail.handoff, "bell");
});

test("shranjena tabela velja; pokvarjena vrednost pade na privzeto", () => {
  const matrix = notifyMatrix({ notifyKinds: JSON.stringify({ outsider: "off", reply: "mail", parcel: "loud" }), notifyEmail: true, notifyOutsider: true });
  assert.equal(matrix.outsider, "off");
  assert.equal(matrix.reply, "mail");
  assert.equal(matrix.parcel, "mail");
  assert.equal(channelFor(matrix, "unknown"), "bell");
});

test("obrazec prepiše samo znane vrednosti", () => {
  const current = notifyMatrix({ notifyKinds: null, notifyEmail: true, notifyOutsider: true });
  const fields: Record<string, string> = { "notify.handoff": "off", "notify.reply": "nonsense" };
  const next = readNotifyMatrix((name) => fields[name], current);
  assert.equal(next.handoff, "off");
  assert.equal(next.reply, "bell");
});
