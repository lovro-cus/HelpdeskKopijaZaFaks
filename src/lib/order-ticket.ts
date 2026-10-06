import type { ShopifyOrder } from "./shopify";

/**
 * Polja ticketa, ki jih prinese Shopify naročilo — skupna vsem potem, ki ticket
 * odprejo same (preverjen mail, neuspešna dostava).
 */
export function issueFieldsFromOrder(order: ShopifyOrder) {
  return {
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    customerCountryCode: order.customerCountryCode,
    amount: order.amount == null ? null : Number(order.amount),
    currency: order.currency || "EUR",
    paymentMethod: order.payment.method,
    paymentBrand: order.payment.brand,
    paymentLast4: order.payment.last4,
    orderPlacedAt: order.orderPlacedAt ? new Date(order.orderPlacedAt) : null,
    shopifyFinancial: order.financialStatus,
    shopifyFulfillment: order.fulfillmentStatus,
    shopifyStatusAt: new Date(),
  };
}

/** Postavke naročila z enako rešitvijo za vse. */
export function itemsFromOrder(order: ShopifyOrder, resolution: string) {
  return order.items.map((item, position) => ({
    name: item.name,
    variant: item.variant,
    qty: item.qty,
    amount: item.amount == null ? null : Number(item.amount),
    resolution,
    position,
  }));
}
