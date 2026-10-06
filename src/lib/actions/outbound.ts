"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserStrict } from "../auth";
import { ensureCatalog } from "../catalog-server";
import { db } from "../db";
import { canAccessShipg, canDispatchMatch, isShipgermanMarket } from "../domain";
import { loadSettings } from "../config/server";
import { shipCutoff } from "../ship-cutoff";
import { findExactPackageMatches } from "../shipg-matching";
import { getCachedShipGermanParcels } from "../shipgerman-sync";
import { createFulfillment, findOrder, OUTBOUND_TAG, setOrderTag, updateFulfillmentTracking } from "../shopify";
import { syncRecentShipGermanShipments } from "../shipgerman-sync";
import { trackingForParcels } from "../unfulfilled";

function numericIds(fd: FormData, name: string): number[] {
  return fd.getAll(name).flatMap((value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? [id] : [];
  });
}

function orderParam(fd: FormData): string {
  return String(fd.get("orderNumber") ?? "").trim().slice(0, 40);
}

/** Nazaj tja, od koder je dejanje prišlo, s povratno oznako (reserved |
 *  released | fulfilled | invalid | stale | fulfillError ...): na paketni seznam
 *  ("Za odpremo"), kadar obrazec pošlje from=list, sicer na stran naročila, kjer
 *  odprema teče naprej — tako kot pri menjavi na ticketu. */
function back(fd: FormData, orderNumber: string, state: string): never {
  revalidatePath("/shipg");
  if (orderNumber) revalidatePath(`/unfulfilled/${orderNumber}`);
  if (!orderNumber || fd.get("from") === "list") redirect(`/shipg?view=outbound&state=${state}`);
  redirect(`/unfulfilled/${encodeURIComponent(orderNumber)}?state=${state}`);
}

/**
 * Rezerviraj paket(e) iz zaloge za odpremo nefulfillanega naročila. Naročilo
 * ponovno preberemo iz Shopifyja (vir resnice za vsebino in državo), izbor pa
 * mora natančno pokriti vsebino — ista logika kot pri menjavi. `shipgReturnId`
 * je enoličen, zato istega fizičnega paketa ni mogoče obljubiti dvakrat.
 */
export async function reserveOutbound(fd: FormData): Promise<void> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  await ensureCatalog();

  const orderNumber = orderParam(fd);
  const selectedIds = [...new Set(numericIds(fd, "shipgReturnId"))];
  if (!orderNumber || selectedIds.length === 0) back(fd, orderNumber, "invalid");

  const order = await findOrder(orderNumber).catch(() => null);
  if (!order || !order.shopifyId) back(fd, orderNumber, "stale");
  if (!isShipgermanMarket(order.customerCountryCode)) back(fd, orderNumber, "invalid");

  const demand = order.items.map((item) => ({ name: item.name, variant: item.variant, qty: item.qty }));
  if (!demand.length) back(fd, orderNumber, "invalid");

  const [records, live] = await Promise.all([
    db.shipgReturn.findMany({
      where: { id: { in: selectedIds }, status: "stocked" },
      include: { items: true, allocation: true },
    }),
    getCachedShipGermanParcels(),
  ]);
  if (records.length !== selectedIds.length) back(fd, orderNumber, "stale");
  // Dvomljivo ujemanje ustavimo tu z lastnim sporočilom; brez tega bi ujemanje
  // spodletelo brez pojasnila, ker takih paketov sploh ne ponudi.
  if (records.some((record) => !canDispatchMatch(record.matchQuality))) back(fd, orderNumber, "lowConfidence");

  const matches = findExactPackageMatches(demand, records.map((record) => ({
    id: record.id,
    trackingNumber: record.trackingNumber,
    externalParcelId: record.shipgermanParcelId,
    allocated: Boolean(record.allocation),
    matchQuality: record.matchQuality,
    items: record.items.map((item) => ({
      name: item.name,
      variant: item.variant,
      qty: item.receivedQty > 0 ? item.receivedQty : item.expectedQty,
    })),
  })), live, undefined, undefined, shipCutoff(await loadSettings()));

  const sortedSelection = [...selectedIds].sort((a, b) => a - b);
  const match = matches.find((candidate) => {
    const found = candidate.packages.map((item) => item.shipgReturnId).sort((a, b) => a - b);
    return found.length === sortedSelection.length && found.every((id, index) => id === sortedSelection[index]);
  });
  if (!match) back(fd, orderNumber, "stale");

  try {
    await db.$transaction(async (tx) => {
      const existing = await tx.outboundOrder.findUnique({
        where: { shopifyOrderId: order.shopifyId! },
        include: { allocations: true },
      });
      if (existing && existing.allocations.length) throw new Error("already-reserved");

      const snapshot = {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerCountryCode: order.customerCountryCode,
        status: "reserved",
      };
      const outbound = existing
        ? await tx.outboundOrder.update({ where: { id: existing.id }, data: snapshot })
        : await tx.outboundOrder.create({ data: { ...snapshot, shopifyOrderId: order.shopifyId!, createdById: me.id } });

      for (const item of match.packages) {
        await tx.shipgAllocation.create({
          data: {
            shipgReturnId: item.shipgReturnId,
            outboundOrderId: outbound.id,
            externalParcelId: item.parcel.id,
            reservedById: me.id,
          },
        });
      }
    });
  } catch (error) {
    // Naročilo je medtem rezerviral nekdo drug — to ni zastarela zaloga.
    if (error instanceof Error && error.message === "already-reserved") back(fd, orderNumber, "alreadyReserved");
    console.error("Outbound reservation failed", error);
    back(fd, orderNumber, "stale");
  }
  // Šele po uspešni rezervaciji: v Shopifyju naj se vidi, da je naročilo pri nas
  // v delu. Neuspeh ne razveljavi rezervacije — oznaka je izvesek, ne resnica.
  await setOrderTag(order.shopifyId!, OUTBOUND_TAG, true);
  // Tudi s seznama naprej na naročilo: tam se odprema nadaljuje (ShipGerman,
  // poslano, tracking), enako kot po rezervaciji na ticketu.
  fd.delete("from");
  back(fd, orderNumber, "reserved");
}

/** Sprosti rezervacijo. Odstrani alokacije in sam zapis — naročilo se vrne med
 *  proste kandidate. Odposlanega (shipped/fulfilled) ni mogoče sprostiti. */
export async function releaseOutbound(fd: FormData): Promise<void> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");

  const orderNumber = orderParam(fd);
  const outboundId = String(fd.get("outboundId") ?? "");
  if (!outboundId) back(fd, orderNumber, "invalid");

  const outbound = await db.outboundOrder.findUnique({
    where: { id: outboundId },
    include: { allocations: true },
  });
  if (!outbound) back(fd, orderNumber, "invalid");
  if (outbound.status === "fulfilled" || outbound.allocations.some((item) => item.status === "shipped")) {
    back(fd, orderNumber, "invalid");
  }

  await db.$transaction([
    db.shipgAllocation.deleteMany({ where: { outboundOrderId: outbound.id } }),
    db.outboundOrder.delete({ where: { id: outbound.id } }),
  ]);
  await setOrderTag(outbound.shopifyOrderId, OUTBOUND_TAG, false);
  back(fd, orderNumber, "released");
}

/**
 * Potrdi, da je ShipGerman paket res odpremil — brez čakanja na tracking.
 *
 * Tracking se pri ShipGermanu pojavi z zamikom (tudi 12 ur), pošiljka pa v
 * njihovem seznamu obstaja takoj, ko jo odpremijo. Zato tu ne verjamemo na besedo:
 * na novo povlečemo seznam odposlanih in preverimo, ali je za rezervirane pakete
 * pošiljka res tam. Šele nato naročilo označimo kot odposlano.
 *
 * Smisel je preprečiti dvojno odpremo: naročilo v tem stanju ni več prosto,
 * rezervacije ni mogoče sprostiti, v Shopifyju pa ga oznaka pokaže kot v delu.
 * Fulfillment s trackingom sledi samodejno, ko ga ShipGerman izda.
 */
/** Ali je med rezerviranimi paketi kateri, pri katerem ujemanje ni gotovo.
 *  Preverimo tik pred odpremo, ker se je gotovost lahko znižala po rezervaciji. */
async function hasDoubtfulMatch(outboundOrderId: string): Promise<boolean> {
  const allocations = await db.shipgAllocation.findMany({
    where: { outboundOrderId },
    select: { shipgReturn: { select: { matchQuality: true } } },
  });
  return allocations.some((allocation) => !canDispatchMatch(allocation.shipgReturn?.matchQuality));
}

export async function markOutboundShipped(fd: FormData): Promise<void> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");

  const orderNumber = orderParam(fd);
  const outboundId = String(fd.get("outboundId") ?? "");
  if (!outboundId) back(fd, orderNumber, "invalid");

  const outbound = await db.outboundOrder.findUnique({
    where: { id: outboundId },
    include: { allocations: true },
  });
  if (!outbound || outbound.status === "fulfilled") back(fd, orderNumber, "invalid");
  if (await hasDoubtfulMatch(outbound.id)) back(fd, orderNumber, "lowConfidence");

  // Svež seznam odposlanih — sicer bi sklepali iz zastarelega predpomnilnika.
  await syncRecentShipGermanShipments();

  const parcelIds = outbound.allocations.map((item) => item.externalParcelId);
  const shipment = parcelIds.length
    ? await db.shipGermanCachedShipment.findFirst({
        where: { parcelId: { in: parcelIds }, status: { in: ["Shipped", "ReadyForProcessing"] } },
      })
    : null;
  // Pošiljke še ni v ShipGermanu: paket (še) ni odpremljen, zato ne lažemo.
  if (!shipment) back(fd, orderNumber, "notShippedYet");

  // Naročilo v Shopifyju zaključimo takoj, brez sledenja: paket je odšel in dokler
  // je nefulfillano, ga lahko kdo odpremi drugič. Stranke ob tem ne obveščamo —
  // brez tracking številke ji mail ne pove ničesar; ta gre ob njenem vpisu.
  const result = await createFulfillment(outbound.shopifyOrderId, { notifyCustomer: false });
  if (!result.ok) {
    console.error("Outbound mark-shipped fulfillment failed", result);
    back(fd, orderNumber, "fulfillError");
  }

  await db.$transaction([
    db.outboundOrder.update({
      where: { id: outbound.id },
      // "shipped" = v Shopifyju odposlano, a še brez tracking številke.
      data: { status: "shipped", fulfillmentId: result.fulfillmentId, fulfilledAt: new Date() },
    }),
    db.shipgAllocation.updateMany({ where: { outboundOrderId: outbound.id }, data: { status: "shipped" } }),
  ]);
  // Naročilo ni več "v delu", ampak odposlano — oznaka odpade.
  await setOrderTag(outbound.shopifyOrderId, OUTBOUND_TAG, false);
  back(fd, orderNumber, "markedShipped");
}

/**
 * Zaključi odpremo: ustvari Shopify fulfillment s ShipGerman trackingom. En klic
 * naredi troje — naročilo označi kot odposlano (izgine z zavihka), vpiše tracking
 * in ob `notifyCustomer` sproži Shopifyjev mail stranki. Tracking vzamemo svež iz
 * scrape-a odposlanih pošiljk, ne iz morda zastarelega zapisa.
 */
export async function fulfillOutbound(fd: FormData): Promise<void> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");

  const orderNumber = orderParam(fd);
  const outboundId = String(fd.get("outboundId") ?? "");
  // Neoznačena kljukica se ne pošlje; prisotnost pomeni "obvesti".
  const notifyCustomer = fd.get("notifyCustomer") !== null;
  if (!outboundId) back(fd, orderNumber, "invalid");

  const outbound = await db.outboundOrder.findUnique({
    where: { id: outboundId },
    include: { allocations: true },
  });
  if (!outbound || outbound.status === "fulfilled") back(fd, orderNumber, "invalid");
  if (await hasDoubtfulMatch(outbound.id)) back(fd, orderNumber, "lowConfidence");

  // Tracking vzamemo iz scrape-a, kadar ga ta že pozna; sicer velja ročni vpis.
  // Brez enega ali drugega odpreme ne moremo zaključiti — naročilo v Shopifyju
  // bi ostalo brez številke za sledenje, kar je ravno tisto, čemur se izogibamo.
  const scraped = await trackingForParcels(outbound.allocations.map((item) => item.externalParcelId));
  const manual = String(fd.get("trackingNumber") ?? "").replace(/\s+/g, "").slice(0, 80);
  const info = scraped ?? (manual ? { tracking: manual, trackingLink: null } : null);
  if (!info) back(fd, orderNumber, "needTracking");

  // Če je odprema že potrjena, fulfillment obstaja — takrat samo dopolnimo
  // tracking. Nov fulfillment bi isto naročilo odpremil dvakrat.
  const result = outbound.fulfillmentId
    ? await updateFulfillmentTracking(outbound.fulfillmentId, {
        trackingNumber: info.tracking,
        trackingUrl: info.trackingLink,
        notifyCustomer,
      })
    : await createFulfillment(outbound.shopifyOrderId, {
        trackingNumber: info.tracking,
        trackingUrl: info.trackingLink,
        notifyCustomer,
      });
  if (!result.ok) {
    console.error("Outbound fulfillment failed", result);
    back(fd, orderNumber, "fulfillError");
  }

  await db.$transaction([
    db.outboundOrder.update({
      where: { id: outbound.id },
      data: { status: "fulfilled", tracking: info.tracking, trackingLink: info.trackingLink, fulfillmentId: result.fulfillmentId, fulfilledAt: new Date() },
    }),
    db.shipgAllocation.updateMany({ where: { outboundOrderId: outbound.id }, data: { status: "shipped" } }),
  ]);
  // Naročilo je zdaj v Shopifyju odposlano; oznaka "v odpremi" ni več resnična.
  await setOrderTag(outbound.shopifyOrderId, OUTBOUND_TAG, false);
  back(fd, orderNumber, "fulfilled");
}
