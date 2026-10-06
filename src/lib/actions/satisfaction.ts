"use server";

import { revalidatePath } from "next/cache";

import { requirePermissionStrict } from "../auth";
import { parseSetting } from "../config/defaults";
import { db } from "../db";
import { t } from "../i18n/server";
import { logManage } from "../manage-log";

export type ReviewState = { ok?: boolean; error?: string };

/**
 * Nizko oceno je nekdo pogledal. Zapiše se kdo in kdaj — ticket izgine s
 * seznama za pregled, ocena ostane.
 */
export async function markSatisfactionReviewed(issueId: number): Promise<ReviewState> {
  const me = await requirePermissionStrict("satisfaction");
  const score = await db.satisfactionScore.findUnique({ where: { issueId }, include: { issue: { select: { key: true, orderNumber: true } } } });
  if (!score) return { ok: true };
  await db.satisfactionScore.update({ where: { issueId }, data: { reviewedAt: new Date(), reviewedById: me.id } });
  await logManage("satisfaction", "satisfaction.review", `#${score.issue.orderNumber} · ${score.score ?? "—"}/10`, me.id);
  revalidatePath(`/orders/${score.issue.key}`);
  revalidatePath("/urejanje");
  return { ok: true };
}

/**
 * Prag za pregled in obvestilo o nizki oceni (Urejanje → Zadovoljstvo). Prag
 * velja takoj za seznam in barve; obvestilo za ocene od zdaj naprej.
 */
export async function saveSatisfactionAlert(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const me = await requirePermissionStrict("satisfaction");
  const below = parseSetting("satisfactionReviewBelow", String(fd.get("satisfactionReviewBelow") ?? ""));
  if (below === null) return { error: t(me.locale, "satisfaction.alert.error") };
  const notify = fd.get("satisfactionNotify") === "on" ? 1 : 0;

  await db.$transaction(
    [
      { key: "satisfactionReviewBelow", value: String(below) },
      { key: "satisfactionNotify", value: String(notify) },
    ].map((row) => db.appSetting.upsert({ where: { key: row.key }, create: row, update: { value: row.value } })),
  );

  await logManage("satisfaction", "satisfaction.alert", `< ${below}/10 · ${t(me.locale, notify ? "satisfaction.alert.logOn" : "satisfaction.alert.logOff")}`, me.id);
  revalidatePath("/urejanje");
  revalidatePath("/orders", "layout");
  return { ok: true };
}
