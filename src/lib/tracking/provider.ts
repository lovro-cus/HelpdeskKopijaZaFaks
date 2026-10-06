/**
 * Vmesnik do ponudnika sledenja.
 *
 * Namenoma brez "server-only": tu so samo tipi in preverba oblike številke,
 * nobene skrivnosti — tako je preverjanje vhoda testljivo brez Next okolja.
 *
 * Ostala koda ne ve, kdo je za tem: če 17TRACK zamenjamo (npr. za Parcels
 * App), se predela samo ta mapa. Zato tu ni nobenega polja, ki bi bilo
 * značilno za enega ponudnika — statusi so preslikani v naš besednjak
 * (glej parcelOutcome v domain.ts), ne obratno.
 */

/** Stanje pošiljke, kakor ga vidi ponudnik. */
export type ParcelSnapshot = {
  number: string;
  carrier: number | null;
  carrierName: string | null;
  /** Surov status ponudnika; preslika ga parcelOutcome. */
  providerStatus: string;
  lastEventAt: Date | null;
  lastEventText: string | null;
};

/**
 * Zakaj registracija ni uspela.
 * `duplicate` ni napaka — številko že spremljamo in to je vse, kar hočemo.
 */
export type RegisterError = "duplicate" | "no_carrier" | "quota" | "invalid" | "failed";

export type RegisterResult =
  | { number: string; ok: true; carrier: number | null }
  | { number: string; ok: false; error: RegisterError };

export type TrackingTarget = { number: string; carrier: number | null };

export interface TrackingProvider {
  readonly name: string;
  configured(): boolean;
  /** Sprejme številke v spremljanje. Ena številka = ena kvota. */
  register(numbers: string[]): Promise<RegisterResult[]>;
  /** Prebere zadnje znano stanje. Znotraj obdobja spremljanja je brezplačno. */
  fetch(targets: TrackingTarget[]): Promise<ParcelSnapshot[]>;
  /** Sproži sveže preverjanje pri prevozniku; uporablja se samo na zahtevo človeka. */
  fetchFresh(targets: TrackingTarget[]): Promise<ParcelSnapshot[]>;
}

/** Oblika tracking številke, preden jo sploh pošljemo naprej. */
export const TRACKING_NUMBER_RE = /^[A-Za-z0-9][A-Za-z0-9-]{5,49}$/;

/**
 * Presledke odstranimo, ker jih prevozniki v mailih pišejo za berljivost
 * ("CP 092 195 155 IT"). Zahtevana števka pa prepreči, da bi kos besedila iz
 * maila obveljal za tracking številko.
 */
export function normalizeNumber(raw: string): string | null {
  const number = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!TRACKING_NUMBER_RE.test(number)) return null;
  return /\d/.test(number) ? number : null;
}
