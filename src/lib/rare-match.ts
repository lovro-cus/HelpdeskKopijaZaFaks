import { NO_CUTOFF, RARE_PACKAGE_PIECES, type ShipCutoff } from "./ship-cutoff";
import { findExactPackageMatches, packagePieces, type MatchItem, type MatchReturn, type PackageMatch } from "./shipg-matching";
import type { ShipGermanParcel } from "./shipgerman-data";

export { packagePieces, RARE_PACKAGE_PIECES };

/**
 * Redko ujemanje: naročilo, ki ga natanko pokrije vrnjen paket z VEČ kosi
 * (dvoje hlač, hlače in jakna …). Paket z enim kosom hitro najde naročilo;
 * paket z dvema le takrat, ko nekdo naroči prav ta dva kosa — morda enkrat na
 * teden. Takšne priložnosti ne smemo zamuditi, zato o njih obvestimo ljudi.
 */
export type RareMatchOrder = {
  orderNumber: string;
  customerCountryCode: string | null;
  items: MatchItem[];
};

export function isRareMatch(match: PackageMatch): boolean {
  return match.packages.some((pkg) => packagePieces(pkg.items) >= RARE_PACKAGE_PIECES);
}

/**
 * Najboljše redko ujemanje za naročilo ali null. Nemška naročila odpadejo iz
 * istega razloga kot na seznamu za odpremo: tam zalogo že črpamo lokalno.
 */
export function rareMatchFor(
  order: RareMatchOrder,
  returns: MatchReturn[],
  live: ShipGermanParcel[],
  now: Date = new Date(),
  cutoff: ShipCutoff = NO_CUTOFF,
): PackageMatch | null {
  if (order.customerCountryCode === "DE") return null;
  return findExactPackageMatches(order.items, returns, live, 24, now, cutoff).find(isRareMatch) ?? null;
}

export type PackageOrderMatch<O extends RareMatchOrder> = { order: O; match: PackageMatch; rare: boolean };

/**
 * Obratna smer: katera odprta naročila lahko pokrije ravnokar vpisan paket
 * (sam ali v setu z drugimi). Za vsako naročilo vzame najboljše ujemanje, ki ta
 * paket vsebuje. Redka ujemanja so na vrhu, nato tista z manj paketi.
 */
export function ordersForPackage<O extends RareMatchOrder>(
  shipgReturnId: number,
  orders: O[],
  returns: MatchReturn[],
  live: ShipGermanParcel[],
  now: Date = new Date(),
  cutoff: ShipCutoff = NO_CUTOFF,
): PackageOrderMatch<O>[] {
  if (!returns.some((record) => record.id === shipgReturnId)) return [];
  return orders
    .flatMap((order) => {
      if (order.customerCountryCode === "DE") return [];
      const match = findExactPackageMatches(order.items, returns, live, 24, now, cutoff)
        .find((candidate) => candidate.packages.some((pkg) => pkg.shipgReturnId === shipgReturnId));
      return match ? [{ order, match, rare: isRareMatch(match) }] : [];
    })
    .sort((a, b) => Number(b.rare) - Number(a.rare) || a.match.packages.length - b.match.packages.length);
}

/** Identiteta obvestila: isto naročilo z istim setom paketov se javi enkrat. */
export function rareMatchReturnIds(match: PackageMatch): string {
  return match.packages.map((pkg) => pkg.shipgReturnId).sort((a, b) => a - b).join(",");
}
