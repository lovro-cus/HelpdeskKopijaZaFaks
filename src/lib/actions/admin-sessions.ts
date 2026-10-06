"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { destroyAllSessions, requireAdminStrict } from "../auth";
import { db } from "../db";
import { isGuest } from "../guest";

/** Odjavi eno sejo (npr. pozabljena naprava). */
export async function revokeSession(fd: FormData): Promise<void> {
  const me = await requireAdminStrict();
  // Gost bi sicer lahko odjavil vse ostale goste.
  if (isGuest(me)) redirect("/admin?view=sessions");
  const id = String(fd.get("sessionId") ?? "");
  if (id) await db.session.deleteMany({ where: { id } });
  revalidatePath("/admin");
  redirect("/admin?view=sessions&saved=revoked");
}

/** Odjavi uporabnika povsod. Ista pot kot ob spremembi gesla. */
export async function revokeUserSessions(fd: FormData): Promise<void> {
  const me = await requireAdminStrict();
  // Gost bi sicer lahko odjavil vse ostale goste.
  if (isGuest(me)) redirect("/admin?view=sessions");
  const userId = String(fd.get("userId") ?? "");
  if (userId) await destroyAllSessions(userId);
  revalidatePath("/admin");
  redirect("/admin?view=sessions&saved=revokedAll");
}

/** Pobriši potekle seje. Same po sebi ne veljajo več, a se kopičijo. */
export async function pruneExpiredSessions(): Promise<void> {
  const me = await requireAdminStrict();
  // Gost bi sicer lahko odjavil vse ostale goste.
  if (isGuest(me)) redirect("/admin?view=sessions");
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  revalidatePath("/admin");
  redirect("/admin?view=sessions&saved=pruned");
}
