/**
 * Enkratna, nedestruktivna priprava stare SQLite baze pred `prisma db push`.
 * Tako produkcijski zagon ne potrebuje splošnega `--accept-data-loss`.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
async function main() {
  const tables = await db.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Issue'",
  );
  if (tables.length === 0) return;

  const columns = await db.$queryRawUnsafe("PRAGMA table_info('Issue')");
  if (!columns.some((column) => column.name === "orderNumberKey")) {
    await db.$executeRawUnsafe("ALTER TABLE Issue ADD COLUMN orderNumberKey TEXT");
  }

  // Stare podvojene številke niso razlog, da aplikacija ostane nedosegljiva.
  // Morebitne že podvojene tehnične ključe razrešimo na NULL; backfill nato
  // izbere en glavni zapis za vsako številko in ostale zgodovinske zapise ohrani.
  await db.$executeRawUnsafe(`
    UPDATE Issue
    SET orderNumberKey = NULL
    WHERE orderNumberKey IS NOT NULL
      AND id NOT IN (
        SELECT MIN(id)
        FROM Issue
        WHERE orderNumberKey IS NOT NULL
        GROUP BY orderNumberKey
      )
  `);
  await db.$executeRawUnsafe(
    "CREATE UNIQUE INDEX IF NOT EXISTS Issue_orderNumberKey_key ON Issue(orderNumberKey)",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
