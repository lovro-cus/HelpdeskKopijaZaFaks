import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { parseAppearance, type Appearance } from "./appearance";
import { db } from "./db";
import { asLocale, type Locale } from "./i18n/shared";
import { t } from "./i18n/server";
import { can, parsePermissions, type Permission } from "./permissions";

export { hashPassword, passwordProblem, verifyPassword } from "./password";

export const SESSION_COOKIE = "helpdesk_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// --- seje -----------------------------------------------------------------

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      userAgent: userAgent?.slice(0, 300) ?? null,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  level: number;
  isAdmin: boolean;
  color: string;
  mustChangePw: boolean;
  locale: Locale;
  email: string | null;
  notifyEmail: boolean;
  /** Ali uporabnik želi po pošti tudi zunanje vnose. */
  notifyOutsider: boolean;
  /** Prioriteta, od katere naprej uporabnik želi obvestila po e-pošti. */
  notifyPriority: string;
  notifyDigest: boolean;
  /** Tabela obvestil (lib/notify-prefs.ts); null = dosedanja stikala. */
  notifyKinds: string | null;
  appearance: Appearance;
  /** Področja strani »Urejanje«, ki jih sme urejati poleg admina. */
  permissions: Permission[];
};

/**
 * Trenutni uporabnik ali null. Ne preusmerja. Znotraj enega izrisa se bere
 * enkrat — korenski layout ga potrebuje za izgled, (app) layout in stran pa
 * za vse ostalo.
 */
export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.active) {
    if (session) await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const u = session.user;
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    level: u.level,
    isAdmin: u.isAdmin,
    color: u.color,
    mustChangePw: u.mustChangePw,
    locale: asLocale(u.locale),
    email: u.email,
    notifyEmail: u.notifyEmail,
    notifyOutsider: u.notifyOutsider,
    notifyPriority: u.notifyPriority,
    notifyDigest: u.notifyDigest,
    notifyKinds: u.notifyKinds,
    appearance: parseAppearance(u.appearance),
    permissions: parsePermissions(u.permissions),
  };
});

/** Za strani in strežniške akcije — brez veljavne seje ni dostopa. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/orders");
  return user;
}

/** Za akcije, kjer želimo napako namesto preusmeritve. */
export async function requireAdminStrict(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error(t("en", "error.sessionExpired"));
  if (!user.isAdmin) throw new Error(t(user.locale, "error.forbidden"));
  return user;
}

/** Stran »Urejanje«: admin ali nekdo, ki mu je admin to področje dovolil. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, permission)) redirect("/orders");
  return user;
}

/**
 * Isto za strežniške akcije. Skrit gumb ne varuje ničesar — akcijo se da
 * poklicati tudi mimo vmesnika — zato preverja vsaka akcija sama.
 */
export async function requirePermissionStrict(permission: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error(t("en", "error.sessionExpired"));
  if (!can(user, permission)) throw new Error(t(user.locale, "error.forbidden"));
  return user;
}

export async function requireUserStrict(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error(t("en", "error.sessionExpired"));
  return user;
}

// --- omejevanje poskusov prijave ------------------------------------------

type Bucket = { count: number; resetAt: number };
const attempts = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function loginBlocked(key: string): number | null {
  const b = attempts.get(key.toLowerCase());
  if (!b) return null;
  if (Date.now() > b.resetAt) {
    attempts.delete(key.toLowerCase());
    return null;
  }
  if (b.count >= MAX_ATTEMPTS) return Math.ceil((b.resetAt - Date.now()) / 60000);
  return null;
}

export function noteFailedLogin(key: string) {
  const k = key.toLowerCase();
  const b = attempts.get(k);
  if (!b || Date.now() > b.resetAt) {
    attempts.set(k, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    b.count++;
  }
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key.toLowerCase());
}
