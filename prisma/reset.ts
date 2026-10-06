/**
 * Izprazni bazo: pobriše vsa naročila, celotno zgodovino, priloge in vse
 * uporabnike. Ker registracije ni, na koncu ustvari administratorja —
 * brez njega v aplikacijo ne bi bilo mogoče vstopiti.
 *
 *   npm run db:reset
 *   ADMIN_USERNAME=Admin ADMIN_PASSWORD='...' npm run db:reset
 */
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/password";
import { passwordProblem } from "../src/lib/password-rules";

const db = new PrismaClient();

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "uploads");

async function clearUploads() {
  let entries: string[];
  try {
    entries = await readdir(UPLOAD_DIR);
  } catch {
    return 0;
  }
  let n = 0;
  for (const entry of entries) {
    if (entry === ".gitkeep") continue;
    await rm(path.join(UPLOAD_DIR, entry), { recursive: true, force: true });
    n++;
  }
  return n;
}

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim() || "Admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("ADMIN_PASSWORD je obvezen; reset brez izrecnega začetnega gesla ni dovoljen.");
    process.exit(1);
  }

  const problem = passwordProblem(password);
  if (problem) {
    console.error(`Geslo administratorja ni sprejemljivo: ${problem}`);
    process.exit(1);
  }

  const before = {
    issues: await db.issue.count(),
    users: await db.user.count(),
  };

  // Vrstni red je pomemben zaradi tujih ključev.
  await db.notification.deleteMany();
  await db.attachment.deleteMany();
  await db.event.deleteMany();
  await db.issue.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  const files = await clearUploads();

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

  console.log(
    `Pobrisano: ${before.issues} naročil, ${before.users} uporabnikov, ${files} prilog.`,
  );
  console.log(`Ostal je samo administrator "${username}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
