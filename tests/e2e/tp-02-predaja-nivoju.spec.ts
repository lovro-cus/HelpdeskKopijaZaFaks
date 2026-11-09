// TP-02 Predaja ticketa drugemu nivoju (F-02) — docs/naloga2/testni-primeri-v3.md
import {
  test, expect, login, logout, firstLoginWithPasswordChange, NEW_PASSWORD,
  issueHeader, issueOwner, expectAssignee, expectAwaitingClaim, threadEntries,
} from "./support/helpers";

const data = {
  key: "KRJ-15",
  orderNumber: "2125",
  owner: "Nina Vidmar",
  target: "2. nivo — obvesti vse",
  note: "Stranka je poslala fotografije, prosim za odobritev refunda 59 EUR.",
};

test("TP-02 predaja drugemu nivoju in obvestilo", async ({ page }) => {
  const notificationsButton = page.getByRole("button", { name: "Obvestila", exact: true });

  await test.step("Predpogoj: gesli za Evo in Nino, Eva nima obvestil, prijavljena je nina", async () => {
    await firstLoginWithPasswordChange(page, "eva");
    await notificationsButton.click();
    await expect(page.getByText("Vse je pregledano", { exact: true })).toBeVisible();
    await notificationsButton.click();
    await logout(page);
    await firstLoginWithPasswordChange(page, "nina");
  });

  await test.step("1. Odpri /orders/KRJ-15 → naročilo 2125, Nina Vidmar, L1, V delu", async () => {
    await page.goto(`/orders/${data.key}`);
    const header = issueHeader(page);
    await expect(header.getByRole("heading", { level: 2, name: data.orderNumber, exact: true })).toBeVisible();
    await expect(header.getByText("V delu", { exact: true })).toBeVisible();
    await expect(header.getByText("L1", { exact: true })).toBeVisible();
    await expectAssignee(page, data.owner);
  });

  const target = page.getByRole("combobox", { name: "Predaj komu" });
  const handoffForm = page.locator("form").filter({ has: target });

  await test.step("2. Klikni »Predaj naprej« → obrazec s poljem »Predaj komu«", async () => {
    await issueOwner(page).getByRole("button", { name: "Predaj naprej", exact: true }).click();
    await expect(target).toBeVisible();
  });

  await test.step("3. Izberi 2. nivo, vpiši komentar in potrdi", async () => {
    await target.selectOption({ label: data.target });
    await handoffForm.getByRole("textbox").fill(data.note);
    await handoffForm.getByRole("button", { name: "Predaj naprej", exact: true }).click();

    await expect(target).toBeHidden();
    const header = issueHeader(page);
    await expect(header.getByText("L2", { exact: true })).toBeVisible();
    await expect(header.getByText("V delu", { exact: true })).toBeVisible();
    // Brez osebnega lastnika: namesto imena je čakalna vrsta nivoja.
    await expectAwaitingClaim(page, 2);
    const handoffEvent = threadEntries(page).filter({ hasText: "je predal" }).filter({ hasText: data.note });
    await expect(handoffEvent).toHaveCount(1);
  });

  const notification = page.getByRole("link").filter({ hasText: `#${data.orderNumber} · ${data.owner}` });

  await test.step("4. Odjava, prijava kot eva, odpri »Obvestila«", async () => {
    await logout(page);
    await login(page, "eva", NEW_PASSWORD.eva);
    await page.waitForURL("**/orders");
    await notificationsButton.click();
    await expect(notification).toHaveCount(1);
    await expect(notification).toContainText(data.note);
  });

  await test.step("5. Klikni obvestilo → KRJ-15 na L2 brez prevzemnika in s komentarjem", async () => {
    await notification.click();
    await expect(page).toHaveURL(new RegExp(`/orders/${data.key}$`));
    await page.reload();
    const header = issueHeader(page);
    await expect(header.getByRole("heading", { level: 2, name: data.orderNumber, exact: true })).toBeVisible();
    await expect(header.getByText("L2", { exact: true })).toBeVisible();
    await expect(header.getByText("V delu", { exact: true })).toBeVisible();
    await expectAwaitingClaim(page, 2);
    await expect(threadEntries(page).filter({ hasText: data.note })).toHaveCount(1);
  });
});
