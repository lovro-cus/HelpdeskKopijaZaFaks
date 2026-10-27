"use server";

import { revalidatePath } from "next/cache";

import { requireUserStrict } from "../auth";
import { db } from "../db";
import { resetSeedIssue, seedNumberOf } from "../demo-seed";
import { t } from "../i18n/server";
import { isSandbox } from "../sandbox";
import { deleteStoredAttachments } from "../uploads";

export type ResetState = { error?: string; ok?: boolean };

/**
 * Testna kopija: naročilo iz demo podatkov vrne v stanje, kot ga ustvari
 * seed, da ga lahko naslednji preizkus začne od začetka.
 */
export async function resetDemoIssue(issueId: number): Promise<ResetState> {
  const me = await requireUserStrict();
  if (!isSandbox()) return { error: t(me.locale, "error.forbidden") };

  const issue = await db.issue.findUnique({ where: { id: issueId }, select: { key: true } });
  const n = issue ? seedNumberOf(issue.key) : null;
  if (!issue || !n) return { error: t(me.locale, "error.orderMissing") };

  let storedNames: string[];
  try {
    storedNames = await db.$transaction((tx) => resetSeedIssue(tx, issueId, n), { timeout: 30_000 });
  } catch (error) {
    console.error("Demo reset failed", { issueId, error });
    return { error: t(me.locale, "demoReset.failed") };
  }

  const failed = await deleteStoredAttachments(storedNames);
  if (failed.length > 0) {
    console.error("Failed to remove attachment files after demo reset", { issueId, failed });
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${issue.key}`);
  return { ok: true };
}
