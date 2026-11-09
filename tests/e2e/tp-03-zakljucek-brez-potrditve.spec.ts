// TP-03 Zavrnitev zaključka brez potrditve vračila (F-03, negativni) — docs/naloga2/testni-primeri-v3.md
import { test, expect, firstLoginWithPasswordChange, issueHeader, issueOwner, expectAssignee, threadEntries } from "./support/helpers";

const data = {
  key: "KRJ-3",
  orderNumber: "1690",
  owner: "Eva Kranjc",
  item: "Kroj Rain Jacket",
  returnedItem: "Kroj Rain Jacket Yellow / M",
  resolutionText: "Refund 119 EUR izveden.",
  confirmLabel: "Potrjujem, da je vračilo prispelo oz. da vračilo ni bilo potrebno.",
  error: "Potrdi, da je vračilo prispelo oz. da vračilo ni potrebno.",
};

/** Število ticketov v Arhivu iz zavihka »Arhiv N«. */
async function archiveCount(page: import("@playwright/test").Page) {
  const label = await page.getByRole("tab", { name: /^Arhiv/ }).innerText();
  return Number(label.replace(/\D/g, "") || 0);
}

test("TP-03 zavrnitev zaključka brez potrditve vračila", async ({ page }) => {
  let entriesBefore = 0;
  let archivedBefore = 0;

  await test.step("Predpogoj: Eva prijavljena, KRJ-3 (1690, Refund) V delu na L2, artikel z rešitvijo Vračilo", async () => {
    await firstLoginWithPasswordChange(page, "eva");
    archivedBefore = await archiveCount(page);
    expect(archivedBefore, "Arhiv ima ob svežem semenu ticket(e)").toBeGreaterThan(0);

    await page.goto(`/orders/${data.key}`);
    const header = issueHeader(page);
    await expect(header.getByRole("heading", { level: 2, name: data.orderNumber, exact: true })).toBeVisible();
    await expect(header.getByRole("button", { name: "Refund", exact: true })).toBeVisible();
    await expect(header.getByText("V delu", { exact: true })).toBeVisible();
    await expect(header.getByText("L2", { exact: true })).toBeVisible();
    await expectAssignee(page, data.owner);
    const item = page.getByRole("listitem").filter({ has: page.getByRole("combobox", { name: /^Artikel/ }) });
    await expect(item).toHaveCount(1);
    await expect(item.getByRole("combobox", { name: /^Artikel/ })).toHaveValue(data.item);
    await expect(item.getByTitle("Velikost: M", { exact: true })).toBeVisible();
    await expect(item.getByRole("combobox", { name: "Rešitev" }).locator("option:checked")).toHaveText("Vračilo");
    entriesBefore = await threadEntries(page).count();
  });

  const confirm = page.getByRole("checkbox", { name: new RegExp(`^${data.confirmLabel.replace(/\./g, "\\.")}`) });
  const resolution = page.getByRole("textbox", { name: /^Kako je bilo rešeno/ });
  const submit = page.getByRole("button", { name: "Zaključi in arhiviraj", exact: true });

  await test.step("1. Klikni »Zaključi« → obrazec s potrditvenim poljem", async () => {
    await issueOwner(page).getByRole("button", { name: "Zaključi", exact: true }).click();
    await expect(confirm).toBeVisible();
    // Polje poimensko navede artikel, ki se vrača.
    await expect(confirm).toHaveAccessibleName(`${data.confirmLabel} Nazaj pride: ${data.returnedItem}`);
  });

  await test.step("2. Polje pusti neoznačeno, vpiši opis rešitve", async () => {
    await resolution.fill(data.resolutionText);
    await expect(resolution).toHaveValue(data.resolutionText);
    await expect(confirm).not.toBeChecked();
  });

  await test.step("3. Klikni »Zaključi in arhiviraj« → obrazec ostane odprt z opozorilom", async () => {
    await submit.click();
    await expect(page.getByText(data.error, { exact: true })).toBeVisible();
    await expect(submit).toBeVisible();
    await expect(confirm).toBeVisible();
    await test.info().attach("zavrnitev-zakljucka", { body: await page.screenshot(), contentType: "image/png" });
  });

  await test.step("4. Osveži: ticket ostane V delu, brez dogodka o zaključku, ni ga v Arhivu", async () => {
    await page.reload();
    const header = issueHeader(page);
    await expect(header.getByText("V delu", { exact: true })).toBeVisible();
    await expect(issueOwner(page).getByRole("button", { name: "Zaključi", exact: true })).toBeVisible();
    await expect(threadEntries(page)).toHaveCount(entriesBefore);
    await expect(threadEntries(page).filter({ hasText: data.resolutionText })).toHaveCount(0);

    // Globalno iskanje (?q=) ne upošteva stanja, zato Arhiv preverimo kot seznam:
    // ostane enako število ticketov in med njimi ni naročila 1690.
    await page.goto("/orders?view=archive");
    await expect(page.getByRole("heading", { level: 1, name: "Arhiv", exact: true })).toBeVisible();
    const archived = page.getByRole("main").getByRole("article");
    await expect(archived).toHaveCount(archivedBefore);
    await expect(archived.filter({ has: page.getByRole("link", { name: new RegExp(`^${data.orderNumber} · `) }) })).toHaveCount(0);
  });
});
