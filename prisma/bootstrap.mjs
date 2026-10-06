/**
 * Ustvari prvega administratorja, kadar je baza brez uporabnikov.
 * Teče v produkcijskem kontejnerju pred zagonom strežnika (glej Dockerfile).
 *
 * Namenoma navaden JavaScript brez TypeScripta: v produkcijski sliki ni `tsx`,
 * je pa `@prisma/client`. Za razvoj obstaja `prisma/bootstrap.ts`.
 *
 * Zapis zgostitve mora ostati enak kot v src/lib/password.ts:
 *   scrypt$<N>$<r>$<p>$<salt base64>$<key base64>
 */
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const scrypt = promisify(scryptCb);
const SCRYPT = { N: 16384, r: 8, p: 1 };

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, 64, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), key.toString("base64")].join("$");
}

/** Ista pravila kot src/lib/password-rules.ts. */
function passwordProblem(password) {
  if (password.length < 8) return "vsaj 8 znakov";
  if (password.length > 200) return "geslo je predolgo";
  if (!/\p{Lu}/u.test(password)) return "vsaj ena velika črka";
  if (!/\p{Ll}/u.test(password)) return "vsaj ena mala črka";
  if (!/\d/.test(password)) return "vsaj ena številka";
  if (!/[^\p{L}\p{N}]/u.test(password)) return "vsaj en poseben znak";
  return null;
}

const db = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.log("[bootstrap] ADMIN_USERNAME/ADMIN_PASSWORD nista nastavljena — preskočeno.");
    return;
  }

  const existing = await db.user.count();
  if (existing > 0) {
    console.log(`[bootstrap] V bazi je ${existing} uporabnikov — ne delam ničesar.`);
    return;
  }

  const problem = passwordProblem(password);
  if (problem) {
    console.error(`[bootstrap] ADMIN_PASSWORD ni sprejemljiv: ${problem}.`);
    process.exitCode = 1;
    return;
  }

  await db.user.create({
    data: {
      username,
      name: "Administrator",
      passwordHash: await hashPassword(password),
      level: 3,
      isAdmin: true,
      mustChangePw: true,
      locale: "sl",
      color: "#0071e3",
    },
  });

  console.log(`[bootstrap] Ustvarjen administrator "${username}". Geslo je treba zamenjati ob prvi prijavi.`);
}

main()
  .catch((error) => {
    console.error("[bootstrap] Napaka:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
