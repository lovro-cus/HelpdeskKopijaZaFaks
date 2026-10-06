import type { WorklistRow } from "./outbound-worklist";

/** Eno ujemanje v posnetku: naročilo + set paketov, ki ga pokrije. */
export type MatchKey = { orderNumber: string; returnIds: string };

/**
 * Ujemanja iz seznama za odpremo. Šteje SAMO sidrne vrstice: naročilo, ki
 * potrebuje dva paketa, je ena priložnost za odpremo, ne dve — člani seta so
 * ista stvar, videna z drugega paketa.
 */
export function outboundMatchKeys(rows: WorklistRow[]): MatchKey[] {
  return rows.flatMap((row) =>
    row.kind === "anchor" && row.order
      ? [{
        orderNumber: row.order.orderNumber,
        returnIds: [...row.order.shipgReturnIds].sort((a, b) => a - b).join(","),
      }]
      : []);
}

/**
 * Katera ujemanja so nova glede na prejšnji posnetek. Identiteta je NAROČILO,
 * ne set paketov: če isto naročilo naslednjič pokrije drug paket, priložnost ni
 * nova — nova je takrat, ko naročila prej sploh ni bilo mogoče odpremiti.
 */
export function newMatchOrders(current: MatchKey[], known: Iterable<string>): Set<string> {
  const seen = new Set(known);
  return new Set(current.filter((match) => !seen.has(match.orderNumber)).map((match) => match.orderNumber));
}
