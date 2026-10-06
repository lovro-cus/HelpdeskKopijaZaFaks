import "server-only";

import { canonicalLabel } from "./catalog-canonical";
import { db } from "./db";
import { hasPendingResolution, isShipgermanMarket } from "./domain";
import { hasUnsettledPriceDiff } from "./exchange-price";
import { asLocale } from "./i18n/shared";
import { t } from "./i18n/server";
import { notify } from "./notifications";
import { exchangeDemand, findExactPackageMatches, type PackageMatch } from "./shipg-matching";
import { supplierOrderCode } from "./supplier-import";
import { loadStockSnapshot, type StockSnapshot } from "./unfulfilled";

/**
 * Obratna smer ujemanja za menjave: paket je prišel v zalogo — ali ga čaka
 * katera menjava? Brez tega bi menjava, naročena pri dobavitelju (ali še
 * neodločena), stala, čeprav bi jo lahko odposlali sami, dobavitelj pa bi
 * poslal kos, ki ga že imamo.
 *
 * Pravila so ista kot na kartici ticketa (ShipGermanExchangeCard), da opozorilo
 * nikoli ne ponudi paketa, ki ga kartica ne bi.
 */

const issueSelect = {
  id: true,
  key: true,
  orderNumber: true,
  customerName: true,
  customerCountryCode: true,
  currency: true,
  exchangeRound: true,
  assigneeId: true,
  level: true,
  items: true,
  shipgAllocations: { select: { exchangeRound: true } },
  supplierOrders: { select: { id: true, status: true, exchangeRound: true }, orderBy: { id: "desc" as const } },
} as const;

type AwaitingIssue = Awaited<ReturnType<typeof loadAwaitingIssues>>[number];

export type ExchangeStockMatch = {
  issueId: number;
  key: string;
  orderNumber: string;
  customerName: string | null;
  customerCountryCode: string | null;
  exchangeRound: number;
  assigneeId: string | null;
  level: number;
  /** Zahteva pri dobavitelju tekočega kroga, ki še čaka (open | exported). */
  supplierOrder: { id: number; status: string } | null;
  matches: PackageMatch[];
};

/** Odprti ticketi z menjavo, ki v tekočem krogu še nimajo paketa. */
async function loadAwaitingIssues() {
  return db.issue.findMany({
    where: {
      status: { not: "closed" },
      archivedAt: null,
      items: { some: { resolution: "exchange" } },
    },
    select: issueSelect,
  });
}

function supplierOrderOf(issue: AwaitingIssue) {
  return issue.supplierOrders.find((order) => order.exchangeRound === issue.exchangeRound && order.status !== "cancelled") ?? null;
}

/** Ali menjava tega ticketa sploh išče paket — in če, katere kombinacije jo pokrijejo. */
export function exchangeMatchesFor(issue: AwaitingIssue, stock: StockSnapshot): PackageMatch[] {
  if (issue.shipgAllocations.some((allocation) => allocation.exchangeRound === issue.exchangeRound)) return [];
  const supplierOrder = supplierOrderOf(issue);
  if (supplierOrder?.status === "shipped") return [];
  if (!isShipgermanMarket(issue.customerCountryCode)) return [];
  if (issue.items.some((item) => item.resolution === "exchange" && !item.replacementVariant)) return [];
  if (hasPendingResolution(issue.items) || hasUnsettledPriceDiff(issue.items, issue.currency)) return [];
  const demand = exchangeDemand(issue.items);
  if (!demand.length) return [];
  return findExactPackageMatches(demand, stock.returns, stock.live, undefined, undefined, stock.cutoff);
}

export async function findExchangeStockMatches(stock?: StockSnapshot): Promise<ExchangeStockMatch[]> {
  const issues = await loadAwaitingIssues();
  if (!issues.length) return [];
  const snapshot = stock ?? await loadStockSnapshot();
  if (snapshot.live.length === 0) return [];
  return issues.flatMap((issue) => {
    const matches = exchangeMatchesFor(issue, snapshot);
    if (!matches.length) return [];
    const supplierOrder = supplierOrderOf(issue);
    return [{
      issueId: issue.id,
      key: issue.key,
      orderNumber: issue.orderNumber,
      customerName: issue.customerName,
      customerCountryCode: issue.customerCountryCode,
      exchangeRound: issue.exchangeRound,
      assigneeId: issue.assigneeId,
      level: issue.level,
      supplierOrder: supplierOrder && supplierOrder.status !== "shipped" ? { id: supplierOrder.id, status: supplierOrder.status } : null,
      matches,
    }];
  });
}

/** Ključ nabora paketov za enkratno opozorilo. */
export const matchReturnIds = (match: PackageMatch) =>
  match.packages.map((pkg) => pkg.shipgReturnId).sort((a, b) => a - b).join(",");

export const matchContents = (match: PackageMatch) =>
  match.packages.map((pkg) => `ShipGerman ${pkg.parcel.id}: ${pkg.items.map((item) => `${item.qty}× ${canonicalLabel(item.name, item.variant)}`).join(", ")}`).join(" · ");

/** Prevzemnik; ticket brez prevzemnika gre nivoju, ki ga ima v vrsti. */
async function recipientsOf(match: ExchangeStockMatch) {
  return db.user.findMany({
    where: match.assigneeId ? { id: match.assigneeId, active: true } : { active: true, level: Math.max(1, match.level) },
    select: { id: true, locale: true },
  });
}

/**
 * Javi vsako novo ujemanje enkrat (ticket, krog, nabor paketov). Vrne število
 * ticketov, o katerih je šlo obvestilo. Zvonec deluje tudi brez pošte.
 */
export async function alertExchangeStockMatches(stock?: StockSnapshot): Promise<number> {
  const found = await findExchangeStockMatches(stock);
  let alerted = 0;
  for (const entry of found) {
    const seen = new Set((await db.exchangeStockAlert.findMany({
      where: { issueId: entry.issueId, exchangeRound: entry.exchangeRound },
      select: { returnIds: true },
    })).map((row) => row.returnIds));
    const unseen = entry.matches.filter((match) => !seen.has(matchReturnIds(match)));
    const fresh = unseen[0];
    if (!fresh) continue;

    // Eno obvestilo za vse, kar je novega: zapišemo vse nove nabore, sicer bi
    // ticket s sedmimi ustreznimi paketi dobil sedem obvestil v sedmih obhodih.
    try {
      await db.$transaction(unseen.map((match) => db.exchangeStockAlert.create({
        data: { issueId: entry.issueId, exchangeRound: entry.exchangeRound, returnIds: matchReturnIds(match) },
      })));
    } catch {
      // Vzporeden obhod je isto ujemanje že zapisal in javil.
      continue;
    }
    for (const recipient of await recipientsOf(entry)) {
      const locale = asLocale(recipient.locale);
      const supplier = !entry.supplierOrder ? ""
        : ` · ${t(locale, entry.supplierOrder.status === "exported" ? "notification.stockSupplierExported" : "notification.stockSupplierOpen", { code: supplierOrderCode(entry.supplierOrder.id) })}`;
      const preview = `${t(locale, "notification.stockLead")}: ${matchContents(fresh)}${supplier}`;
      try {
        await notify({
          kind: "stock",
          recipientId: recipient.id,
          issueId: entry.issueId,
          issueKey: entry.key,
          orderNumber: entry.orderNumber,
          actorName: "Desk",
          preview,
        });
      } catch (error) {
        console.error("[ExchangeStock] Notification failed", error);
      }
    }
    alerted += 1;
  }
  return alerted;
}
