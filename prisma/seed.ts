/**
 * Izmišljeni demo podatki za kopijo za faks. Nobena oseba, naslov ali
 * sledilna številka ni resnična.
 *
 *   npm run db:seed              (POBRIŠE obstoječe podatke)
 *   npm run db:seed -- --if-empty   samo, če je baza prazna (zagon zabojnika)
 *
 * Geslo vseh računov: DEMO_PASSWORD iz okolja, sicer Kroj-Demo-2026.
 *
 * Za produkcijo uporabi `npm run db:bootstrap` — ta ustvari samo admina.
 */
import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/password";
import { GUEST_USERNAME, VUI_USERNAME } from "../src/lib/guest";
import {
  ANA,
  CARRIERS,
  HAMZA,
  SARA,
  STOCK,
  TILEN,
  ago,
  createSeedIssue,
  issueSeeds,
  seedIssueMail,
  seedIssueOutcome,
} from "../src/lib/demo-seed";

const db = new PrismaClient();
const HOUR = 3_600_000;

async function main() {
  if (process.argv.includes("--if-empty") && (await db.user.count()) > 0) {
    console.log("[seed] Baza že ima uporabnike — ne delam ničesar.");
    return;
  }

  await db.demoMail.deleteMany();
  await db.inboxConversation.deleteMany();
  await db.inboxSyncState.deleteMany();
  await db.shipgReturn.deleteMany();
  await db.shipGermanCachedParcel.deleteMany();
  await db.shipGermanSyncState.deleteMany();
  await db.attachment.deleteMany();
  await db.event.deleteMany();
  await db.issue.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  const password = process.env.DEMO_PASSWORD?.trim() || "Kroj-Demo-2026";
  const demoPw = await hashPassword(password);

  const users = await Promise.all([
    db.user.create({
      data: {
        username: "Admin",
        name: "Administrator",
        passwordHash: demoPw,
        level: 3,
        isAdmin: true,
        color: "#0071e3",
        locale: "sl",
      },
    }),
    db.user.create({
      data: {
        username: GUEST_USERNAME,
        name: "Gost (ogled)",
        // Admin za ogled upravljanja uporabnikov; administratorskih računov ne sme spreminjati (src/lib/guest.ts).
        isAdmin: true,
        // Da gost vidi tudi strani Urejanje (zaloga, izdelki, jeziki, zadovoljstvo).
        permissions: "warehouse,products,languages,satisfaction",
        passwordHash: await hashPassword(process.env.GUEST_PASSWORD?.trim() || "Gost-Kroj-2026"),
        level: 3,
        color: "#5e5ce6",
        locale: "sl",
      },
    }),
    db.user.create({
      data: {
        username: VUI_USERNAME,
        name: "VUI (ogled)",
        // Kot gost: ogled za predstavitev pri VUI, s preprostim geslom vui.
        isAdmin: true,
        permissions: "warehouse,products,languages,satisfaction",
        passwordHash: await hashPassword("vui"),
        level: 3,
        color: "#ff9f0a",
        locale: "sl",
      },
    }),
    db.user.create({
      data: {
        username: "nina",
        name: ANA,
        passwordHash: demoPw,
        level: 1,
        mustChangePw: true,
        locale: "sl",
        color: "#34c759",
      },
    }),
    db.user.create({
      data: {
        username: "ali",
        name: HAMZA,
        passwordHash: demoPw,
        level: 1,
        mustChangePw: true,
        locale: "sl",
        color: "#ff9500",
      },
    }),
    db.user.create({
      data: {
        username: "eva",
        name: SARA,
        passwordHash: demoPw,
        level: 2,
        mustChangePw: true,
        locale: "sl",
        color: "#af52de",
      },
    }),
    db.user.create({
      data: {
        username: "marko",
        name: TILEN,
        passwordHash: demoPw,
        level: 3,
        mustChangePw: true,
        locale: "sl",
        color: "#ff2d55",
      },
    }),
  ]);

  const id = new Map(users.map((u) => [u.name, u.id]));

  const seeds = issueSeeds();
  for (const [index, s] of seeds.entries()) {
    await createSeedIssue(db, index + 1, s, id);
  }

  const stock = await seedStock(id);
  const talk = await seedTalk(id);

  console.log(`Ustvarjenih ${seeds.length} naročil, ${stock} paketov v skladišču in ${users.length} uporabnikov.`);
  console.log(`Pošta: ${talk.threads} pogovorov · ocene: ${talk.scores} · dobavitelj: ${talk.supplier} naročil.`);
  console.log("Prijava: Admin (geslo: DEMO_PASSWORD ali Kroj-Demo-2026)");
  console.log("Demo računi: nina, ali, eva, marko — isto geslo (zahtevajo zamenjavo).");
  console.log(`Račun za ogled: ${GUEST_USERNAME} (geslo: GUEST_PASSWORD ali Gost-Kroj-2026).`);
}

// --- skladišče (podatki: src/lib/demo-seed.ts) ------------------------------

async function seedStock(userId: Map<string, string>): Promise<number> {
  const verifier = userId.get(SARA);
  let parcelNo = 0;
  for (const [index, row] of STOCK.entries()) {
    const issue = row.issueOrder
      ? await db.issue.findFirst({ where: { orderNumber: row.issueOrder }, include: { items: true } })
      : null;
    // Stranka na zapisu je ista kot na ticketu.
    const customer = issue?.customerName ?? row.customer;
    const arrived = row.status !== "expected";
    const tracking = issue?.returnTracking ?? `TT${String(300000000 + index * 7717).padStart(9, "0")}SI`;
    let parcelId: string | null = null;
    if (arrived) {
      parcelNo++;
      parcelId = `SG-${410000 + parcelNo * 37}`;
      await db.shipGermanCachedParcel.create({
        data: {
          id: parcelId,
          arrivalDate: ago(row.daysAgo),
          barcode: `KR${880000 + parcelNo * 13}`,
          carrier: CARRIERS[index % CARRIERS.length],
          lengthMm: 300 + (index % 4) * 40,
          widthMm: 220 + (index % 3) * 30,
          heightMm: 60 + (index % 5) * 20,
          sender: customer,
          trackingNumber: tracking,
          weightGrams: 350 + row.items.length * 400 + (index % 4) * 90,
          location: row.location ?? "A-00-0",
          lastSeenAt: new Date(),
        },
      });
    }
    await db.shipgReturn.create({
      data: {
        orderNumber: row.order,
        customerName: customer,
        trackingNumber: tracking,
        issueId: issue?.id ?? null,
        shipgermanParcelId: parcelId,
        shipgermanMatchSource: parcelId ? "automatic" : null,
        shipgermanLinkedAt: parcelId ? ago(row.daysAgo) : null,
        status: row.status,
        receivedAt: arrived ? ago(row.daysAgo) : null,
        stockedAt: row.status === "stocked" ? ago(row.daysAgo - 1) : null,
        createdById: verifier,
        verifiedById: row.status === "stocked" ? verifier : null,
        createdAt: ago(row.daysAgo + 3),
        items: {
          create: row.items.map((item, position) => ({
            name: item.name,
            variant: item.variant,
            expectedQty: 1,
            receivedQty: row.status === "stocked" ? 1 : 0,
            condition: row.status === "stocked" ? "good" : "pending",
            position,
            issueItemId:
              issue?.items.find((own) => own.name === item.name && (own.variant ?? null) === item.variant)?.id ?? null,
          })),
        },
      },
    });
  }

  // Dva paketa brez zapisa: eden še ni identificiran, drugega ni mogoče.
  await db.shipGermanCachedParcel.createMany({
    data: [
      { id: "SG-419901", arrivalDate: ago(3), barcode: "KR899001", carrier: "GLS", lengthMm: 320, widthMm: 240, heightMm: 80, sender: "Neznan pošiljatelj", trackingNumber: "TT555000111SI", weightGrams: 720, location: "IN-03", lastSeenAt: new Date() },
      { id: "SG-419902", arrivalDate: ago(31), barcode: "KR899002", carrier: "DHL", lengthMm: 280, widthMm: 200, heightMm: 60, sender: "", trackingNumber: null, weightGrams: 410, location: "C-01-1", unidentifiable: true, lastSeenAt: new Date() },
    ],
  });
  await db.shipGermanSyncState.create({ data: { key: "inventory", status: "ok", fetchedAt: new Date() } });
  return parcelNo + 2;
}


// --- pogovori, ocene, dobavitelj ---------------------------------------------

async function seedTalk(userId: Map<string, string>): Promise<{ threads: number; scores: number; supplier: number }> {
  // Pošta in Prejeto: vsak ticket s stranko dobi svojo nit (po vrstnem redu ticketov).
  const issues = await db.issue.findMany({
    where: { customerEmail: { not: null } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  for (const [index, issue] of issues.entries()) {
    await seedIssueMail(db, issue.id, index, userId);
  }
  let threads = issues.length;

  // Dva maila brez ticketa: brez številke naročila in neznana stranka.
  const loose = [
    { thread: "demo-t900", name: "Vesna Neznana", email: "vesna.neznana@example.com", subject: "Vprašanje o velikostih",
      body: "Pozdravljeni,\n\nkakšna je razlika med S in M pri chino hlačah? Visoka sem 168 cm.\n\nVesna", hours: 5 },
    { thread: "demo-t901", name: "Tom Unknown", email: "tom.unknown@example.com", subject: "Return?",
      body: "Hi, I bought a hoodie as a gift but I don't have the order number. Can I still return it?\n\nTom", hours: 20 },
  ];
  for (const mail of loose) {
    const id = `${mail.thread}-m1`;
    const sentAt = new Date(Date.now() - mail.hours * HOUR);
    await db.demoMail.create({
      data: { id, threadId: mail.thread, sentAt, fromAddr: `${mail.name} <${mail.email}>`, toAddr: "Kroj podpora <podpora@kroj.example>", subject: mail.subject, body: mail.body, direction: "incoming" },
    });
    await db.inboxConversation.create({
      data: {
        gmailThreadId: mail.thread, unlinkedReason: "no_order", subject: mail.subject, customerEmail: mail.email, customerName: mail.name,
        lastMessageId: id, lastMessageAt: sentAt, lastSnippet: mail.body.replace(/\s+/g, " ").slice(0, 140), lastDirection: "incoming",
        messageCount: 1, status: "open",
      },
    });
    threads++;
  }
  await db.inboxSyncState.create({ data: { id: "gmail", lastSyncedAt: new Date() } });

  // Ocene zadovoljstva in naročila pri dobavitelju
  let scores = 0;
  let supplier = 0;
  for (const issue of await db.issue.findMany({ select: { id: true } })) {
    const outcome = await seedIssueOutcome(db, issue.id, userId);
    if (outcome.scored) scores++;
    if (outcome.supplier) supplier++;
  }

  return { threads, scores, supplier };
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
