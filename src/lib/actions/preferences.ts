"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_APPEARANCE, mergeAppearance, serializeAppearance, type Appearance } from "../appearance";
import { requireUserStrict } from "../auth";
import { db } from "../db";
import { loadConfig } from "../config/server";
import { asLocale } from "../i18n/shared";
import { notifyMatrix, readNotifyMatrix } from "../notify-prefs";

export async function setLocale(fd: FormData) {
  const me = await requireUserStrict();
  await db.user.update({ where: { id: me.id }, data: { locale: asLocale(fd.get("locale")) } });
  revalidatePath("/", "layout");
}

export async function updateNotifications(fd: FormData) {
  const me = await requireUserStrict();
  const emailRaw = fd.get("email");
  const email = typeof emailRaw === "string" ? emailRaw.trim().slice(0, 200) : "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  // Neznan prag pustimo pri miru namesto da bi ga tiho postavili na najnižjega:
  // pokvarjen vnos ne sme nikomur na novo odpreti pošte, ki jo je izklopil.
  const rawPriority = fd.get("notifyPriority");
  const { priorities } = await loadConfig(me.locale);
  const notifyPriority = typeof rawPriority === "string" && priorities.some((item) => item.key === rawPriority)
    ? rawPriority
    : undefined;
  const current = await db.user.findUnique({ where: { id: me.id }, select: { notifyKinds: true, notifyEmail: true, notifyOutsider: true } });
  const notifyKinds = current ? JSON.stringify(readNotifyMatrix((name) => fd.get(name), notifyMatrix(current))) : undefined;
  await db.user.update({
    where: { id: me.id },
    data: {
      email: email || null,
      ...(notifyKinds ? { notifyKinds } : {}),
      notifyDigest: fd.get("notifyDigest") === "on",
      ...(notifyPriority ? { notifyPriority } : {}),
    },
  });
  revalidatePath("/", "layout");
}

/**
 * Shrani spremembo izgleda. Stran jo je že pokazala (predogled na <html>),
 * zato ne osvežujemo poti: ob naslednjem izrisu strežnik pošlje isto, kar je
 * na zaslonu. `reset` vrne vse na privzeto, tudi izbiro teme.
 */
export async function updateAppearance(patch: unknown, reset = false): Promise<Appearance> {
  const me = await requireUserStrict();
  const next = reset ? DEFAULT_APPEARANCE : mergeAppearance(me.appearance, patch);
  await db.user.update({ where: { id: me.id }, data: { appearance: serializeAppearance(next) } });
  return next;
}

export async function markAllNotificationsRead() {
  const me = await requireUserStrict();
  await db.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function markIssueNotificationsRead(issueId: number) {
  const me = await requireUserStrict();
  if (!Number.isInteger(issueId) || issueId < 1) return;
  await db.notification.updateMany({ where: { userId: me.id, issueId, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}
