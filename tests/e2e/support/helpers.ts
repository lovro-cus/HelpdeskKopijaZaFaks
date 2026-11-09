import { execFileSync } from "node:child_process";
import { test as base, expect, type Page } from "@playwright/test";
import { functionalEnv } from "../../../playwright.config";

export { expect };

// Skupni testni podatki iz docs/naloga2/testni-primeri-v3.md (»Skupno okolje in priprava«).
export const DEMO_PASSWORD = "Kroj-Demo-2026";
export const NEW_PASSWORD = { nina: "Nina-Test-2026!", eva: "Eva-Test-2026!" } as const;

/** Ukaz nad ločeno testno bazo naloga2-e2e.db (nikoli nad dev.db). */
export function database(command: "db:push" | "db:seed") {
  execFileSync("bun", ["run", command], {
    cwd: process.cwd(),
    env: { ...process.env, ...functionalEnv },
    stdio: "pipe",
  });
}

/**
 * Vsak test dobi:
 *  - sveže seme baze (predpogoj »Sveže seme« in skupni postopek čiščenja),
 *  - nov kontekst brskalnika brez prijavne seje (to naredi Playwright sam),
 *  - beleženje napak JavaScripta in konzole, ki na koncu ne smejo obstajati.
 */
export const test = base.extend<{ freshDatabase: void; browserErrors: string[] }, { schema: void }>({
  // Shema enkrat na delavca, seme pred vsakim testom: testi so med seboj neodvisni.
  schema: [async ({}, use) => { database("db:push"); await use(); }, { scope: "worker", auto: true }],
  freshDatabase: [async ({ schema }, use) => { database("db:seed"); await use(); }, { auto: true }],
  browserErrors: [
    async ({ page, freshDatabase }, use, info) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use(errors);
      await info.attach("browser-errors", { body: JSON.stringify(errors, null, 2), contentType: "application/json" });
      expect(errors, "Brez napak JavaScripta in konzole").toEqual([]);
    },
    { auto: true },
  ],
});

/** Prijava. Prijavna stran je vedno angleška (gumb »Sign in«). */
export async function login(page: Page, username: string, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/** Prijava z običajnim geslom; čaka na seznam ticketov. */
export async function loginAndOpenOrders(page: Page, username: string, password = DEMO_PASSWORD) {
  await login(page, username, password);
  await page.waitForURL("**/orders");
  await expect(page.getByRole("link", { name: "Tiketi", exact: true })).toBeVisible();
}

/** Prva prijava z demo geslom in zamenjava gesla skozi vmesnik (skupna priprava za TP-02 in TP-03). */
export async function firstLoginWithPasswordChange(page: Page, username: keyof typeof NEW_PASSWORD) {
  const next = NEW_PASSWORD[username];
  await login(page, username);
  await page.waitForURL("**/geslo");
  await page.locator('[name="current"]').fill(DEMO_PASSWORD);
  await page.locator('[name="next"]').fill(next);
  await page.locator('[name="repeat"]').fill(next);
  await page.getByRole("button", { name: "Shrani geslo", exact: true }).click();
  await page.waitForURL("**/orders");
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Uporabniški meni", exact: true }).click();
  await page.getByRole("button", { name: "Odjava", exact: true }).click();
  await page.waitForURL("**/login");
}

/** Glava ticketa: številka naročila, ključ, vrsta, status, nivo, prioriteta. */
export const issueHeader = (page: Page) => page.getByTestId("issue-header");
/** Okvir lastnika: prevzemnik (ali čakalna vrsta nivoja), status, nivo in dejanja. */
export const issueOwner = (page: Page) => page.getByTestId("issue-owner");
/** Dogodki v niti ticketa. */
export const threadEntries = (page: Page) => page.getByRole("main").getByRole("article");

/**
 * Prevzemnik v okviru lastnika. Prva vrstica je ime (ali »N. nivo«, ko ticket čaka
 * na prevzem); če gleda lastnik sam, ima ime pripeto oznako »jaz«.
 */
export async function expectAssignee(page: Page, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await expect(issueOwner(page).getByRole("paragraph").first()).toHaveText(new RegExp(`^${escaped}(jaz)?$`));
}

/** Ticket brez osebnega prevzemnika: namesto imena je »N. nivo« in opis čakanja na prevzem. */
export async function expectAwaitingClaim(page: Page, level: number) {
  const lines = issueOwner(page).getByRole("paragraph");
  await expect(lines.first()).toHaveText(`${level}. nivo`);
  await expect(lines.nth(1)).toHaveText("čaka, da ga nekdo s tega nivoja prevzame");
}
