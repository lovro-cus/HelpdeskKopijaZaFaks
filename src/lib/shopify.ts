import "server-only";

import type { PaymentInfo } from "./payment";
import type { DeliveryFulfillment } from "./order-status";

/**
 * Trgovina (naročila, stranke, odprema).
 *
 * Kopija za faks nima povezave s spletno trgovino: naročila se vpisujejo ročno,
 * zato vse poizvedbe vrnejo "ni podatka". Tipi ostanejo, ker po njih teče
 * ujemanje zaloge z naročili in seznam za odpremo.
 */

export type ShopifyLineItem = {
  name: string;
  /** Velikost, barva … */
  variant: string | null;
  qty: number;
  /** Kar je stranka za to postavko dejansko plačala, po vseh popustih. */
  amount: string | null;
};

/** Ravno toliko naročila, kolikor rabi seznam za odpremo in ujemanje z zalogo. */
export type ShopifyOrderSummary = {
  shopifyId: string | null;
  orderNumber: string;
  customerName: string | null;
  customerCountryCode: string | null;
  items: ShopifyLineItem[];
};

export type ShippingAddress = {
  name: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  zip: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  countryCode: string | null;
  phone: string | null;
};

export type ShopifyOrder = {
  shopifyId: string | null;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerCountryCode: string | null;
  shippingAddress?: ShippingAddress | null;
  items: ShopifyLineItem[];
  amount: string | null;
  currency: string | null;
  orderPlacedAt: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  tracking: string | null;
  payment: PaymentInfo;
};

export type OrderContact = { orderNumber: string; emails: (string | null)[]; phones: (string | null)[]; names: (string | null)[] };
export type OrderStatus = { financial: string | null; fulfillment: string | null };
export type FulfillResult =
  | { ok: true; fulfillmentId: string }
  | { ok: false; reason: "not_connected" | "no_fulfillment_order" | "error"; message?: string };

/** Oznaka naročila, ki je v pripravi za odpremo iz zaloge. */
export const OUTBOUND_TAG = "In progress";

export const shopifyConfigured = (): boolean => false;

export async function findOrder(_rawNumber: string): Promise<ShopifyOrder | null> {
  return null;
}
export async function fetchDeliveryFulfillments(_rawNumber: string): Promise<DeliveryFulfillment[] | null> {
  return null;
}
export async function fetchOrderName(_orderGid: string): Promise<string | null> {
  return null;
}
export async function findOrderNumbersByEmail(_rawEmail: string): Promise<string[]> {
  return [];
}
export async function searchOrderContacts(_term: string): Promise<OrderContact[]> {
  return [];
}
export async function fetchOrderStatus(_rawNumber: string): Promise<OrderStatus | null> {
  return null;
}
export async function findUnfulfilledOrders(): Promise<ShopifyOrderSummary[]> {
  return [];
}
export async function setOrderTag(_orderId: string, _tag: string, _present: boolean): Promise<boolean> {
  return false;
}
export async function createFulfillment(
  _orderId: string,
  _opts: { trackingNumber?: string | null; trackingUrl?: string | null; notifyCustomer: boolean },
): Promise<FulfillResult> {
  return { ok: false, reason: "not_connected" };
}
export async function updateFulfillmentTracking(
  _fulfillmentId: string,
  _opts: { trackingNumber: string; trackingUrl: string | null; notifyCustomer: boolean },
): Promise<FulfillResult> {
  return { ok: false, reason: "not_connected" };
}
