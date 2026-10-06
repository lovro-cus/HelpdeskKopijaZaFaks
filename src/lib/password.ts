import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { failedRules, MAX_PASSWORD_LENGTH } from "./password-rules";
import { translate, type TranslationKey } from "./i18n/dictionaries";
import type { Locale } from "./i18n/shared";

/**
 * Gesla se hranijo kot scrypt zgostitve s posamično soljo.
 * Ločeno od auth.ts, da je uporabno tudi v skriptah (seed, bootstrap).
 */

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const SCRYPT = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, 64, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), key.toString("base64")].join(
    "$",
  );
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  try {
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(keyB64, "base64");
    const actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function passwordProblem(password: string, locale: Locale = "en"): string | null {
  if (password.length > MAX_PASSWORD_LENGTH) return translate(locale, "password.tooLong");
  const failed = failedRules(password);
  if (failed.length === 0) return null;
  const rules = failed
    .map((rule) => translate(locale, `password.${rule.id}` as TranslationKey).toLowerCase())
    .join(", ");
  return translate(locale, "password.problem", { rules });
}
