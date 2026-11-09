// TP-05 Zavrnitev podvojenega uporabniškega imena (F-08, negativni) — docs/naloga2/testni-primeri-v3.md
import type { Page } from "@playwright/test";
import { test, expect, loginAndOpenOrders } from "./support/helpers";

const data = {
  name: "Nina Dvojnik",
  username: "nina",
  language: "Slovenščina",
  level: "1. nivo",
  password: "Zacetno-Geslo-1",
  error: "To uporabniško ime je že zasedeno.",
  summary: "6 aktivnih · 6 skupaj",
  existingName: "Nina Vidmar",
  existingLevel: "1",
};

/** Vrstica uporabnika na seznamu (skupina z oznako »@uporabnisko-ime · …«). */
const userRow = (page: Page, username: string) =>
  page.getByRole("main").getByRole("group").filter({ has: page.getByText(new RegExp(`^@${username} ·`)) });

/** Vrednosti vseh polj »Ime« na seznamu uporabnikov. */
const listedNames = (page: Page) =>
  page.getByRole("main").getByRole("textbox", { name: "Ime", exact: true })
    .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));

async function expectUnchangedList(page: Page) {
  await expect(page.getByText(data.summary, { exact: true })).toBeVisible();
  const row = userRow(page, data.username);
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("textbox", { name: "Ime", exact: true })).toHaveValue(data.existingName);
  await expect(row.getByRole("combobox", { name: "Nivo" })).toHaveValue(data.existingLevel);
}

test("TP-05 zavrnitev podvojenega uporabniškega imena", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "Nov uporabnik" });

  await test.step("Predpogoj: Admin prijavljen", async () => {
    await loginAndOpenOrders(page, "Admin");
  });

  await test.step("1. Nadzorna plošča → Uporabniki: 6 aktivnih, 6 skupaj, nina obstaja", async () => {
    await page.getByRole("link", { name: "Nadzorna plošča", exact: true }).first().click();
    await page.getByRole("navigation", { name: "Administracija" }).getByRole("link", { name: "Uporabniki", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expectUnchangedList(page);
  });

  await test.step("2. »Dodaj uporabnika« in izpolni obrazec", async () => {
    await page.getByRole("button", { name: "Dodaj uporabnika", exact: true }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox", { name: "Ime in priimek" }).fill(data.name);
    await dialog.getByRole("textbox", { name: "Uporabniško ime" }).fill(data.username);
    await dialog.getByRole("combobox", { name: "Jezik" }).selectOption({ label: data.language });
    await dialog.getByRole("combobox", { name: "Nivo" }).selectOption({ label: data.level });
    await dialog.getByRole("textbox", { name: "Začetno geslo" }).fill(data.password);

    await expect(dialog.getByRole("textbox", { name: "Ime in priimek" })).toHaveValue(data.name);
    await expect(dialog.getByRole("textbox", { name: "Uporabniško ime" })).toHaveValue(data.username);
    await expect(dialog.getByRole("combobox", { name: "Jezik" }).locator("option:checked")).toHaveText(data.language);
    await expect(dialog.getByRole("combobox", { name: "Nivo" }).locator("option:checked")).toHaveText(data.level);
    await expect(dialog.getByRole("textbox", { name: "Začetno geslo" })).toHaveValue(data.password);
    await expect(dialog.getByRole("textbox", { name: "E-mail" })).toHaveValue("");
    await expect(dialog.getByRole("checkbox", { name: "Administrator" })).not.toBeChecked();
  });

  await test.step("3. Klikni »Ustvari« → zavrnitev z opozorilom", async () => {
    await dialog.getByRole("button", { name: "Ustvari", exact: true }).click();
    await expect(dialog.getByText(data.error, { exact: true })).toBeVisible();
    await expect(dialog).toBeVisible();
    await test.info().attach("podvojeno-uporabnisko-ime", { body: await page.screenshot(), contentType: "image/png" });
  });

  await test.step("4. Prekliči, osveži: še vedno 6 uporabnikov, brez Nine Dvojnik, Nina Vidmar nespremenjena", async () => {
    await dialog.getByRole("button", { name: "Prekliči", exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expectUnchangedList(page);
    const names = await listedNames(page);
    expect(names).toHaveLength(6);
    expect(names).not.toContain(data.name);
    expect(names.filter((name) => name === data.existingName)).toHaveLength(1);
  });
});
