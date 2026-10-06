"use server";

import { notifyMatrix, readNotifyMatrix } from "../notify-prefs";
import { revalidatePath } from "next/cache";

import {
  destroyAllSessions,
  hashPassword,
  passwordProblem,
  requireAdminStrict,
} from "../auth";
import { db } from "../db";
import { MAX_LEVEL } from "../domain";
import { asLocale } from "../i18n/shared";
import { t } from "../i18n/server";
import { serializePermissions } from "../permissions";
import { guestReadOnlyMessage, isGuest } from "../guest";

export type FormState = { error?: string; ok?: string };

const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/;

/** Barve avatarjev. Vse nosijo bele inicialke pri ≥5:1 — prejšnja paleta ni. */
const PALETTE = [
  "#5457e5",
  "#1f7a4d",
  "#a2521a",
  "#7c3aed",
  "#c02653",
  "#14657f",
  "#6b5d17",
  "#2f5fbf",
];

function levelOf(fd: FormData): number | null {
  const n = Number(fd.get("level"));
  return Number.isInteger(n) && n >= 1 && n <= MAX_LEVEL ? n : null;
}

async function activeAdminCount(excludeId?: string) {
  return db.user.count({
    where: { isAdmin: true, active: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}

export async function createUser(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdminStrict();
  if (isGuest(me)) return { error: guestReadOnlyMessage(me.locale) };

  const username = String(fd.get("username") ?? "").trim();
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const password = String(fd.get("password") ?? "");
  const level = levelOf(fd);
  const isAdmin = fd.get("isAdmin") === "on";
  const email = String(fd.get("email") ?? "").trim().slice(0, 200) || null;
  const locale = asLocale(fd.get("locale"));
  const permissions = serializePermissions(fd.getAll("perm"));

  if (!USERNAME_RE.test(username)) {
    return { error: t(me.locale, "admin.error.username") };
  }
  if (!name) return { error: t(me.locale, "admin.error.name") };
  if (level === null) return { error: t(me.locale, "admin.error.level", { max: MAX_LEVEL }) };
  const pwProblem = passwordProblem(password, me.locale);
  if (pwProblem) return { error: pwProblem };

  const exists = await db.user.findUnique({ where: { username }, select: { id: true } });
  if (exists) return { error: t(me.locale, "admin.error.taken") };

  const count = await db.user.count();
  await db.user.create({
    data: {
      username,
      name,
      passwordHash: await hashPassword(password),
      level,
      isAdmin,
      mustChangePw: true,
      color: PALETTE[count % PALETTE.length],
      email,
      locale,
      permissions,
    },
  });

  revalidatePath("/admin");
  return { ok: t(me.locale, "admin.created", { name }) };
}

export async function updateUser(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdminStrict();
  if (isGuest(me)) return { error: guestReadOnlyMessage(me.locale) };

  const id = String(fd.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return { error: t(me.locale, "admin.error.missing") };

  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const level = levelOf(fd);
  const isAdmin = fd.get("isAdmin") === "on";
  const active = fd.get("active") === "on";
  const email = String(fd.get("email") ?? "").trim().slice(0, 200) || null;
  const locale = asLocale(fd.get("locale"));
  const permissions = serializePermissions(fd.getAll("perm"));

  if (!name) return { error: t(me.locale, "admin.error.name") };
  if (level === null) return { error: t(me.locale, "admin.error.level", { max: MAX_LEVEL }) };

  if (user.id === me.id && (!isAdmin || !active)) {
    return { error: t(me.locale, "admin.error.selfLock") };
  }
  if (user.isAdmin && (!isAdmin || !active) && (await activeAdminCount(user.id)) === 0) {
    return { error: t(me.locale, "admin.error.lastAdmin") };
  }

  const notifyKinds = JSON.stringify(readNotifyMatrix((name) => fd.get(name), notifyMatrix(user)));
  const notifyDigest = fd.get("notifyDigest") === "on";

  await db.user.update({ where: { id }, data: { name, level, isAdmin, active, email, locale, permissions, notifyKinds, notifyDigest } });

  // Deaktiviran uporabnik takoj izgubi vse seje.
  if (!active) await destroyAllSessions(id);

  revalidatePath("/admin");
  // Pravice spremenijo glavo (povezava »Urejanje«) na vseh straneh.
  revalidatePath("/", "layout");
  return { ok: t(me.locale, "admin.updated", { name }) };
}

export async function resetPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdminStrict();
  if (isGuest(me)) return { error: guestReadOnlyMessage(me.locale) };

  const id = String(fd.get("userId") ?? "");
  const password = String(fd.get("password") ?? "");

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return { error: t(me.locale, "admin.error.missing") };

  const problem = passwordProblem(password, me.locale);
  if (problem) return { error: problem };

  await db.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), mustChangePw: true },
  });
  await destroyAllSessions(id);

  revalidatePath("/admin");
  return { ok: t(me.locale, "admin.passwordReset", { name: user.name }) };
}

export async function deleteUser(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdminStrict();
  if (isGuest(me)) return { error: guestReadOnlyMessage(me.locale) };

  const id = String(fd.get("userId") ?? "");
  if (id === me.id) return { error: t(me.locale, "admin.error.selfDelete") };

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return { error: t(me.locale, "admin.error.missing") };

  const activity = await db.event.count({ where: { authorId: id } });
  if (activity > 0) {
    return {
      error: t(me.locale, "admin.error.history", { name: user.name, count: activity }),
    };
  }
  if (user.isAdmin && (await activeAdminCount(id)) === 0) {
    return { error: t(me.locale, "admin.error.lastAdmin") };
  }

  await db.user.delete({ where: { id } });
  revalidatePath("/admin");
  return { ok: t(me.locale, "admin.deleted", { name: user.name }) };
}
