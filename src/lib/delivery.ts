import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { db } from "./db";
import { DELIVERY_FAILURE_LEVEL, failedDeliveryMove, levelCode } from "./domain";
import { notify } from "./notifications";
import { orderNumberKey } from "./order-number";
import { deliveryFailureOf, type DeliveryFailure, type DeliveryFulfillment } from "./order-status";
import { issueFieldsFromOrder, itemsFromOrder } from "./order-ticket";
import { priorityForPayment } from "./payment";
import { fetchDeliveryFulfillments, fetchOrderName, findOrder } from "./shopify";

/**
 * Neuspešna dostava iz Shopifyja — ena pot za webhook in za preverjanje ob
 * odprtju ticketa, da se ticket v obeh primerih premakne po istem pravilu
 * (glej failedDeliveryMove) in isto neuspelo dostavo zabeleži samo enkrat.
 */

const DELIVERY_SELECT = {
  id: true,
  key: true,
  orderNumber: true,
  status: true,
  level: true,
  assigneeId: true,
  assignee: { select: { name: true } },
  deliveryFailedAt: true,
  deliveryFailedTracking: true,
} as const;

type DeliveryTicket = {
  id: number;
  key: string;
  orderNumber: string;
  status: string;
  level: number;
  assigneeId: string | null;
  assignee: { name: string } | null;
  deliveryFailedAt: Date | null;
  deliveryFailedTracking: string | null;
};

export async function deliveryTicket(issueId: number): Promise<DeliveryTicket | null> {
  return db.issue.findUnique({ where: { id: issueId }, select: DELIVERY_SELECT });
}

async function notifyDelivery(issue: { id: number; key: string; orderNumber: string }, assigneeId: string | null, level: number, tracking: string | null, skip: string | null) {
  const recipients = assigneeId
    ? [assigneeId]
    : (await db.user.findMany({ where: { active: true, level: Math.max(level, 1) }, select: { id: true } })).map((user) => user.id);
  for (const recipientId of recipients) {
    // Kdor ticket ravno gleda, opozorilo že vidi.
    if (recipientId === skip) continue;
    await notify({
      kind: "delivery",
      recipientId,
      issueId: issue.id,
      issueKey: issue.key,
      orderNumber: issue.orderNumber,
      actorName: "Shopify",
      parcelNumber: tracking,
    });
  }
}

/**
 * Stanje dostave obstoječega ticketa. Ob novi neuspeli dostavi ticket dobi
 * opozorilo in dogodek, premakne se po pravilu in obvesti prevzemnika ali nivo.
 * Ko dostava ni več neuspela, opozorilo izgine. Vrne, ali se je kaj spremenilo.
 */
export async function applyDeliveryStatus(issue: DeliveryTicket, fulfillments: DeliveryFulfillment[], viewerId: string | null = null): Promise<boolean> {
  const failure = deliveryFailureOf(fulfillments);
  if (!failure) {
    if (!issue.deliveryFailedAt) return false;
    await db.issue.update({ where: { id: issue.id }, data: { deliveryFailedAt: null, deliveryFailedTracking: null } });
    revalidatePath(`/orders/${issue.key}`);
    return true;
  }

  // Brez Shopifyjevega časa velja trenutek, ko je Desk neuspeh opazil.
  const failedAt = failure.failedAt ?? issue.deliveryFailedAt ?? new Date();
  const known = issue.deliveryFailedAt?.getTime() === failedAt.getTime() && issue.deliveryFailedTracking === failure.tracking;
  if (known) return false;

  const move = failedDeliveryMove(issue);
  const assigneeId = move.clearAssignee ? null : issue.assigneeId;
  const levelChanged = move.level !== issue.level || (move.clearAssignee && issue.assigneeId !== null);

  await db.$transaction([
    db.issue.update({
      where: { id: issue.id },
      data: {
        deliveryFailedAt: failedAt,
        deliveryFailedTracking: failure.tracking,
        status: "open",
        level: move.level,
        assigneeId,
        waitingUntil: null,
        waitingReplySince: null,
        ...(move.reopened ? { closedAt: null, archivedAt: null } : {}),
      },
    }),
    // Dogodka brez avtorja: novica iz Shopifyja in premik, ki ga je naredil sistem.
    db.event.create({
      data: { issueId: issue.id, kind: "shopify", field: "delivery", fromValue: move.reopened ? issue.status : null, toValue: "failed", body: failure.tracking },
    }),
    ...(levelChanged
      ? [db.event.create({ data: { issueId: issue.id, kind: "assign", fromValue: issue.assignee?.name ?? levelCode(issue.level), toValue: levelCode(move.level) } })]
      : []),
  ]);

  await notifyDelivery(issue, assigneeId, move.level, failure.tracking, viewerId);
  revalidatePath("/orders");
  revalidatePath(`/orders/${issue.key}`);
  return true;
}

/** Naročilo z neuspelo dostavo še nima ticketa: odpre ga sistem na tretjem nivoju. */
async function openDeliveryTicket(orderNumber: string, failure: DeliveryFailure, fulfillments: DeliveryFulfillment[]): Promise<void> {
  const order = await findOrder(orderNumber);
  if (!order) return;
  const failedAt = failure.failedAt ?? new Date();
  try {
    const issue = await db.$transaction(async (tx) => {
      const created = await tx.issue.create({
        data: {
          key: `PENDING-${randomUUID()}`,
          orderNumber: order.orderNumber,
          orderNumberKey: orderNumberKey(order.orderNumber),
          type: "tracking",
          status: "open",
          priority: priorityForPayment("medium", order.payment.brand),
          level: DELIVERY_FAILURE_LEVEL,
          source: "system",
          title: "Neuspešna dostava",
          ...issueFieldsFromOrder(order),
          deliveryFailedAt: failedAt,
          deliveryFailedTracking: failure.tracking,
          items: { create: itemsFromOrder(order, "none") },
        },
      });
      const key = `KRJ-${created.id}`;
      await tx.issue.update({ where: { id: created.id }, data: { key } });
      await tx.event.create({ data: { issueId: created.id, kind: "created", field: "delivery", body: "Ticket samodejno odprt: Shopify javlja neuspešno dostavo." } });
      await tx.event.create({ data: { issueId: created.id, kind: "shopify", field: "delivery", toValue: "failed", body: failure.tracking } });
      return { id: created.id, key, orderNumber: created.orderNumber };
    });
    await notifyDelivery(issue, null, DELIVERY_FAILURE_LEVEL, failure.tracking, null);
    revalidatePath("/orders");
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) throw error;
    // Ticket je medtem nastal drugje (drug webhook, mail): velja pravilo za obstoječega.
    const existing = await db.issue.findUnique({ where: { orderNumberKey: orderNumberKey(orderNumber) }, select: DELIVERY_SELECT });
    if (existing) await applyDeliveryStatus(existing, fulfillments);
  }
}

/**
 * Webhook dostave (dogodek pošiljke ali sprememba pošiljke). Stanje preberemo
 * pri Shopifyju sami — telo webhooka je le namig, katero naročilo pogledati.
 */
export async function handleDeliveryWebhook(orderGid: string): Promise<void> {
  const name = await fetchOrderName(orderGid);
  if (!name) return;
  const orderNumber = name.replace(/^#/, "");
  const fulfillments = await fetchDeliveryFulfillments(orderNumber);
  if (!fulfillments) return;

  const issue = await db.issue.findUnique({ where: { orderNumberKey: orderNumberKey(orderNumber) }, select: DELIVERY_SELECT });
  if (issue) {
    await applyDeliveryStatus(issue, fulfillments);
    return;
  }
  const failure = deliveryFailureOf(fulfillments);
  if (failure) await openDeliveryTicket(orderNumber, failure, fulfillments);
}
