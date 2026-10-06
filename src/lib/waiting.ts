import "server-only";

import { db } from "./db";

/**
 * Vrne v aktivno vrsto vsa naročila, katerih čakanje ("čaka do …") je poteklo.
 * Brez tega bi naročilo obtičalo v statusu "waiting" tudi po roku in nikoli ne
 * bi prišlo nazaj v delo. Kliče ga urnik (v ozadju) in seznam naročil ob
 * nalaganju, da se zbudi takoj, ko ga kdo pogleda.
 *
 * Rok je hkrati varovalo za čakanje na odgovor stranke: če odgovora do roka ni,
 * naročilo pride nazaj v delo in tisti, ki ga obravnava, dobi obvestilo — sicer
 * bi se vrnilo tiho in bi ga nihče ne opazil.
 *
 * Vrne število zbujenih naročil. Dogodek zabeleži kot sistemski (brez avtorja),
 * v istem slogu kot ročni "Nadaljuj".
 */
export async function wakeDueWaitingIssues(now: Date = new Date()): Promise<number> {
  const due = await db.issue.findMany({
    where: { status: "waiting", waitingUntil: { lte: now } },
    select: { id: true, key: true, orderNumber: true, assigneeId: true, level: true, waitingReplySince: true },
  });
  if (due.length === 0) return 0;

  const ids = due.map((issue) => issue.id);
  await db.$transaction([
    db.issue.updateMany({
      where: { id: { in: ids } },
      // Tudi straža za odgovor se izteče z rokom: naročilo ni več v čakanju,
      // zato nima več smisla iskati odgovora zanj.
      data: { status: "open", waitingUntil: null, waitingReplySince: null },
    }),
    // Samodejno zbujanje ob poteku roka — brez avtorja, zato se v niti prikaže
    // kot "System" (isti slog kot ročni "Nadaljuj", ki ima avtorja). Polje pove,
    // zakaj se je zbudilo.
    db.event.createMany({
      data: due.map((issue) => ({
        issueId: issue.id,
        kind: "status",
        field: issue.waitingReplySince ? "deadline_no_reply" : "deadline_passed",
        fromValue: "waiting",
        toValue: "open",
      })),
    }),
  ]);

  await notifyDeadline(due);
  return ids.length;
}

type WokenIssue = { id: number; key: string; orderNumber: string; assigneeId: string | null; level: number };

/**
 * Javi, da je rok potekel in je naročilo spet v delu — prevzemniku, pri
 * naročilu brez prevzemnika pa nivoju, ki ga ima v vrsti.
 *
 * Obvestila uvozimo dinamično: statični uvoz bi mailer potegnil v graf, ki ga
 * gradi instrumentacija (urnik). Napaka pošiljanja ne sme podreti zbujanja —
 * naročilo je že v delu in to je glavno.
 */
async function notifyDeadline(issues: WokenIssue[]): Promise<void> {
  try {
    const { notify } = await import("./notifications");
    for (const issue of issues) {
      const recipients = issue.assigneeId
        ? [issue.assigneeId]
        : (
            await db.user.findMany({
              where: { active: true, level: Math.max(issue.level, 1) },
              select: { id: true },
            })
          ).map((user) => user.id);
      for (const recipientId of recipients) {
        await notify({
          kind: "deadline",
          recipientId,
          issueId: issue.id,
          issueKey: issue.key,
          orderNumber: issue.orderNumber,
          actorName: "Desk",
        });
      }
    }
  } catch (error) {
    console.error("[Waiting] Deadline notification crashed", error);
  }
}

/**
 * Vrne v delo naročila, ki čakajo na odgovor stranke in je ta medtem prispel.
 *
 * Preverjamo pri Gmailu, ker se prejeta pošta pri nas ne shranjuje — pogovor se
 * bere na zahtevo. Za vsak čakajoč ticket gre ena poceni poizvedba (obstaja
 * sporočilo od te stranke po začetku čakanja?), zato je cena sorazmerna številu
 * čakajočih, ne velikosti nabiralnika.
 *
 * Napake Gmaila ne smejo ustaviti urnika: ticket preprosto ostane v čakanju do
 * naslednjega tika.
 */
export async function wakeRepliedWaitingIssues(): Promise<number> {
  const waiting = await db.issue.findMany({
    where: {
      status: "waiting",
      waitingReplySince: { not: null },
      customerEmail: { not: null },
    },
    select: { id: true, customerEmail: true, waitingReplySince: true },
  });
  if (waiting.length === 0) return 0;

  // Gmail naložimo šele tu: statični uvoz bi potegnil node:crypto v graf, ki ga
  // gradi instrumentacija (urnik), in razbil gradnjo. Ob tem se koda naloži le,
  // kadar kdo res čaka na odgovor.
  const { GmailError, hasReplySince } = await import("./gmail");

  let woken = 0;
  for (const issue of waiting) {
    if (!issue.customerEmail || !issue.waitingReplySince) continue;
    let replied: boolean;
    try {
      replied = await hasReplySince({ customerEmail: issue.customerEmail, since: issue.waitingReplySince });
    } catch (error) {
      // Nedosegljiv ali nenastavljen Gmail: pustimo v čakanju, poskusimo znova.
      if (!(error instanceof GmailError)) console.error("[Waiting] Reply check crashed", error);
      continue;
    }
    if (!replied) continue;

    await db.$transaction([
      db.issue.update({
        where: { id: issue.id },
        data: { status: "open", waitingUntil: null, waitingReplySince: null },
      }),
      // Brez avtorja (sistemski dogodek); polje pove, zakaj se je zbudil.
      db.event.create({
        data: { issueId: issue.id, kind: "status", field: "reply_received", fromValue: "waiting", toValue: "open" },
      }),
    ]);
    woken += 1;
  }
  return woken;
}
