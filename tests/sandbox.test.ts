import assert from "node:assert/strict";
import test from "node:test";

import { installSandboxNetworkGuard, pseudonymizer, sandboxAllowsUrl } from "../src/lib/sandbox";

test("the sandbox may only talk to this computer", () => {
  assert.equal(sandboxAllowsUrl("http://localhost:3100/api/inbox"), true);
  assert.equal(sandboxAllowsUrl("http://127.0.0.1:3100"), true);
  assert.equal(sandboxAllowsUrl("/api/files/1"), true);
  assert.equal(sandboxAllowsUrl("https://shop.example.com/api/orders"), false);
  assert.equal(sandboxAllowsUrl("https://mail.example.com/v1/messages"), false);
  assert.equal(sandboxAllowsUrl(new URL("https://warehouse.example.com/v1/account")), false);
  // Podtaknjen "localhost" v poddomeni ni ta računalnik.
  assert.equal(sandboxAllowsUrl("https://localhost.evil.example"), false);
});

test("the guard rejects outbound fetch like a network failure and lets local calls through", async () => {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response("ok");
  }) as typeof fetch;
  const warn = console.warn;
  console.warn = () => {};
  try {
    installSandboxNetworkGuard();
    await assert.rejects(fetch("https://shop.example.com/admin"), TypeError);
    await assert.rejects(fetch(new Request("https://mail.example.com/x")), TypeError);
    assert.equal(await (await fetch("http://localhost:3100/ok")).text(), "ok");
    assert.deepEqual(calls, ["http://localhost:3100/ok"]);

    // Next.js fetch zamenja kasneje s svojim; tudi ta mora ostati zavarovan.
    globalThis.fetch = (async () => new Response("next")) as unknown as typeof fetch;
    await assert.rejects(fetch("https://example.com/"), TypeError);
    assert.equal(await (await fetch("http://127.0.0.1/")).text(), "next");
  } finally {
    Object.defineProperty(globalThis, "fetch", { configurable: true, enumerable: true, writable: true, value: original });
    console.warn = warn;
    delete (globalThis as { __deskSandboxGuard?: boolean }).__deskSandboxGuard;
  }
});

test("the same original always gets the same stand-in", () => {
  const name = pseudonymizer((n) => `Stranka ${n}`);
  assert.equal(name("Mario Bianchi"), "Stranka 1");
  assert.equal(name("  mario bianchi "), "Stranka 1");
  assert.equal(name("Ana Novak"), "Stranka 2");
  assert.equal(name(null), null);
  assert.equal(name(""), "");
});
