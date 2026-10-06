import "server-only";

import { db } from "./db";
import { newMatchOrders, outboundMatchKeys } from "./outbound-match-diff";
import type { WorklistRow } from "./outbound-worklist";

export type MatchDiff = {
  /** Koliko naročil je trenutno pokritih z zalogo. */
  total: number;
  /** Koliko od teh je novih od zadnje osvežitve. */
  fresh: number;
};

/**
 * Zapiše trenutna ujemanja kot posnetek in vrne, koliko jih je novih glede na
 * prejšnji posnetek. Kliče se SAMO ob ročni osvežitvi — zato "novo" pomeni
 * natanko "prišlo od zadnjega klika na Osveži", kar je tisto, kar uporabnik
 * pričakuje. Izris strani posnetka ne piše (GET ne sme imeti stranskih učinkov).
 */
export async function recordOutboundMatches(rows: WorklistRow[]): Promise<MatchDiff> {
  const current = outboundMatchKeys(rows);
  const known = (await db.outboundMatchSeen.findMany({ select: { orderNumber: true } })).map((row) => row.orderNumber);
  const fresh = newMatchOrders(current, known);
  const now = new Date();

  await db.$transaction([
    ...current.map((match) => db.outboundMatchSeen.upsert({
      where: { orderNumber: match.orderNumber },
      create: { orderNumber: match.orderNumber, returnIds: match.returnIds, fresh: true, lastSeenAt: now },
      update: { returnIds: match.returnIds, fresh: fresh.has(match.orderNumber), lastSeenAt: now },
    })),
    // Ujemanja, ki jih ni več (rezervirana, odpremljena, naročilo preklicano),
    // izpustimo iz posnetka — če se vrnejo, so spet nova, in prav je tako.
    db.outboundMatchSeen.deleteMany({ where: { orderNumber: { notIn: current.map((match) => match.orderNumber) } } }),
  ]);

  return { total: current.length, fresh: fresh.size };
}

/** Naročila, ki so se kot ujemanje pojavila ob zadnji osvežitvi — za oznako "novo". */
export async function freshMatchOrders(): Promise<Set<string>> {
  const rows = await db.outboundMatchSeen.findMany({ where: { fresh: true }, select: { orderNumber: true } });
  return new Set(rows.map((row) => row.orderNumber));
}
