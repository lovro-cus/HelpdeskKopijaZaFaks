/** Zapolni enolične ključe starih naročil po nadgradnji sheme. */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const normalize = (value) => value
  .normalize("NFKC")
  .trim()
  .replace(/^#/, "")
  .replace(/\s+/g, "")
  .toUpperCase();

async function main() {
  const issues = await db.issue.findMany({
    select: { id: true, key: true, orderNumber: true, orderNumberKey: true, status: true },
    orderBy: { id: "asc" },
  });
  const groups = new Map();

  for (const issue of issues) {
    const normalized = normalize(issue.orderNumber);
    const group = groups.get(normalized) ?? [];
    group.push(issue);
    groups.set(normalized, group);
  }

  let changed = 0;
  let legacyDuplicates = 0;
  const desiredKeys = new Map();

  for (const [normalized, group] of groups) {
    // Obstoječi pravilni ključ ima prednost. Sicer izberemo odprto naročilo,
    // nato najstarejši zapis. Ostalih zgodovinskih duplikatov ne brišemo.
    const canonical =
      group.find((issue) => issue.orderNumberKey === normalized) ??
      group.find((issue) => issue.status !== "closed") ??
      group[0];

    for (const issue of group) desiredKeys.set(issue.id, issue.id === canonical.id ? normalized : null);

    if (group.length > 1) {
      legacyDuplicates += group.length - 1;
      console.warn(
        `[backfill-order-numbers] Ohranjeni stari duplikati za ${canonical.orderNumber}: ` +
          group.map((issue) => issue.key).join(", "),
      );
    }
  }

  // Najprej sprostimo zastarele ključe, šele nato nastavimo nove. Tako se tudi
  // pri delno izvedeni starejši migraciji ne zaletimo v enolični indeks.
  for (const issue of issues) {
    const desired = desiredKeys.get(issue.id);
    if (issue.orderNumberKey === null || issue.orderNumberKey === desired) continue;
    await db.issue.update({ where: { id: issue.id }, data: { orderNumberKey: null } });
    issue.orderNumberKey = null;
    changed++;
  }

  for (const issue of issues) {
    const desired = desiredKeys.get(issue.id);
    if (desired === null || issue.orderNumberKey === desired) continue;
    await db.issue.update({ where: { id: issue.id }, data: { orderNumberKey: desired } });
    changed++;
  }

  console.log(
    `[backfill-order-numbers] Posodobljenih ključev: ${changed}; ` +
      `ohranjenih starih duplikatov: ${legacyDuplicates}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
