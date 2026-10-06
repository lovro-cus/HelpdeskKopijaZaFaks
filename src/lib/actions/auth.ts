"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  clearLoginAttempts,
  createSession,
  destroyAllSessions,
  destroySession,
  hashPassword,
  loginBlocked,
  noteFailedLogin,
  passwordProblem,
  requireUserStrict,
  verifyPassword,
} from "../auth";
import { db } from "../db";
import { t } from "../i18n/server";
import { asLocale } from "../i18n/shared";
import { isGuest } from "../guest";

export type FormState = { error?: string; ok?: boolean };

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const username = String(fd.get("username") ?? "").trim();
  const password = String(fd.get("password") ?? "");

  if (!username || !password) return { error: t("en", "auth.error.required") };

  const blockedFor = loginBlocked(username);
  if (blockedFor) {
    return { error: t("en", "auth.error.blocked", { minutes: blockedFor }) };
  }

  const user = await db.user.findUnique({ where: { username } });

  // Enaka pot in enako sporočilo ne glede na to, ali uporabnik obstaja.
  const valid = user?.active ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !user.active || !valid) {
    noteFailedLogin(username);
    return { error: t(user ? asLocale(user.locale) : "en", "auth.error.invalid") };
  }

  clearLoginAttempts(username);
  const ua = (await headers()).get("user-agent");
  await createSession(user.id, ua);
  await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  redirect(user.mustChangePw ? "/geslo" : "/orders");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function changeOwnPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();

  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const repeat = String(fd.get("repeat") ?? "");

  const user = await db.user.findUnique({ where: { id: me.id } });
  if (!user) return { error: t(me.locale, "auth.error.userMissing") };
  if (isGuest(user)) {
    return { error: me.locale === "sl" ? "Skupnemu računu za ogled gesla ni mogoče spremeniti." : "The shared guest account cannot change its password." };
  }

  if (!(await verifyPassword(current, user.passwordHash))) {
    return { error: t(me.locale, "auth.error.current") };
  }
  if (next !== repeat) return { error: t(me.locale, "auth.error.match") };
  const problem = passwordProblem(next, me.locale);
  if (problem) return { error: problem };
  if (await verifyPassword(next, user.passwordHash)) {
    return { error: t(me.locale, "auth.error.same") };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePw: false },
  });

  // Vse ostale seje se razveljavijo, trenutna se ustvari na novo.
  await destroyAllSessions(user.id);
  await createSession(user.id, (await headers()).get("user-agent"));

  redirect("/orders");
}
