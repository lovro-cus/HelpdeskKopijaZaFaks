import type { Settings } from "./config/defaults";

/**
 * Prag starosti za odpremo. ShipGerman obračuna skladiščenje paketa (po 14
 * prostih dneh) šele, ko paket odpošljemo — star paket s seboj odnese ves
 * nabrani dolg. Paketov, starejših od praga, zato ne ponudimo nikjer: ne na
 * seznamu za odpremo, ne pri naročilu, ne pri menjavi na ticketu.
 *
 * Izjema so lahko redka ujemanja (paket z več kosi natanko pokrije naročilo):
 * takšna priložnost pride morda enkrat na teden, zato jo nastavitev lahko
 * ohrani ne glede na starost.
 *
 * Datoteka je čista (brez baze), da jo uporabljata ujemanje in klient.
 */

/** Paket z vsaj toliko plačljivimi kosi je "redek" (glej rare-match.ts). */
export const RARE_PACKAGE_PIECES = 2;

export type ShipCutoff = {
  /** Največja starost v dneh, ki jo še pošiljamo; 0 = brez praga. */
  maxDays: number;
  /** Prag ne velja za pakete z več kosi (redka ujemanja). */
  rareExempt: boolean;
};

export const NO_CUTOFF: ShipCutoff = { maxDays: 0, rareExempt: true };

export function shipCutoff(settings: Pick<Settings, "shipMaxAgeDays" | "shipMaxAgeRareExempt">): ShipCutoff {
  return { maxDays: settings.shipMaxAgeDays, rareExempt: settings.shipMaxAgeRareExempt === 1 };
}

/** Ali je paket te starosti in s toliko plačljivimi kosi prestar za odpremo. */
export function tooOldToShip(days: number, pieces: number, cutoff: ShipCutoff): boolean {
  if (cutoff.maxDays <= 0 || days <= cutoff.maxDays) return false;
  return !(cutoff.rareExempt && pieces >= RARE_PACKAGE_PIECES);
}
