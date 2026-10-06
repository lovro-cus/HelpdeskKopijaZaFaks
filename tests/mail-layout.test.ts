import assert from "node:assert/strict";
import test from "node:test";

import { escapeHtml, systemMailHtml } from "../src/lib/mail-layout";
import { MAIL_LOGO_BASE64, MAIL_LOGO_CID, mailLogoBuffer } from "../src/lib/mail-logo";

const base = {
  kicker: "Predaja",
  headline: "Naročilo #1870 ti je bilo predano",
  footer: "Samodejno obvestilo.",
};

test("pismo nosi znak kot cid, ne kot data: ali zunanjo sliko", () => {
  const html = systemMailHtml(base);
  assert.ok(html.includes(`src="cid:${MAIL_LOGO_CID}"`));
  assert.ok(!html.includes("data:image"));
  assert.ok(!html.includes("http://") && !html.includes("https://"));
});

test("vnos stranke ali sodelavca je v pismu ubežen", () => {
  const html = systemMailHtml({ ...base, quote: '<script>alert("x")</script> & več' });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&amp; več"));
});

test("prelomi v vnosu ostanejo prelomi", () => {
  const html = systemMailHtml({ ...base, quote: "prva\ndruga" });
  assert.ok(html.includes("prva<br>druga"));
});

test("kar ni podano, se v pismu ne pojavi", () => {
  const html = systemMailHtml(base);
  assert.ok(!html.includes("border-left"));   // ni citata
  assert.ok(!html.includes("<a "));           // ni gumba
});

test("gumb kaže na naslov, ki mu ga damo", () => {
  const html = systemMailHtml({ ...base, cta: { label: "Odpri ticket", href: "http://localhost:3000/orders/B-1870" } });
  assert.ok(html.includes('href="http://localhost:3000/orders/B-1870"'));
  assert.ok(html.includes(">Odpri ticket</a>"));
});

test("vrstice povzetka nosijo številko in povezavo", () => {
  const html = systemMailHtml({ ...base, rows: [{ label: "#1870", value: "V delu", href: "http://x/orders/a" }] });
  assert.ok(html.includes("#1870"));
  assert.ok(html.includes('href="http://x/orders/a"'));
});

test("znak je berljiv PNG", () => {
  const buffer = mailLogoBuffer();
  assert.ok(buffer.length > 1000);
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  assert.ok(!/\s/.test(MAIL_LOGO_BASE64));
});

test("escapeHtml pusti navadno besedilo pri miru", () => {
  assert.equal(escapeHtml("Ana Testmoto"), "Ana Testmoto");
});
