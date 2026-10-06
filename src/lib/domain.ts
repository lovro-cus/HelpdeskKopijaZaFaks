/** Skupne domenske vrednosti — brez dostopa do baze, uporabno tudi na klientu. */

import { PARCEL_DEFAULTS, type ParcelConfig } from "./config/defaults";

/**
 * Vgrajene vrste tiketov. Od uvedbe šifranta v adminu je to samo zasnova, s
 * katero se prazna baza napolni (src/lib/config/server.ts) — od tam naprej
 * odloča baza. Nove vrste se dodajajo v adminu, ne tukaj.
 *
 * Barve so sklici na CSS spremenljivke, ne trde vrednosti: vsaka ima v
 * globals.css par za svetlo in temno temo, oba preverjena na ≥4.5:1.
 */
export const ISSUE_TYPES = [
  { id: "refund", label: "Refund", color: "var(--type-refund)" },
  { id: "exchange", label: "Exchange", color: "var(--type-exchange)" },
  { id: "cancel", label: "Cancellation", color: "var(--type-cancel)" },
  { id: "address", label: "Address", color: "var(--type-address)" },
  { id: "tracking", label: "Tracking", color: "var(--type-tracking)" },
  { id: "unfulfilled", label: "Unfulfilled", color: "var(--type-unfulfilled)" },
  { id: "quality", label: "Quality", color: "var(--type-quality)" },
  { id: "other", label: "Other", color: "var(--type-other)" },
  { id: "unsorted", label: "Unsorted", color: "var(--type-other)" },
] as const;

/**
 * Sistemski ticketi imajo svojo politiko. Desk jih odpre sam (npr. iz
 * preverjenega maila), vrste pa iz besedila ne ugiba — to naredi človek.
 * Dokler jih nihče ne prevzame ali preda naprej, stojijo v sistemski vrsti
 * (nivo 0), ki ni nivo nobene osebe: ne pridejo v »Moj nivo« prvega nivoja in
 * ne v »Vsa odprta«, ampak v svoj pogled.
 */
export const SYSTEM_LEVEL = 0;
export const SYSTEM_TYPE = "unsorted";

/** Nivo, ki prevzame neuspešno dostavo (ticket iz sistemske vrste ali arhiva). */
export const DELIVERY_FAILURE_LEVEL = 3;

/** Nivo, ki se dogovarja z dobaviteljem, kadar želenega kosa ni v zalogi. */
export const SUPPLIER_LEVEL = 3;

export type FailedDeliveryMove = { level: number; clearAssignee: boolean; reopened: boolean };

/**
 * Kam gre ticket, ko Shopify javi neuspešno dostavo:
 * - zaprt (arhiviran) se odpre in gre v vrsto tretjega nivoja;
 * - v sistemski vrsti gre prav tako na tretji nivo;
 * - odprt ostane pri svojem nivoju in prevzemniku; če je čakal, se zbudi.
 * Status je po premiku vedno "open".
 */
export function failedDeliveryMove(ticket: { status: string; level: number }): FailedDeliveryMove {
  if (ticket.status === "closed") return { level: DELIVERY_FAILURE_LEVEL, clearAssignee: true, reopened: true };
  if (ticket.level === SYSTEM_LEVEL) return { level: DELIVERY_FAILURE_LEVEL, clearAssignee: true, reopened: ticket.status !== "open" };
  return { level: ticket.level, clearAssignee: false, reopened: ticket.status !== "open" };
}

/** Kratka oznaka nivoja za dnevnik: L1, L2 … in SYS za sistemsko vrsto. */
export function levelCode(level: number): string {
  return level === SYSTEM_LEVEL ? "SYS" : `L${level}`;
}

/**
 * Kaj pomeni vnos tega človeka v ta ticket:
 * - "mine" — ticket ima prevzet sam;
 * - "claim" — ticket čaka v vrsti njegovega nivoja, z vnosom ga prevzame;
 * - "unsorted" — ticket je v sistemski vrsti, ki ni vrsta nobenega nivoja;
 * - "outsider" — vnos nekoga, ki s ticketom nima opravka.
 *
 * Ticket brez prevzemnika ni ničji: predan je nivoju in ta nivo ga ima v svoji
 * vrsti. Zato je vnos s tega nivoja prevzem, vnos kogarkoli drugega pa zunanji
 * vnos — enako kot pri ticketu, ki ga ima prevzetega nekdo drug. Sistemska
 * vrsta je izjema: dokler ticket čaka na razvrstitev, ni nivojev in vanj sme
 * pisati vsak, ne da bi ga s tem prevzel.
 */
export type EntryStance = "mine" | "claim" | "unsorted" | "outsider";

export function entryStance(
  issue: { assigneeId: string | null; level: number },
  user: { id: string; level: number },
): EntryStance {
  if (issue.assigneeId !== null) return issue.assigneeId === user.id ? "mine" : "outsider";
  if (issue.level === SYSTEM_LEVEL) return "unsorted";
  return issue.level === user.level ? "claim" : "outsider";
}

export type IssueTypeId = (typeof ISSUE_TYPES)[number]["id"];

export const STATUSES = [
  { id: "open", label: "In progress", color: "var(--status-open)" },
  { id: "waiting", label: "Waiting", color: "var(--status-waiting)" },
  { id: "manual", label: "Manual assistance", color: "var(--status-manual)" },
  { id: "closed", label: "Closed", color: "var(--status-closed)" },
] as const;

/** Vgrajene prioritete — prav tako samo zasnova za prazno bazo. */
export const PRIORITIES = [
  { id: "urgent", label: "Urgent", color: "var(--prio-urgent)" },
  { id: "high", label: "High", color: "var(--prio-high)" },
  { id: "medium", label: "Medium", color: "var(--prio-medium)" },
  { id: "low", label: "Low", color: "var(--prio-low)" },
] as const;

/**
 * Predlagani roki čakanja. Rok je pri čakanju na odgovor stranke varovalo:
 * če odgovora do tedaj ni, se naročilo samo vrne v delo (lib/waiting.ts) —
 * zato mora biti nastavljiv v enem kliku, ne z iskanjem datuma v koledarju.
 */
export const WAIT_PRESETS = [
  { id: "3d", days: 3 },
  { id: "1w", days: 7 },
  { id: "2w", days: 14 },
  { id: "1m", days: 30 },
] as const;

export type WaitPresetId = (typeof WAIT_PRESETS)[number]["id"];

/**
 * Dan v obliki, ki jo bere <input type="date"> — po lokalnem koledarju.
 * toISOString() sam bi v naši časovni coni zvečer vrnil že naslednji dan.
 */
export function isoDay(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Rok čez toliko dni, kot dan za obrazec. */
export function waitDeadline(days: number, from: Date = new Date()): string {
  const due = new Date(from);
  due.setDate(due.getDate() + days);
  return isoDay(due);
}

export const MAX_LEVEL = 5;

/** Iz vrednosti obrazca varno prebere cilj skupinske predaje. */
export function handoffLevelOf(target: string): number | null {
  if (!target.startsWith("level:")) return null;
  const level = Number(target.slice("level:".length));
  return Number.isInteger(level) && level >= 1 && level <= MAX_LEVEL ? level : null;
}

/**
 * Naročilo obdrži valuto, v kateri je bilo plačano. Pretvarjanje bi zahtevalo
 * stalno spremljanje tečaja in bi refund lahko zgrešilo za nekaj odstotkov —
 * švicarska stranka dobi nazaj frank, ne evra.
 *
 * Seznam je za spustnik pri ročnem vnosu; iz Shopifyja pride karkoli, kar
 * ustreza obliki treh črk, in se sprejme tudi če ga tu ni.
 */
export const COMMON_CURRENCIES = ["EUR", "CHF", "GBP", "USD", "SEK", "NOK", "DKK", "PLN", "CZK"];

export const DEFAULT_CURRENCY = "EUR";

const CURRENCY_RE = /^[A-Z]{3}$/;

export function normalizeCurrency(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase();
  return code && CURRENCY_RE.test(code) ? code : null;
}

/**
 * Kaj se zgodi s posamezno postavko naročila. Stranka pogosto reklamira samo
 * enega od artiklov, ostali pa ostanejo pri njej — zato "none".
 */
export const ITEM_RESOLUTIONS = [
  { id: "refund", label: "Refund", color: "var(--type-refund)" },
  { id: "exchange", label: "Exchange", color: "var(--type-exchange)" },
  { id: "none", label: "No action", color: "var(--type-other)" },
  // Čakamo stranko: ne ve se še, ali bo vračilo ali menjava.
  { id: "undecided", label: "Undecided", color: "var(--warning)" },
] as const;

export type ItemResolutionId = (typeof ITEM_RESOLUTIONS)[number]["id"];

/**
 * Rešitev, ki je še nihče ni izbral. Dobijo jo artikli sistemskega ticketa:
 * Desk iz maila ne ve, kaj stranka hoče. Ticket s takim artiklom ni mogoče
 * predati naprej ne zapreti — rešitev mora izbrati človek.
 */
export const PENDING_RESOLUTION = "pending";

/**
 * "Še ne vemo": človek je artikel pogledal, a čaka dodaten podatek stranke.
 * Tak ticket prav tako ne gre naprej in se ne zapre — odločitev še ni padla.
 */
export const UNDECIDED_RESOLUTION = "undecided";

/** Ali ima kateri artikel še neodločeno rešitev (neizbrano ali "še ne vemo"). */
export function hasPendingResolution(items: { resolution: string }[]): boolean {
  return items.some((item) => item.resolution === PENDING_RESOLUTION || item.resolution === UNDECIDED_RESOLUTION);
}

/** Zakaj ticket še ne gre naprej: sporočilo, ki pove, kaj manjka. */
export function unresolvedMessage(items: { resolution: string }[]): "error.resolutionPending" | "error.resolutionUndecided" {
  return items.some((item) => item.resolution === PENDING_RESOLUTION) ? "error.resolutionPending" : "error.resolutionUndecided";
}

/** Postavke, pri katerih mora artikel priti nazaj, preden se naročilo zapre. */
export const RETURN_RESOLUTIONS = new Set(["refund", "exchange"]);

export const MAX_ITEMS = 20;

/**
 * Vgrajene vrste, ki potrebujejo potrditev vrnjenega paketa. Zasnova za prazno
 * bazo; po uvedbi šifranta to pove zastavica "zahteva vrnjen paket" pri vrsti.
 */
export const RETURN_TYPES = new Set(["refund", "exchange", "quality"]);

/**
 * Ali je pred zaprtjem treba potrditi, da je paket prišel nazaj.
 *
 * Kadar so postavke vpisane, odločajo one — pri naročilu s petimi artikli in
 * enim vračilom je merodajen tisti en artikel, ne vrsta težave. Brez postavk
 * (stara naročila, hiter vnos) obvelja vrsta težave.
 *
 * Nabor vrst pride iz šifranta; privzetek je tu samo za teste in za pot, kjer
 * šifranta ni pri roki.
 *
 * V krogu menjave, ki ga je povzročila naša napaka (`exchangeFault` "ours"),
 * stranka kos obdrži — menjava tam paketa nazaj ne pričakuje.
 */
export function requiresReturnProof(
  type: string,
  items: { resolution: string }[],
  returnTypes: Set<string> = RETURN_TYPES,
  exchangeFault: string | null = null,
): boolean {
  if (items.length > 0) {
    return items.some((i) => RETURN_RESOLUTIONS.has(i.resolution) && !(i.resolution === "exchange" && exchangeFault === "ours"));
  }
  return returnTypes.has(type);
}

// --- pošiljke ---------------------------------------------------------------

/**
 * Stanje pošiljke, kakor ga vodimo mi. Dobaviteljev status je samo vhod;
 * odločitev, ali naročilo spi, se zbudi ali gre k človeku, je naša.
 */
export const PARCEL_STATES = ["pending", "transit", "arrived", "manual", "untracked"] as const;
export type ParcelState = (typeof PARCEL_STATES)[number];

export const MAX_PARCELS = 10;

// --- ShipG inventory -------------------------------------------------------

export const MIN_SHIPG_LEVEL = 2;

export const SHIPG_STATUSES = ["expected", "check", "stocked", "exception"] as const;
export type ShipgStatus = (typeof SHIPG_STATUSES)[number];

/** Preslika interni status vračila v ShipG pogled po reorganizaciji zavihkov:
 *  expected/check → "check", stocked → "stock" (Zaloga), exception → "exception". */
export function shipgStatusView(status: string | null | undefined): string {
  if (status === "exception") return "exception";
  if (status === "stocked") return "stock";
  return "check";
}

export const SHIPG_ITEM_CONDITIONS = ["pending", "good", "damaged", "missing", "wrong"] as const;
export type ShipgItemCondition = (typeof SHIPG_ITEM_CONDITIONS)[number];

/** Država, v katero ShipGerman ne dostavlja. */
export const SHIPGERMAN_BLOCKED_COUNTRY = "DE";

/**
 * ShipGerman lahko pošlje kamor koli razen v Nemčijo. Menjava iz ShipGerman
 * zaloge je zato dovoljena za vsako znano državo dostave, ki ni DE.
 */
export function isShipgermanMarket(countryCode: string | null | undefined): boolean {
  return Boolean(countryCode) && countryCode !== SHIPGERMAN_BLOCKED_COUNTRY;
}

/**
 * Kako gotovi smo, da fizični paket res pripada naročilu, na katero je vezan.
 * Vrstni red je pomemben: od najbolj do najmanj zanesljivega.
 */
export const MATCH_QUALITIES = ["high", "medium", "low"] as const;
export type MatchQuality = (typeof MATCH_QUALITIES)[number];

/** Neznano ali pokvarjeno vrednost beremo kot najnižjo — dvom nikoli ne sme
 *  postati privzeta gotovost. Novi zapisi dobijo "high" iz sheme, ne od tod. */
export function asMatchQuality(value: string | null | undefined): MatchQuality {
  return MATCH_QUALITIES.includes(value as MatchQuality) ? (value as MatchQuality) : "low";
}

/**
 * Odpremiti je mogoče samo paket, pri katerem o ujemanju ni dvoma. Pri nižji
 * gotovosti bi stranka lahko dobila tuj kos — napaka, ki stane dvakratno
 * pošiljko in zaupanje, medtem ko čakanje na potrditev ne stane nič.
 */
export function canDispatchMatch(quality: string | null | undefined): boolean {
  return asMatchQuality(quality) === "high";
}

export function canAccessShipg(user: { level: number; isAdmin: boolean }): boolean {
  return user.level >= MIN_SHIPG_LEVEL;
}

/**
 * Preslikava statusov 17TRACK v naše stanje.
 *
 * "AvailableForPickup" namenoma pade v ročno obravnavo: paket čaka na
 * prevzemnem mestu in ga mora nekdo iti iskat, sicer ga po nekaj dneh vrnejo
 * pošiljatelju. Tega ni pametno pustiti spati.
 */
export function parcelOutcome(providerStatus: string): {
  state: ParcelState;
  reason?: string;
} {
  switch (providerStatus) {
    case "Delivered":
      return { state: "arrived" };

    case "InfoReceived":
    case "InTransit":
    case "OutForDelivery":
      return { state: "transit" };

    case "NotFound":
      // Sveža številka je lahko preprosto še neznana; o njej odloči čas
      // (glej parcelTimeGuard), ne prvi odgovor.
      return { state: "pending" };

    case "AvailableForPickup":
      return { state: "manual", reason: "pickup" };
    case "DeliveryFailure":
      return { state: "manual", reason: "failed" };
    case "Exception":
      return { state: "manual", reason: "exception" };
    case "Expired":
      return { state: "manual", reason: "expired" };

    default:
      return { state: "manual", reason: "unknown" };
  }
}

/**
 * Časovna varovala. Brez njih bi naročilo lahko spalo v nedogled: ker
 * webhook ni prišel, ker prevoznik številke ni nikoli zabeležil, ali ker se
 * je paket izgubil brez uradne napake.
 */
export function parcelTimeGuard(
  parcel: {
    state: string;
    registeredAt: Date | null;
    lastEventAt: Date | null;
    createdAt: Date;
  },
  now: Date = new Date(),
  config: ParcelConfig = PARCEL_DEFAULTS,
): { state: ParcelState; reason: string } | null {
  if (parcel.state === "arrived" || parcel.state === "manual") return null;

  const hours = (from: Date) => (now.getTime() - from.getTime()) / 3_600_000;

  if (parcel.state === "pending") {
    const since = parcel.registeredAt ?? parcel.createdAt;
    if (hours(since) >= config.graceHours) {
      return { state: "manual", reason: "not_found" };
    }
  }

  const lastMove = parcel.lastEventAt ?? parcel.registeredAt ?? parcel.createdAt;
  if (hours(lastMove) >= config.staleHours) {
    return { state: "manual", reason: "stale" };
  }

  return null;
}

/** Pošiljka, ki naročilo drži na čakanju. */
export function parcelHolds(state: string): boolean {
  return state === "transit";
}

/**
 * Stanje naročila, ki sledi spremembi ene pošiljke.
 *
 * Ročna pomoč je namenoma lepljiva: nov premik je ne skrije, dokler človek
 * naročila ne prevzame ali ročno nadaljuje. Zaprtih naročil tracking ne odpira.
 */
export function issueStatusForParcel(input: {
  issueStatus: string;
  direction: string;
  parcelState: ParcelState;
  otherReturnHolds: boolean;
}): string | null {
  const { issueStatus, direction, parcelState, otherReturnHolds } = input;
  if (issueStatus === "closed") return null;
  if (parcelState === "manual") return issueStatus === "manual" ? null : "manual";
  if (issueStatus === "manual") return null;
  if (direction !== "return") return null;
  if (parcelState === "transit") return issueStatus === "waiting" ? null : "waiting";
  if (!parcelHolds(parcelState) && !otherReturnHolds && issueStatus === "waiting") return "open";
  return null;
}

export function getItemResolution(id: string) {
  return ITEM_RESOLUTIONS.find((r) => r.id === id) ?? ITEM_RESOLUTIONS[0];
}

/** Vsota zneskov postavk, ki gredo v vračilo. Brez zneskov vrne null. */
export function refundTotal(
  items: { resolution: string; amount: number | null }[],
): number | null {
  const relevant = items.filter((i) => i.resolution === "refund" && i.amount != null);
  if (relevant.length === 0) return null;
  return relevant.reduce((sum, i) => sum + (i.amount ?? 0), 0);
}

/** Zaključi lahko 2. nivo in višje (ali admin). 1. nivo mora predati naprej. */
export const MIN_CLOSE_LEVEL = 2;

export function canClose(user: { level: number; isAdmin: boolean }): boolean {
  return user.isAdmin || user.level >= MIN_CLOSE_LEVEL;
}

export function getStatus(id: string) {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[0];
}

export function levelLabel(level: number): string {
  return `${level}. nivo`;
}

export const FIELD_LABELS: Record<string, string> = {
  orderNumber: "Št. naročila",
  title: "Naslov",
  priority: "Prioriteta",
  customerName: "Stranka",
  customerEmail: "E-mail",
  items: "Artikli",
  amount: "Znesek",
  returnTracking: "Return tracking",
  replacementTracking: "Tracking zamenjave",
  orderPlacedAt: "Datum naročila",
  waitingUntil: "Čaka do",
};

/** Dovoljene priloge. Preveri se tudi končnica, ne le prijavljeni MIME. */
export const ALLOWED_UPLOADS: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
  "application/pdf": [".pdf"],
};

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOADS_PER_EVENT = 10;

/**
 * Dan, ko je odprema stekla skozi Desk. Pošiljke pred tem datumom so nastale,
 * ko sistema še ni bilo ("pred sistemom"); poznejše brez našega zapisa pomenijo,
 * da je nekdo odpremil mimo Deska ("zunaj sistema"). Razlika ni kozmetična —
 * prva je zgodovina, druga je opuščen korak, ki ga je vredno opaziti.
 */
export const SHIPG_SYSTEM_LIVE_AT = new Date("2026-08-15T00:00:00+02:00");

/** Izvor odposlane pošiljke glede na to, ali je šla skozi Desk. */
export function shipmentOrigin(hasAllocation: boolean, shippedAt: Date | null): "system" | "preSystem" | "outside" {
  if (hasAllocation) return "system";
  if (shippedAt && shippedAt.getTime() >= SHIPG_SYSTEM_LIVE_AT.getTime()) return "outside";
  return "preSystem";
}
