"use server";

import { revalidatePath } from "next/cache";

import { requireUserStrict } from "../auth";
import { db } from "../db";

/**
 * Zvezdica je osebna oznaka: vsak si označi tickete, ki jih želi imeti pri
 * roki, drugi tega ne vidijo. Vrne novo stanje, da ga gumb pokaže takoj.
 */
export async function toggleStar(issueId: number, starred: boolean): Promise<{ starred: boolean }> {
  const me = await requireUserStrict();
  if (!Number.isSafeInteger(issueId) || issueId <= 0) return { starred: !starred };
  if (starred) {
    const issue = await db.issue.findUnique({ where: { id: issueId }, select: { id: true } });
    if (!issue) return { starred: false };
    await db.issueStar.upsert({
      where: { userId_issueId: { userId: me.id, issueId } },
      create: { userId: me.id, issueId },
      update: {},
    });
  } else {
    await db.issueStar.deleteMany({ where: { userId: me.id, issueId } });
  }
  revalidatePath("/orders");
  return { starred };
}
