import { canonicalLabel } from "@/lib/catalog-canonical";
import { loadTextSettings } from "@/lib/config/server";
import { findExchangeStockMatches } from "@/lib/exchange-stock";
import { t } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { pluralSuffix, type Locale } from "@/lib/i18n/shared";
import { ordersForPackage } from "@/lib/rare-match";
import type { PackageMatch } from "@/lib/shipg-matching";
import type { ShopifyOrderSummary } from "@/lib/shopify";
import { supplierOrderCode } from "@/lib/supplier-import";
import { findOrdersAwaitingStock, loadStockSnapshot } from "@/lib/unfulfilled";
import { StockMatchSheet, type StockMatchRow } from "./StockMatchSheet";

/** Več vrstic v listu ni smiselnih; ostala so na seznamu ujemanj. */
const MAX_ROWS = 8;

/**
 * Obratna smer ujemanja: ko paket pride v zalogo, pogledamo, ali ga katero od
 * odprtih naročil lahko porabi. Menjave, ki čakajo prav ta paket, se pokažejo
 * vedno — sicer bi jo morda naročili pri dobavitelju. Nefulfillana naročila pa
 * SAMO ob redkem ujemanju (paket z več kosi) — navadna ujemanja so na seznamu
 * za odpremo in ne prekinjajo dela.
 */
export async function StockMatchPopup({ shipgReturnId, locale, closeHref }: {
  shipgReturnId: number;
  locale: Locale;
  closeHref: string;
}) {
  const stock = await loadStockSnapshot();
  const packagesOf = (match: PackageMatch) => match.packages.map((pkg) => ({
    parcelId: pkg.parcel.id,
    current: pkg.shipgReturnId === shipgReturnId,
    contents: pkg.items.map((item) => `${item.qty}× ${canonicalLabel(item.name, item.variant)}`).join(", "),
  }));
  const hasThis = (match: PackageMatch) => match.packages.some((pkg) => pkg.shipgReturnId === shipgReturnId);

  let exchangeRows: StockMatchRow[] = [];
  try {
    const supplier = (await loadTextSettings()).supplierName;
    exchangeRows = (await findExchangeStockMatches(stock)).flatMap((entry) => {
      const match = entry.matches.find(hasThis);
      if (!match) return [];
      return [{
        orderNumber: entry.orderNumber,
        customer: [entry.customerName, entry.customerCountryCode].filter(Boolean).join(" · ") || null,
        shipgReturnIds: match.packages.map((pkg) => pkg.shipgReturnId),
        packages: packagesOf(match),
        ticket: {
          key: entry.key,
          issueId: entry.issueId,
          note: entry.supplierOrder
            ? t(locale, entry.supplierOrder.status === "exported" ? "stockMatch.supplierExported" : "stockMatch.supplierOpen", { supplier, code: supplierOrderCode(entry.supplierOrder.id) })
            : null,
        },
      }];
    });
  } catch (error) {
    console.error("[ExchangeStock] Popup check failed", error);
  }

  let orderRows: StockMatchRow[] = [];
  try {
    const orders: ShopifyOrderSummary[] = await findOrdersAwaitingStock();
    orderRows = ordersForPackage(shipgReturnId, orders, stock.returns, stock.live, undefined, stock.cutoff)
      .filter((entry) => entry.rare)
      .map(({ order, match }) => ({
        orderNumber: order.orderNumber,
        customer: [order.customerName, order.customerCountryCode].filter(Boolean).join(" · ") || null,
        shipgReturnIds: match.packages.map((pkg) => pkg.shipgReturnId),
        packages: packagesOf(match),
      }));
  } catch {
    // Brez Shopifyja ostanejo samo menjave.
  }

  const rows = [...exchangeRows, ...orderRows].slice(0, MAX_ROWS);
  if (rows.length === 0) return null;
  const count = exchangeRows.length + orderRows.length;

  return (
    <StockMatchSheet
      title={t(locale, "stockMatch.title")}
      subtitle={t(locale, `stockMatch.subtitle.${pluralSuffix(locale, count)}` as TranslationKey, { count })}
      rows={rows}
      closeHref={closeHref}
    />
  );
}
