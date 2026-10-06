/**
 * Ustvari začetnega administratorja, če v bazi še ni nobenega uporabnika.
 * Namenjeno prvemu zagonu v produkciji — ne briše ničesar.
 *
 *   ADMIN_USERNAME=Admin ADMIN_PASSWORD="..." npm run db:bootstrap
 */
import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/password";
import { passwordProblem } from "../src/lib/password-rules";

const db = new PrismaClient();

async function main() {
  const existing = await db.user.count();
  if (existing > 0) {
    console.log(`V bazi je že ${existing} uporabnikov — ne delam ničesar.`);
    return;
  }

  const username = process.env.ADMIN_USERNAME?.trim() || "Admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("ADMIN_PASSWORD je obvezen; začetnega gesla aplikacija ne določa sama.");
    process.exit(1);
  }

  const problem = passwordProblem(password);
  if (problem) {
    console.error(`Geslo administratorja ni sprejemljivo: ${problem}`);
    process.exit(1);
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

  console.log(`Ustvarjen administrator "${username}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
