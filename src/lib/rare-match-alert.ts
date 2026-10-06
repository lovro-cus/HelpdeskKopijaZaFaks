import "server-only";

import type { PackageMatch } from "./shipg-matching";
import { canonicalLabel } from "./catalog-canonical";
import { db } from "./db";
import { env } from "./env";
import { formatDate } from "./format";
import { asLocale } from "./i18n/shared";
import { t } from "./i18n/server";
import { systemMailHtml } from "./mail-layout";
import { mailConfigured, sendSystemMail } from "./mailer";
import { rareMatchFor, rareMatchReturnIds } from "./rare-match";
import type { ShopifyOrderSummary } from "./shopify";
import { findOrdersAwaitingStock, loadStockSnapshot, type StockSnapshot } from "./unfulfilled";

/** Nivoji, ki dobijo mail o redkem ujemanju. Admin ni vezan na nivo. */
const ALERT_LEVELS = [2, 3];

const appUrl = () => (env("APP_URL") || "http://localhost:3000").replace(/\/+$/, "");

async function recipients() {
  return db.user.findMany({
    where: { active: true, level: { in: ALERT_LEVELS }, email: { not: null } },
    select: { email: true, locale: true },
  });
}

function mailFor(locale: ReturnType<typeof asLocale>, order: ShopifyOrderSummary, match: PackageMatch) {
  const dateLocale = locale === "sl" ? "sl-SI" : "en-GB";
  const subject = t(locale, "rareMatch.subject", { order: order.orderNumber });
  const meta = [order.customerName, order.customerCountryCode].filter(Boolean).join(" · ") || null;
  const url = `${appUrl()}/shipg?view=outbound&only=rare`;
  const rows = match.packages.map((pkg) => ({
    label: t(locale, "rareMatch.parcel", { id: pkg.parcel.id }),
    value: [
      pkg.items.map((item) => `${item.qty}× ${canonicalLabel(item.name, item.variant)}`).join(", "),
      t(locale, "rareMatch.arrived", { date: formatDate(pkg.parcel.arrivalDate, dateLocale) }),
    ].join(" · "),
  }));
  const quote = t(locale, "rareMatch.quote");
  return {
    subject,
    text: [subject, meta, quote, ...rows.map((row) => `${row.label}: ${row.value}`), url].filter(Boolean).join("\n\n"),
    html: systemMailHtml({
      kicker: t(locale, "rareMatch.kicker"),
      headline: subject,
      meta,
      quote,
      rows,
      cta: { label: t(locale, "rareMatch.cta"), href: url },
      footer: t(locale, "rareMatch.footer"),
    }),
  };
}

/**
 * Če naročilo natanko pokrije paket z več kosi, pošlje mail vsem na 2. in 3.
 * nivoju. Priložnost najprej zaseže v bazi (enolični ključ), zato webhook in
 * urnik, ki tečeta hkrati, ne pošljeta dvakrat. Če ne gre ven noben mail, zapis
 * umakne, da jo naslednji tik poskusi znova.
 */
async function alertRareMatch(order: ShopifyOrderSummary, stock: StockSnapshot): Promise<boolean> {
  const match = rareMatchFor(order, stock.returns, stock.live, undefined, stock.cutoff);
  if (!match) return false;

  const people = await recipients();
  if (people.length === 0 || !mailConfigured()) return false;

  const key = { orderNumber: order.orderNumber, returnIds: rareMatchReturnIds(match) };
  try {
    await db.rareMatchAlert.create({ data: key });
  } catch (error) {
    const taken = typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
    if (taken) return false;
    throw error;
  }

  let sent = 0;
  for (const person of people) {
    if (!person.email) continue;
    const mail = mailFor(asLocale(person.locale), order, match);
    try {
      if (await sendSystemMail({ to: person.email, ...mail })) sent += 1;
    } catch (error) {
      console.error("[RareMatch] Mail failed", error instanceof Error ? error.message : error);
    }
  }

  if (sent === 0) {
    await db.rareMatchAlert.deleteMany({ where: key });
    return false;
  }
  await db.rareMatchAlert.update({ where: { orderNumber_returnIds: key }, data: { recipients: sent } });
  console.log(`[RareMatch] #${order.orderNumber} ↔ zaloga ${key.returnIds}: mail ${sent} prejemnikom.`);
  return true;
}

/** Novo naročilo iz webhooka — primerjamo ga s trenutno zalogo. */
export async function checkOrderForRareMatch(order: ShopifyOrderSummary): Promise<boolean> {
  return alertRareMatch(order, await loadStockSnapshot());
}

function notConnected(error: unknown): boolean {
  return error instanceof Error && (error.message === "NOT_CONFIGURED" || error.message === "NOT_CONNECTED");
}

/**
 * Vsa odprta naročila proti zalogi. Ujame, kar webhook zgreši (izgubljeno
 * obvestilo, deploy), in obratno smer: paket, vpisan v zalogo za naročilom, ki
 * je prišlo prej. Vrne število poslanih obvestil.
 */
export async function checkAllRareMatches(): Promise<number> {
  if (!mailConfigured()) return 0;
  let orders: ShopifyOrderSummary[];
  try {
    orders = await findOrdersAwaitingStock();
  } catch (error) {
    if (notConnected(error)) return 0;
    throw error;
  }
  if (orders.length === 0) return 0;

  const stock = await loadStockSnapshot();
  let alerted = 0;
  for (const order of orders) {
    if (await alertRareMatch(order, stock)) alerted += 1;
  }
  return alerted;
}
