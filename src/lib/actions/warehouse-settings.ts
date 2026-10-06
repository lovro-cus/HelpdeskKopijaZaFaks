"use server";

import { revalidatePath } from "next/cache";

import { requirePermissionStrict } from "../auth";
import { parseSetting } from "../config/defaults";
import { db } from "../db";
import { t } from "../i18n/server";
import { logManage } from "../manage-log";

/**
 * Prag starosti za odpremo na strani »Urejanje → Skladišče« (admin ali pravica
 * "warehouse"). Ostale nastavitve ostanejo v adminu; ta je del vsakdanjega
 * dela s skladiščem, zato jo ureja, kdor skrbi za skladišče.
 */

export type ShipCutoffState = { ok?: boolean; error?: string };

export async function saveShipCutoff(_prev: ShipCutoffState, fd: FormData): Promise<ShipCutoffState> {
  const me = await requirePermissionStrict("warehouse");
  const days = parseSetting("shipMaxAgeDays", String(fd.get("shipMaxAgeDays") ?? ""));
  if (days === null) return { error: t(me.locale, "warehouse.cutoff.error") };
  const rareExempt = fd.get("shipMaxAgeRareExempt") === "on" ? 1 : 0;

  await db.$transaction(
    [
      { key: "shipMaxAgeDays", value: String(days) },
      { key: "shipMaxAgeRareExempt", value: String(rareExempt) },
    ].map((row) => db.appSetting.upsert({ where: { key: row.key }, create: row, update: { value: row.value } })),
  );

  await logManage("warehouse", "cutoff.update", `${days} d · ${t(me.locale, rareExempt ? "warehouse.cutoff.logExempt" : "warehouse.cutoff.logIncluded")}`, me.id);
  revalidatePath("/urejanje");
  revalidatePath("/shipg");
  return { ok: true };
}
