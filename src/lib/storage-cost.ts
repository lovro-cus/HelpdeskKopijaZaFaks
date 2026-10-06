/**
 * Strošek skladiščenja v ShipGerman centru. Paket je prvih 14 dni brezplačen,
 * nato ShipGerman zaračuna 0,60 € na paket na dan. Namen zavihka za odpremo je
 * kuriti najstarejšo zalogo, preden se strošek nabere — te funkcije so osnova za
 * prikaz starosti in cene.
 *
 * Ocena iz datuma prihoda; dejanski obračun vodi ShipGerman.
 *
 * Dnevi in tarifa so nastavitev (admin → Nastavitve): ShipGerman cenik lahko
 * spremeni, mi pa zaradi tega ne bi smeli objavljati nove različice. Kdor
 * računa na strežniku, poda nastavitev; privzetek je tu za teste in za mesta,
 * kjer je vrednost samo napis.
 */

import { STORAGE_DEFAULTS, type StorageConfig } from "./config/defaults";

export type { StorageConfig };

export const STORAGE_CURRENCY = "EUR";

const DAY_MS = 86_400_000;

/** Cele dni od prihoda paketa v center do zdaj (nikoli negativno). */
export function storageDays(arrival: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - arrival.getTime()) / DAY_MS));
}

/** Nabrani strošek do zdaj: plačljivi dnevi (nad 14) × dnevna tarifa. */
export function accruedCost(days: number, config: StorageConfig = STORAGE_DEFAULTS): number {
  return Math.max(0, days - config.freeDays) * config.rate;
}

/** Kar ta paket stane danes: 0, dokler je v brezplačnem oknu, sicer dnevna tarifa. */
export function dailyCost(days: number, config: StorageConfig = STORAGE_DEFAULTS): number {
  return days > config.freeDays ? config.rate : 0;
}

/** Koliko dni je paket še brezplačen (vključno z danes), preden začne stražiti
 *  strošek. Pri 14 dneh je to 1 (danes je zadnji brezplačni dan). */
export function freeDaysLeft(days: number, config: StorageConfig = STORAGE_DEFAULTS): number {
  return Math.max(0, config.freeDays + 1 - days);
}

export type AgeTier = "free" | "warning" | "danger";

/** Stopnja za barvo in oznako:
 *  - danger (≥15 dni): že plačljivo → rdeče, s ceno,
 *  - warning (10–14 dni): brezplačno, a kmalu → rumeno, "brezplačno še x dni",
 *  - free (<10 dni): brezplačno → zeleno. */
export function ageTier(days: number, config: StorageConfig = STORAGE_DEFAULTS): AgeTier {
  if (days > config.freeDays) return "danger";
  if (days >= config.warnDays) return "warning";
  return "free";
}
