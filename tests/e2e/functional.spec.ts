import { execFileSync } from "node:child_process";
import { test, expect, type Page } from "@playwright/test";
import { functionalEnv } from "../../playwright.config";

const demoPassword = "Kroj-Demo-2026";
const note = "Stranka je poslala fotografije, prosim za odobritev refunda 59 EUR.";
const reply = "Pozdravljeni, paket smo prejeli. Refund 59 EUR bo izveden v 3 delovnih dneh. Lep pozdrav, Kroj.";

function database(command: string) {
  execFileSync("bun", ["run", command], {
    cwd: process.cwd(), env: { ...process.env, ...functionalEnv }, stdio: "pipe",
  });
}

async function login(page: Page, username: string, password = demoPassword, newPassword?: string) {
  await page.goto("/login");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  // The anonymous login page is always English, even with a Slovenian browser.
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(newPassword ? "**/geslo" : "**/orders");
  if (newPassword) {
    await page.locator('[name="current"]').fill(password);
    await page.locator('[name="next"]').fill(newPassword);
    await page.locator('[name="repeat"]').fill(newPassword);
    await page.getByRole("button", { name: "Shrani geslo", exact: true }).click();
    await page.waitForURL("**/orders");
  }
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Uporabniški meni", exact: true }).click();
  await page.getByRole("button", { name: "Odjava", exact: true }).click();
  await page.waitForURL("**/login");
}

test.beforeAll(() => database("db:push"));
test.beforeEach(async ({ page }) => {
  database("db:seed");
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  // Runtime and console failures are checked in addition to business outcomes.
  (page as Page & { qaErrors: string[] }).qaErrors = errors;
});
test.afterEach(async ({ page }, info) => {
  info.annotations.push({ type: "functional-result", description: info.errors.length ? "failed" : "passed" });
  const errors = (page as Page & { qaErrors?: string[] }).qaErrors ?? [];
  await info.attach("environment", { body: JSON.stringify({ browser: page.context().browser()?.version(), viewport: page.viewportSize(), url: page.url() }), contentType: "application/json" });
  await info.attach("browser-errors", { body: JSON.stringify(errors, null, 2), contentType: "application/json" });
  await info.attach("rendered-page", { body: await page.locator("body").innerText(), contentType: "text/plain" });
  expect(errors, "No browser runtime or console errors").toEqual([]);
});

test("TP-01 odpiranje novega ticketa", async ({ page }) => {
  await login(page, "Admin");
  await page.getByRole("button", { name: "Nov ticket", exact: true }).click();
  await page.getByRole("button", { name: "Kakovost", exact: true }).click();
  await page.locator("#orderNumber").fill("3001");
  await page.locator("#title").fill("Raztrgan šiv na rokavu");
  await page.locator("#customerEmail").fill("nova.stranka@example.com");
  await page.locator("#description").fill("Po prvem nošenju se je šiv na levem rokavu raztrgal.");
  await page.locator("#priority").selectOption("high");
  await page.getByRole("button", { name: "Podatki o stranki in pošiljki", exact: true }).click();
  await page.locator("#customerName").fill("Nova Stranka");
  await page.getByRole("button", { name: "Odpri naročilo", exact: true }).click();
  await page.waitForURL(/\/orders\/KRJ-\d+$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Raztrgan šiv na rokavu", exact: true })).toBeVisible();
  await expect(page.locator('[name="orderNumber"]')).toHaveValue("3001");
  await expect(page.locator('[name="customerName"]')).toHaveValue("Nova Stranka");
  await expect(page.locator('[name="customerEmail"]')).toHaveValue("nova.stranka@example.com");
  await expect(page.locator('[name="priority"]')).toHaveValue("high");
  await expect(page.locator("body")).toContainText("Po prvem nošenju se je šiv na levem rokavu raztrgal.");
  await expect(page.locator("body")).toContainText("V delu");
  await expect(page.locator("body")).toContainText("L3");
  await expect(page.locator("body")).toContainText("Administrator");
  await expect(page.getByRole("button", { name: "Kakovost", exact: true })).toBeVisible();
});

test("TP-02 predaja drugemu nivoju in obvestilo", async ({ page }) => {
  await login(page, "eva", demoPassword, "Eva-Test-2026!");
  await logout(page);
  await login(page, "nina", demoPassword, "Nina-Test-2026!");
  await page.goto("/orders/KRJ-15");
  await page.getByRole("button", { name: "Predaj naprej", exact: true }).click();
  await page.locator("#handoffTarget").selectOption("level:2");
  await page.locator('textarea[name="note"]').fill(note);
  await page.getByRole("button", { name: "Predaj naprej", exact: true }).last().click();
  await expect(page.locator("#handoffTarget")).toHaveCount(0);
  await expect(page.locator("body")).toContainText("čaka, da ga nekdo s tega nivoja prevzame");
  await expect(page.locator("body")).toContainText(note);
  await logout(page);
  await login(page, "eva", "Eva-Test-2026!");
  await page.getByRole("button", { name: "Obvestila", exact: true }).click();
  const notification = page.getByRole("link").filter({ hasText: "#2125 · Nina Vidmar" });
  await expect(notification).toContainText(note);
  await notification.click();
  await expect(page).toHaveURL(/\/orders\/KRJ-15$/);
  await page.reload();
  await expect(page.locator("body")).toContainText("L2");
  await expect(page.locator("body")).toContainText("V delu");
  await expect(page.locator("body")).toContainText("čaka, da ga nekdo s tega nivoja prevzame");
  await expect(page.locator("body")).toContainText(note);
});

test("TP-03 zavrnitev zaključka brez potrditve vračila", async ({ page }) => {
  await login(page, "eva", demoPassword, "Eva-Test-2026!");
  await page.goto("/orders/KRJ-3");
  await page.getByRole("button", { name: "Zaključi", exact: true }).click();
  await expect(page.locator('[name="returnConfirmed"]')).not.toBeChecked();
  await page.locator('textarea[name="note"]').fill("Refund 119 EUR izveden.");
  await page.getByRole("button", { name: "Zaključi in arhiviraj", exact: true }).click();
  await expect(page.getByText("Potrdi, da je vračilo prispelo oz. da vračilo ni potrebno.", { exact: true })).toBeVisible();
  await test.info().attach("zavrnitev-zakljucka", { body: await page.screenshot(), contentType: "image/png" });
  await page.reload();
  await expect(page.getByRole("button", { name: "Zaključi", exact: true })).toBeVisible();
  await expect(page.locator("body")).toContainText("V delu");
  await expect(page.locator("body")).not.toContainText("Refund 119 EUR izveden.");
  await page.goto("/orders?view=archive");
  await expect(page.locator('a[href="/orders/KRJ-3"]')).toHaveCount(0);
});

test("TP-04 odgovor stranki in stanje Čakamo", async ({ page }) => {
  await login(page, "Admin");
  await page.getByRole("link", { name: "Prejeto", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Navodila za vračilo", exact: true })).toBeVisible();
  const conversation = page.getByRole("link").filter({ hasText: "Lara Vzorčni" }).filter({ hasText: "Vračilo — naročilo #2125" });
  const conversationHref = await conversation.getAttribute("href");
  await conversation.click();
  await page.waitForURL(`**${conversationHref}`);
  await expect(page.getByRole("heading", { name: "Vračilo — naročilo #2125", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Navodila za vračilo", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Odgovor", exact: true }).fill(reply);
  await expect(page.getByRole("textbox", { name: "Odgovor", exact: true })).toHaveValue(reply);
  await page.getByRole("button", { name: "Pošlji kot Ana", exact: true }).click();
  await expect(page.getByText("Odgovor je bil poslan iz podpora@kroj.example.", { exact: true })).toBeVisible();
  await expect(page.getByText(reply, { exact: true })).toHaveCount(1);
  await page.getByRole("link", { name: "Čakamo", exact: true }).click();
  await page.waitForURL("**/inbox?view=waiting");
  await conversation.click();
  await expect(page.locator('select[name="assigneeId"] option:checked')).toHaveText("Administrator");
  await page.reload();
  await expect(page.getByText(reply, { exact: true })).toHaveCount(1);
  await page.getByRole("link", { name: "Odpri ticket", exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/KRJ-15$/);
  await expect(page.locator("body")).toContainText("Nina Vidmar");
});

test("TP-05 zavrnitev podvojenega uporabniškega imena", async ({ page }) => {
  await login(page, "Admin");
  await page.getByRole("link", { name: "Nadzorna plošča", exact: true }).first().click();
  await expect(page.locator("body")).toContainText("6 aktivnih · 6 skupaj");
  await page.getByRole("button", { name: "Dodaj uporabnika", exact: true }).click();
  await page.locator("#new-name").fill("Nina Dvojnik");
  await page.locator("#new-username").fill("nina");
  await page.locator("#new-locale").selectOption("sl");
  await page.locator("#new-level").selectOption("1");
  await page.locator('input[name="password"]').last().fill("Zacetno-Geslo-1");
  await page.getByRole("button", { name: "Ustvari", exact: true }).click();
  await expect(page.getByText("To uporabniško ime je že zasedeno.", { exact: true })).toBeVisible();
  await test.info().attach("podvojeno-uporabnisko-ime", { body: await page.screenshot(), contentType: "image/png" });
  await page.getByRole("button", { name: "Prekliči", exact: true }).click();
  await page.reload();
  await expect(page.locator("body")).toContainText("6 aktivnih · 6 skupaj");
  await expect(page.locator("body")).not.toContainText("Nina Dvojnik");
  await expect(page.locator('input[name="name"][value="Nina Vidmar"]')).toHaveCount(1);
});
