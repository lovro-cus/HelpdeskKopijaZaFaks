// TP-04 Odgovor stranki v demo nabiralniku (F-04) — docs/naloga2/testni-primeri-v3.md
import { test, expect, loginAndOpenOrders, issueHeader, expectAssignee } from "./support/helpers";

const data = {
  customer: "Lara Vzorčni",
  email: "lara.vzorcni@example.com",
  subject: "Vračilo — naročilo #2125",
  orderNumber: "2125",
  key: "KRJ-15",
  ticketOwner: "Nina Vidmar",
  reply: "Pozdravljeni, paket smo prejeli. Refund 59 EUR bo izveden v 3 delovnih dneh. Lep pozdrav, Kroj.",
  sent: "Odgovor je bil poslan iz podpora@kroj.example.",
};

test("TP-04 odgovor stranki in stanje Čakamo", async ({ page }) => {
  const views = page.getByRole("navigation", { name: "Prejeto" });
  const list = page.getByRole("complementary").first();
  const conversation = list.getByRole("link").filter({ hasText: data.customer }).filter({ hasText: data.subject });
  const heading = page.getByRole("heading", { level: 2, name: data.subject, exact: true });
  const messages = page.getByRole("main").getByRole("article");
  const replyBox = page.getByRole("textbox", { name: "Odgovor", exact: true });
  const assignee = page.getByRole("combobox", { name: "Prevzemi" });
  const openTicket = page.getByRole("link", { name: "Odpri ticket", exact: true });

  await test.step("Predpogoj: Admin prijavljen", async () => {
    await loginAndOpenOrders(page, "Admin");
  });

  await test.step("1. Prejeto → Odprto → pogovor Lara Vzorčni za naročilo 2125", async () => {
    await page.getByRole("link", { name: "Prejeto", exact: true }).first().click();
    await views.getByRole("link", { name: "Odprto", exact: true }).click();
    await expect(page).toHaveURL(/\/inbox\?view=open/);
    await expect(conversation).toHaveCount(1);
    await conversation.click();
    await expect(page).toHaveURL(/thread=/);

    await expect(heading).toBeVisible();
    await expect(page.getByText(`${data.customer} · #${data.orderNumber}`, { exact: true })).toBeVisible();
    await expect(openTicket).toHaveAttribute("href", `/orders/${data.key}`);
    // Predpogoj: tri sporočila, brez prevzemnika.
    await expect(messages).toHaveCount(3);
    await expect(messages.first()).toContainText(data.email);
    await expect(assignee.locator("option:checked")).toHaveText("Nedodeljeno");
  });

  await test.step("2. Izbriši predizpolnjeni osnutek in vpiši odgovor", async () => {
    // Počakaj, da se naloži osnutek, sicer bi ga lahko pozneje prepisal čez naš vnos.
    await expect(replyBox).not.toHaveValue("");
    await replyBox.clear();
    await replyBox.fill(data.reply);
    await expect(replyBox).toHaveValue(data.reply);
  });

  await test.step("3. Klikni »Pošlji kot Ana« → potrditev in novo odhodno sporočilo na koncu", async () => {
    await page.getByRole("button", { name: "Pošlji kot Ana", exact: true }).click();
    await expect(page.getByText(data.sent, { exact: true })).toBeVisible();
    await expect(messages).toHaveCount(4);
    await expect(messages.last()).toContainText(data.reply);
    await expect(messages.last()).toContainText("podpora@kroj.example");
    await expect(page.getByText(data.reply, { exact: true })).toHaveCount(1);
  });

  await test.step("4. Pogled »Čakamo« → pogovor je tam, odgovor ohranjen, prevzemnik Administrator", async () => {
    await views.getByRole("link", { name: "Čakamo", exact: true }).click();
    await expect(page).toHaveURL(/\/inbox\?view=waiting/);
    await expect(conversation).toHaveCount(1);
    await conversation.click();
    await expect(page).toHaveURL(/view=waiting.*thread=/);
    await expect(heading).toBeVisible();
    await expect(page.getByText(data.reply, { exact: true })).toHaveCount(1);
    await expect(assignee.locator("option:checked")).toHaveText("Administrator");
  });

  await test.step("5. Osveži, odpri povezani ticket → KRJ-15, lastnica Nina Vidmar", async () => {
    await page.reload();
    await expect(heading).toBeVisible();
    await expect(page.getByText(data.reply, { exact: true })).toHaveCount(1);
    await openTicket.click();
    await expect(page).toHaveURL(new RegExp(`/orders/${data.key}$`));
    await expect(issueHeader(page).getByRole("heading", { level: 2, name: data.orderNumber, exact: true })).toBeVisible();
    await expectAssignee(page, data.ticketOwner);
  });
});
