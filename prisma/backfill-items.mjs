// Prenese star zapis "en artikel na naročilo" (Issue.itemName/itemSize/itemQty)
// v tabelo IssueItem. Teče ob vsakem zagonu vsebnika in ne naredi nič, kadar
// ni česa prenesti — zato je varno, da ostane v CMD.
//
// Stari stolpci se pri tem ne brišejo: dokler jih ne odstranimo iz sheme,
// so zadnja varovalka, če bi bilo treba prenos ponoviti.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

try {
  const legacy = await db.issue.findMany({
    where: { itemName: { not: null }, items: { none: {} } },
    select: { id: true, itemName: true, itemSize: true, itemQty: true, amount: true, type: true },
  });

  if (legacy.length === 0) {
    console.log("Prenos artiklov: ni česa prenesti.");
  } else {
    await db.issueItem.createMany({
      data: legacy.map((issue) => ({
        issueId: issue.id,
        name: issue.itemName,
        variant: issue.itemSize,
        qty: issue.itemQty && issue.itemQty > 0 ? issue.itemQty : 1,
        amount: issue.amount,
        // Vrsta težave je edino, kar o starem zapisu vemo: pri vračilih je
        // artikel sporen, drugod je zabeležen le kot kontekst.
        resolution:
          issue.type === "refund" || issue.type === "quality"
            ? "refund"
            : issue.type === "exchange"
              ? "exchange"
              : "none",
        position: 0,
      })),
    });
    console.log(`Prenos artiklov: prenesenih ${legacy.length} naročil.`);
  }
} catch (error) {
  // Prenos ne sme preprečiti zagona aplikacije.
  console.error("Prenos artiklov ni uspel:", error);
} finally {
  await db.$disconnect();
}
