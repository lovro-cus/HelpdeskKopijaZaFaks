import "server-only";

import { db } from "./db";
import { notifyOutboundFulfilled } from "./notify-outbound";
import { createFulfillment, OUTBOUND_TAG, setOrderTag, updateFulfillmentTracking } from "./shopify";
import { trackingForParcels } from "./unfulfilled";

/**
 * Zaključi odpreme, ki jim je ShipGerman medtem izdal tracking.
 *
 * ShipGerman tracking ne izda ob ustvarjanju pošiljke, ampak šele, ko paket
 * dejansko odpošlje — ure ali dneve kasneje. Brez tega koraka bi naročilo
 * čakalo na to, da se nekdo spomni odpreti stran in klikniti, stranka pa bi
 * potrditev o odpremi dobila z zamudo ali nikoli.
 *
 * Vrne število zaključenih odprem. Napaka pri enem naročilu ne sme ustaviti
 * ostalih — vsako gre v svojem poskusu.
 */
export async function fulfillReadyOutboundOrders(): Promise<number> {
  const pending = await db.outboundOrder.findMany({
    where: { status: { not: "fulfilled" } },
    include: { allocations: { select: { externalParcelId: true } } },
  });
  if (pending.length === 0) return 0;

  let done = 0;
  for (const outbound of pending) {
    const parcelIds = outbound.allocations.map((item) => item.externalParcelId);
    if (!parcelIds.length) continue;

    const info = await trackingForParcels(parcelIds);
    if (!info) continue; // ShipGerman še ni odposlal — pustimo v odpremi

    // Odprema je lahko že potrjena ("Označi kot poslano") — takrat fulfillment
    // obstaja in vanj le vpišemo tracking; drugače ga ustvarimo zdaj. Nov
    // fulfillment nad obstoječim bi naročilo odpremil dvakrat.
    const result = outbound.fulfillmentId
      ? await updateFulfillmentTracking(outbound.fulfillmentId, {
          trackingNumber: info.tracking,
          trackingUrl: info.trackingLink,
          notifyCustomer: true,
        })
      : await createFulfillment(outbound.shopifyOrderId, {
          trackingNumber: info.tracking,
          trackingUrl: info.trackingLink,
          // Smisel samodejnega koraka je prav to, da stranka izve takoj.
          notifyCustomer: true,
        });
    if (!result.ok) {
      console.error(`[Outbound] Auto-fulfill failed for #${outbound.orderNumber}: ${result.reason}`);
      continue;
    }

    await db.$transaction([
      db.outboundOrder.update({
        where: { id: outbound.id },
        data: {
          status: "fulfilled",
          tracking: info.tracking,
          trackingLink: info.trackingLink,
          fulfillmentId: result.fulfillmentId,
          fulfilledAt: new Date(),
        },
      }),
      db.shipgAllocation.updateMany({ where: { outboundOrderId: outbound.id }, data: { status: "shipped" } }),
    ]);
    // Naročilo v Shopifyju je zdaj odposlano, zato oznaka "v delu" odpade.
    await setOrderTag(outbound.shopifyOrderId, OUTBOUND_TAG, false);
    if (outbound.createdById) {
      await notifyOutboundFulfilled({
        recipientId: outbound.createdById,
        orderNumber: outbound.orderNumber,
        tracking: info.tracking,
      });
    }
    done += 1;
  }
  return done;
}

/** Ali sploh kdo čaka na tracking? Od tega je odvisno, ali se splača pogosto
 *  osveževati odposlane pošiljke. */
export async function hasPendingOutbound(): Promise<boolean> {
  return (await db.outboundOrder.count({ where: { status: { not: "fulfilled" } } })) > 0;
}
