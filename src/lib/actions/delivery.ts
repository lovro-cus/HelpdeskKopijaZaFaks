"use server";

import { requireUserStrict } from "../auth";
import { applyDeliveryStatus, deliveryTicket } from "../delivery";
import { fetchDeliveryFulfillments, shopifyConfigured } from "../shopify";

/** Isti ticket pri Shopifyju preverimo največ enkrat na minuto. */
const RECHECK_MS = 60_000;
const lastCheck = new Map<number, number>();

/**
 * Ob odprtju ticketa preveri dostavo pri Shopifyju — rezerva za primer, ko
 * webhook ne pride. Pravilo premika je isto kot pri webhooku (lib/delivery.ts).
 * Vrne, ali se je kaj spremenilo — takrat se stran osveži.
 */
export async function checkDeliveryStatus(issueId: number): Promise<{ changed: boolean }> {
  const me = await requireUserStrict();
  if (!shopifyConfigured() || !Number.isInteger(issueId) || issueId <= 0) return { changed: false };
  const now = Date.now();
  if (now - (lastCheck.get(issueId) ?? 0) < RECHECK_MS) return { changed: false };
  lastCheck.set(issueId, now);

  const issue = await deliveryTicket(issueId);
  if (!issue) return { changed: false };
  try {
    const fulfillments = await fetchDeliveryFulfillments(issue.orderNumber);
    if (!fulfillments) return { changed: false };
    return { changed: await applyDeliveryStatus(issue, fulfillments, me.id) };
  } catch (error) {
    console.error(`[Delivery] #${issue.orderNumber} check failed`, error instanceof Error ? error.message : error);
    return { changed: false };
  }
}
