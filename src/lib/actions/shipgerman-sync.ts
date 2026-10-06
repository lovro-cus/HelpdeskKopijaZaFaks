"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserStrict } from "../auth";
import { db } from "../db";
import { fulfillReadyOutboundOrders } from "../outbound-auto";
import { canAccessShipg } from "../domain";
import { recordOutboundMatches } from "../outbound-matches";
import { findOrdersAwaitingStock } from "../unfulfilled";
import { buildOutboundWorklist } from "../outbound-worklist";
import { syncShipGermanInventory, syncRecentShipGermanShipments, syncShipGermanShipments } from "../shipgerman-sync";

export async function refreshShipGermanInventory(): Promise<void> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  const result = await syncShipGermanInventory();
  revalidatePath("/shipg");
  redirect(result.ok
    ? "/shipg?view=stock&saved=shipgermanRefreshed"
    : `/shipg?view=stock&error=shipgerman_${result.reason}`);
}

/** Ročna osvežitev odposlanih pošiljk — le najnovejše strani (hitro). Polno
 *  zgodovino osveži ozadje (urnik/cron). */
export async function refreshShipGermanShipments(): Promise<void> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  const result = await syncRecentShipGermanShipments();
  // Prav ta osvežitev pogosto prinese tracking za naročilo, ki nanj čaka. Brez
  // tega bi ga videli v seznamu, v Shopify pa bi ga vpisal šele urnik.
  const fulfilled = result.ok ? await fulfillReadyOutboundOrders() : 0;
  revalidatePath("/shipg");
  redirect(result.ok
    ? `/shipg?view=shipped&saved=${fulfilled > 0 ? "shipmentsFulfilled" : "shipmentsRefreshed"}`
    : `/shipg?view=shipped&error=shipgerman_${result.reason}`);
}

/** Globoka osvežitev: povleče VSE strani odposlanih pošiljk (počasnejše).
 *  Za ročno poravnavo celotne zgodovine, ne le najnovejšega. */
export async function deepRefreshShipGermanShipments(): Promise<void> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  const result = await syncShipGermanShipments();
  const fulfilled = result.ok ? await fulfillReadyOutboundOrders() : 0;
  revalidatePath("/shipg");
  redirect(result.ok
    ? `/shipg?view=shipped&saved=${fulfilled > 0 ? "shipmentsFulfilled" : "shipmentsRefreshed"}`
    : `/shipg?view=shipped&error=shipgerman_${result.reason}`);
}

/** Osveži seznam »Za odpremo«: poleg živega Shopify branja na novo potegne tudi
 *  ShipGerman zalogo IN nedavne odposlane pošiljke, da je slika res realna — brez
 *  ročnega skoka na ZALOGA in osveževanja tam. Ostane na leči odpreme. Shipments
 *  potegnemo zato, ker prav ta poravna pakete, poslane mimo sistema. */
export async function refreshOutboundStock(): Promise<void> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  const [inventory] = await Promise.all([
    syncShipGermanInventory(),
    syncRecentShipGermanShipments(),
  ]);
  // Če je osvežitev prinesla tracking, naročilo zaključimo takoj, ne šele ob tiku.
  if (inventory.ok) await fulfillReadyOutboundOrders();

  // Osvežitev ima smisel le, če pove, ali je prinesla kaj novega. Ujemanja zato
  // preštejemo tu in jih primerjamo s posnetkom prejšnje osvežitve. Če Shopify
  // ne odgovori, osvežitev zaloge vseeno velja — le poročila o ujemanjih ni.
  let found: number | null = null;
  try {
    const { rows } = await buildOutboundWorklist(await findOrdersAwaitingStock());
    found = (await recordOutboundMatches(rows)).fresh;
  } catch {
    found = null;
  }

  revalidatePath("/shipg");
  redirect(inventory.ok
    ? `/shipg?view=outbound&state=stockRefreshed${found === null ? "" : `&found=${found}`}`
    : `/shipg?view=outbound&state=syncError`);
}

/** Osveži ShipGerman scrape neposredno s strani naročila in ostani tam. Potrditev
 *  odpreme se izpelje iz scrape-a (paket, ki ga ni več v aktivni zalogi, je odšel),
 *  zato po sinhronizaciji revalidiramo tudi naročilo. */
export async function refreshShipGermanForOrder(fd: FormData): Promise<void> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  const raw = fd.get("issueKey");
  const key = typeof raw === "string" ? raw.trim().slice(0, 40) : "";
  if (!key) redirect("/orders");
  const result = await syncShipGermanInventory();
  revalidatePath("/shipg");
  revalidatePath(`/orders/${key}`);
  redirect(`/orders/${encodeURIComponent(key)}?shipgAllocation=${result.ok ? "refreshed" : "refreshError"}`);
}

function safeReturn(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || value.length > 300) return "/shipg?view=stock";
  try {
    const url = new URL(value, "http://local");
    return url.origin === "http://local" && url.pathname === "/shipg" ? `${url.pathname}${url.search}` : "/shipg?view=stock";
  } catch {
    return "/shipg?view=stock";
  }
}

/** Označi ali odznači fizični ShipGerman paket kot neidentificiran (neznana vsebina). */
export async function toggleShipGermanUnidentifiable(fd: FormData): Promise<void> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  const raw = fd.get("shipgermanParcelId");
  const id = typeof raw === "string" ? raw.trim().slice(0, 100) : "";
  const next = fd.get("unidentifiable") === "1";
  if (id) {
    await db.shipGermanCachedParcel.updateMany({ where: { id }, data: { unidentifiable: next } });
  }
  revalidatePath("/shipg");
  redirect(safeReturn(fd.get("returnTo")));
}
