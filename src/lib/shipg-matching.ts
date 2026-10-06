import { canonicalKey, canonicalParts } from "./catalog-canonical";
import { canDispatchMatch } from "./domain";
import type { ShipGermanParcel } from "./shipgerman-data";
import { normalizeShipGermanTracking } from "./shipgerman-data";
import { storageDays } from "./storage-cost";
import { STORAGE_DEFAULTS } from "./config/defaults";
import { NO_CUTOFF, tooOldToShip, type ShipCutoff } from "./ship-cutoff";

export type MatchItem = { name: string; variant: string | null; qty: number };
export type MatchReturn = {
  id: number;
  trackingNumber: string | null;
  externalParcelId?: string | null;
  items: MatchItem[];
  allocated?: boolean;
  /** Gotovost ujemanja paketa z naročilom; le "high" sme naprej v odpremo.
   *  Namenoma obvezna: prevajalnik tako terja odgovor od vsakega klicatelja,
   *  namesto da bi manjkajoča vrednost tiho pomenila "vse je v redu" ali pa
   *  tiho ustavila vsa ujemanja. */
  matchQuality: string;
};

export type MatchPackage = {
  shipgReturnId: number;
  parcel: ShipGermanParcel;
  items: MatchItem[];
  weightConfidence: "plausible" | "suspicious" | "unknown";
};

export type PackageMatch = { packages: MatchPackage[]; totalWeightGrams: number };

// Deluje na že normaliziranem besedilu (brez šumnikov, male črke). "gurtel" in
// "cintura" ujamemo tudi kot del sestavljenke (npr. "ledergurtel", "cintura in
// pelle"); "belt"/"pas"/"riem" le kot samostojno besedo, da se izognemo lažnim
// zadetkom v drugih imenih.
const FREE_ACCESSORY = /gurtel|cintura|ceinture|(^|\s)(belt|pas|riem)(\s|$)/;

function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Pas je brezplačen dodatek in nikoli ni del identitete menjave — ne glede na
 *  to, kako je poimenovan po trgih (Gürtel/Ledergürtel, Cintura, Belt, pas).
 *  Paket "hlače + pas" se zato ponudi enako kot "hlače". */
export function isIgnorableShipgItem(item: Pick<MatchItem, "name">) {
  if (canonicalParts(item.name, null).productId === "belt") return true;
  return FREE_ACCESSORY.test(normalized(item.name));
}

export function itemKey(item: Pick<MatchItem, "name" | "variant">) {
  // Kanonični ključ združi isti fizični kos med IT in DACH trgom; za izdelke
  // izven kataloga vrne obstoječo točno primerjavo imena in variante.
  return canonicalKey(item.name, item.variant ?? null);
}

function counts(items: MatchItem[]) {
  const result = new Map<string, number>();
  for (const item of items) {
    if (isIgnorableShipgItem(item) || item.qty <= 0) continue;
    const key = itemKey(item);
    result.set(key, (result.get(key) ?? 0) + item.qty);
  }
  return result;
}

function fits(supply: Map<string, number>, remaining: Map<string, number>) {
  for (const [key, qty] of supply) if (qty > (remaining.get(key) ?? 0)) return false;
  return supply.size > 0;
}

function subtract(source: Map<string, number>, amount: Map<string, number>) {
  const result = new Map(source);
  for (const [key, qty] of amount) {
    const next = (result.get(key) ?? 0) - qty;
    if (next > 0) result.set(key, next);
    else result.delete(key);
  }
  return result;
}

function weightConfidence(items: MatchItem[], weightGrams: number): MatchPackage["weightConfidence"] {
  const relevant = items.filter((item) => !isIgnorableShipgItem(item));
  const pantsOnly = relevant.length > 0 && relevant.every((item) => /pants|trousers|hla[cč]e|hose/i.test(item.name));
  if (!pantsOnly) return "unknown";
  const qty = relevant.reduce((sum, item) => sum + item.qty, 0);
  return weightGrams >= qty * 1000 && weightGrams <= (qty + 1) * 1000 ? "plausible" : "suspicious";
}

/** Plačljivi kosi v paketu — pas je brezplačen dodatek in se ne šteje. */
export function packagePieces(items: MatchItem[]): number {
  let pieces = 0;
  for (const qty of counts(items).values()) pieces += qty;
  return pieces;
}

/**
 * Poišče kombinacije celih paketov, ki brez dodatnih plačljivih kosov natančno
 * pokrijejo cilj menjave. `cutoff` izloči pakete, prestare za odpremo
 * (Urejanje → Skladišče); privzeto brez praga, zato ga mora vsak klicatelj v
 * aplikaciji podati izrecno.
 */
export function findExactPackageMatches(
  demandItems: MatchItem[],
  returns: MatchReturn[],
  liveParcels: ShipGermanParcel[],
  limit = 24,
  now: Date = new Date(),
  cutoff: ShipCutoff = NO_CUTOFF,
): PackageMatch[] {
  const demand = counts(demandItems);
  if (demand.size === 0) return [];

  const liveByTracking = new Map<string, ShipGermanParcel>();
  for (const parcel of liveParcels) {
    const tracking = normalizeShipGermanTracking(parcel.trackingNumber);
    if (tracking) liveByTracking.set(tracking, parcel);
  }

  const candidates = returns.flatMap((record): MatchPackage[] => {
    // Rezervirani in dvomljivi paketi ne smejo v predlog: prvi so že obljubljeni,
    // drugi pa bi lahko bili tuj kos. Filter stoji tu, ker skozi to funkcijo teče
    // vsako ujemanje — menjava, odprema in seznam za odpremo.
    if (record.allocated || !canDispatchMatch(record.matchQuality)) return [];
    const tracking = normalizeShipGermanTracking(record.trackingNumber);
    const parcel = record.externalParcelId
      ? liveParcels.find((candidate) => candidate.id === record.externalParcelId)
      : tracking ? liveByTracking.get(tracking) : null;
    const supply = counts(record.items);
    if (!parcel || !fits(supply, demand)) return [];
    if (tooOldToShip(storageDays(parcel.arrivalDate, now), packagePieces(record.items), cutoff)) return [];
    return [{
      shipgReturnId: record.id,
      parcel,
      items: record.items.filter((item) => !isIgnorableShipgItem(item)),
      weightConfidence: weightConfidence(record.items, parcel.weightGrams),
    }];
  });

  // FIFO že pri kandidatih: uredimo po prihodu (najstarejši prvi), da pri
  // omejitvi rezultatov preživijo NAJSTAREJŠI paketi — ne tisti, ki so bili
  // nazadnje vpisani v zalogo (vrstni red vhodne poizvedbe je po stockedAt).
  candidates.sort((a, b) =>
    a.parcel.arrivalDate.getTime() - b.parcel.arrivalDate.getTime()
      || a.parcel.weightGrams - b.parcel.weightGrams);

  const result: PackageMatch[] = [];
  function visit(start: number, remaining: Map<string, number>, chosen: MatchPackage[]) {
    if (result.length >= limit) return;
    if (remaining.size === 0) {
      result.push({
        packages: [...chosen],
        totalWeightGrams: chosen.reduce((sum, item) => sum + item.parcel.weightGrams, 0),
      });
      return;
    }
    for (let index = start; index < candidates.length; index++) {
      const candidate = candidates[index];
      const supply = counts(candidate.items);
      if (!fits(supply, remaining)) continue;
      visit(index + 1, subtract(remaining, supply), [...chosen, candidate]);
    }
  }
  visit(0, demand, []);

  // FIFO: med enakovrednimi ujemanji vzemi tisto z najstarejšim paketom, da se
  // zaloga vrti in kosi ne obtičijo v skladišču.
  const oldestArrival = (match: PackageMatch) =>
    Math.min(...match.packages.map((item) => item.parcel.arrivalDate.getTime()));
  const suspicious = (match: PackageMatch) =>
    match.packages.filter((item) => item.weightConfidence === "suspicious").length;
  // Koliko paketov v kombinaciji je še v brezplačnem oknu (ne stražijo stroška).
  // Manj = več paketov že plačljivih = kombinacija izprazni več drage zaloge.
  const freeWindowCount = (match: PackageMatch) =>
    match.packages.filter((item) => storageDays(item.parcel.arrivalDate, now) <= STORAGE_DEFAULTS.freeDays).length;

  // Vrstni red priporočil:
  //  1. manj paketov (cenejša, enostavnejša odprema),
  //  2. kombinacija, kjer je več paketov ŽE v plačilnem obdobju — najprej
  //     izpraznimo tiste, ki stražijo strošek (npr. dva stara paketa pred
  //     kombinacijo star + svež),
  //  3. FIFO: najstarejši paket naprej,
  //  4. sumljiva teža in skupna teža razrešita preostala izenačenja.
  return result.sort((a, b) =>
    a.packages.length - b.packages.length
      || freeWindowCount(a) - freeWindowCount(b)
      || oldestArrival(a) - oldestArrival(b)
      || suspicious(a) - suspicious(b)
      || a.totalWeightGrams - b.totalWeightGrams,
  );
}

export function exchangeDemand(
  items: { name: string; replacementVariant: string | null; replacementName?: string | null; qty: number; resolution: string }[],
) {
  return items
    .filter((item) => item.resolution === "exchange" && item.replacementVariant)
    // Stranka lahko menja tudi v drug izdelek; iščemo tisto, kar hoče dobiti,
    // ne tistega, kar je vrnila.
    .map((item) => ({ name: item.replacementName || item.name, variant: item.replacementVariant, qty: item.qty }));
}

export function sameItemCounts(left: MatchItem[], right: MatchItem[]) {
  const a = counts(left);
  const b = counts(right);
  return a.size === b.size && [...a].every(([key, qty]) => b.get(key) === qty);
}
