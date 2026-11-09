// TP-01 Odpiranje novega ticketa (F-01) — docs/naloga2/testni-primeri-v3.md
import { test, expect, loginAndOpenOrders, issueHeader, expectAssignee, threadEntries } from "./support/helpers";

const data = {
  type: "Kakovost",
  orderNumber: "3001",
  title: "Raztrgan šiv na rokavu",
  email: "nova.stranka@example.com",
  name: "Nova Stranka",
  priority: "Visoka",
  description: "Po prvem nošenju se je šiv na levem rokavu raztrgal.",
  assignee: "Administrator",
};

test("TP-01 odpiranje novega ticketa", async ({ page }) => {
  let key = "";

  await test.step("Predpogoj: sveže seme, naročilo 3001 ne obstaja, Admin je na strani Tiketi", async () => {
    await loginAndOpenOrders(page, "Admin");
    // Iskanje gre čez vsa stanja, tudi Arhiv, zato prazen rezultat pomeni, da ticketa ni nikjer.
    await page.goto(`/orders?q=${data.orderNumber}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(data.orderNumber);
    await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
    await page.getByRole("link", { name: "Tiketi", exact: true }).click();
    await expect(page).toHaveURL(/\/orders$/);
  });

  const dialog = page.getByRole("dialog", { name: "Nov ticket" });

  await test.step("1. Klikni »Nov ticket« → odpre se obrazec", async () => {
    await page.getByRole("button", { name: "Nov ticket", exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Nov ticket", exact: true })).toBeVisible();
  });

  await test.step("2. Vrsta Kakovost, številka naročila, naslov, e-mail in opis", async () => {
    const typeButton = dialog.getByRole("group", { name: "Vrsta težave" }).getByRole("button", { name: data.type, exact: true });
    await typeButton.click();
    await dialog.getByRole("textbox", { name: "Št. naročila" }).fill(data.orderNumber);
    await dialog.getByRole("textbox", { name: "Naslov", exact: true }).fill(data.title);
    await dialog.getByRole("textbox", { name: "E-mail", exact: true }).fill(data.email);
    await dialog.getByRole("textbox", { name: "Kaj je stranka sporočila" }).fill(data.description);

    await expect(typeButton).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("textbox", { name: "Št. naročila" })).toHaveValue(data.orderNumber);
    await expect(dialog.getByRole("textbox", { name: "Naslov", exact: true })).toHaveValue(data.title);
    await expect(dialog.getByRole("textbox", { name: "E-mail", exact: true })).toHaveValue(data.email);
    await expect(dialog.getByRole("textbox", { name: "Kaj je stranka sporočila" })).toHaveValue(data.description);
  });

  await test.step("3. Prioriteta Visoka, privzeti prevzemnik, ime stranke", async () => {
    await dialog.getByRole("combobox", { name: "Prioriteta" }).selectOption({ label: data.priority });
    await dialog.getByRole("button", { name: "Podatki o stranki in pošiljki", exact: true }).click();
    await dialog.getByRole("textbox", { name: "Ime stranke" }).fill(data.name);

    await expect(dialog.getByRole("combobox", { name: "Prioriteta" }).locator("option:checked")).toHaveText(data.priority);
    await expect(dialog.getByRole("combobox", { name: "Prevzame" }).locator("option:checked")).toContainText(data.assignee);
    await expect(dialog.getByRole("textbox", { name: "Ime stranke" })).toHaveValue(data.name);
  });

  await test.step("4. Klikni »Odpri naročilo« → stran novega ticketa KRJ-n", async () => {
    await dialog.getByRole("button", { name: "Odpri naročilo", exact: true }).click();
    await expect(page).toHaveURL(/\/orders\/KRJ-\d+$/);
    key = page.url().split("/").pop()!;
    await expect(page.getByRole("heading", { level: 1, name: data.title, exact: true })).toBeVisible();
    await expect(issueHeader(page)).toContainText(key);
  });

  await test.step("5. Osveži in preglej podatke ter nit", async () => {
    await page.reload();
    const header = issueHeader(page);
    await expect(header.getByRole("heading", { level: 2, name: data.orderNumber, exact: true })).toBeVisible();
    await expect(header.getByRole("button", { name: data.type, exact: true })).toBeVisible();
    await expect(header.getByText("V delu", { exact: true })).toBeVisible();
    await expect(header.getByText("L3", { exact: true })).toBeVisible();
    await expect(header).toContainText(data.priority);

    await expect(page.locator('[name="orderNumber"]')).toHaveValue(data.orderNumber);
    await expect(page.locator('[name="customerName"]')).toHaveValue(data.name);
    await expect(page.locator('[name="customerEmail"]')).toHaveValue(data.email);
    await expect(page.locator('[name="priority"]').locator("option:checked")).toHaveText(data.priority);

    await expectAssignee(page, data.assignee);
    await expect(threadEntries(page).filter({ hasText: data.description })).toHaveCount(1);
  });

  await test.step("Končni rezultat: obstaja natanko en ticket za naročilo 3001", async () => {
    await page.goto(`/orders?q=${data.orderNumber}`);
    const results = page.getByRole("main").getByRole("article");
    await expect(results).toHaveCount(1);
    await expect(results.getByRole("link").first()).toHaveAttribute("href", new RegExp(`/orders/${key}(\\?|$)`));
  });
});
