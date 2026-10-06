/**
 * Stanje naročila pri Shopifyju — plačilo in odprema.
 *
 * Shopify vrne dve ločeni stvari: `displayFinancialStatus` (PAID, REFUNDED …)
 * in `displayFulfillmentStatus` (UNFULFILLED, FULFILLED …). Dostave med njimi
 * ni: "dostavljeno" ve samo pošiljka (`fulfillments.displayStatus`), zato jo
 * potegnemo od tam in jo tu zložimo v isto lestvico. Za pult je "dostavljeno"
 * pomembnejši podatek od "odpremljeno".
 *
 * Vrednosti hranimo take, kot jih vrne Shopify (velike črke), da odtis v bazi
 * ostane primerljiv z virom. Prevod je stvar slovarja.
 */

export const FINANCIAL_STATUSES = [
  "PENDING",
  "AUTHORIZED",
  "PARTIALLY_PAID",
  "PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "VOIDED",
  "EXPIRED",
] as const;

export const FULFILLMENT_STATUSES = [
  "UNFULFILLED",
  "SCHEDULED",
  "ON_HOLD",
  "IN_PROGRESS",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RESTOCKED",
] as const;

/** Stanja pošiljke, ki povedo več kot golo "odpremljeno". */
const DELIVERY_PROGRESS = ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

export function isKnownFinancial(value: string | null | undefined): boolean {
  return FINANCIAL_STATUSES.includes(value as (typeof FINANCIAL_STATUSES)[number]);
}

export function isKnownFulfillment(value: string | null | undefined): boolean {
  return FULFILLMENT_STATUSES.includes(value as (typeof FULFILLMENT_STATUSES)[number]);
}

/**
 * Odprema, kakor jo pokažemo: če katera pošiljka ve za dostavo, obvelja
 * najdlje prispela — naročilo z dvema paketoma, od katerih je eden dostavljen
 * in drugi na poti, je "na poti", ne "dostavljeno".
 */
export function resolveFulfillment(
  orderStatus: string | null | undefined,
  fulfillmentStatuses: (string | null | undefined)[] = [],
): string | null {
  const known = fulfillmentStatuses.filter((status): status is string => DELIVERY_PROGRESS.includes(status ?? ""));
  if (known.length > 0) {
    // Najmanj napredovana pošiljka odloči: naročilo je opravljeno šele, ko je
    // opravljen zadnji paket.
    const rank = (status: string) => DELIVERY_PROGRESS.indexOf(status);
    const slowest = known.reduce((worst, status) => (rank(status) < rank(worst) ? status : worst));
    // Delne odpreme ne smemo prikazati kot dostavljene: nekaj je še doma.
    if (orderStatus === "PARTIALLY_FULFILLED") return "PARTIALLY_FULFILLED";
    return slowest;
  }
  return orderStatus ?? null;
}

/** Stanja pošiljke, ki v Shopify adminu pomenijo neuspešno dostavo. */
const FAILED_DELIVERY = ["FAILURE", "NOT_DELIVERED"];

export type DeliveryFulfillment = {
  displayStatus: string | null;
  trackingNumbers: string[];
  events: { status: string; happenedAt: string }[];
};

export type DeliveryFailure = { failedAt: Date | null; tracking: string | null };

/**
 * Ali je katera pošiljka naročila obtičala z neuspešno dostavo. Čas vzamemo iz
 * zadnjega dogodka FAILURE (Shopify ga pokaže kot »Delivery failed on …«);
 * brez njega ostane prazen. Null, kadar neuspele pošiljke ni.
 */
export function deliveryFailureOf(fulfillments: DeliveryFulfillment[]): DeliveryFailure | null {
  const failed = fulfillments.find((fulfillment) => FAILED_DELIVERY.includes(fulfillment.displayStatus ?? ""));
  if (!failed) return null;
  const times = failed.events
    .filter((event) => event.status === "FAILURE")
    .map((event) => new Date(event.happenedAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return { failedAt: times[0] ?? null, tracking: failed.trackingNumbers.find(Boolean) ?? null };
}

/** Naročilo je pri kupcu ali vsaj na poti — od tod naprej ni več "čaka odpremo". */
export function isFulfilled(status: string | null | undefined): boolean {
  return (
    status === "FULFILLED" ||
    status === "IN_TRANSIT" ||
    status === "OUT_FOR_DELIVERY" ||
    status === "DELIVERED"
  );
}

/**
 * Ali je prehod tisti, ki ga čakamo pri neodpremljenem naročilu: prej ni bilo
 * odpremljeno, zdaj je. Enak status dvakrat ni dogodek.
 */
export function becameFulfilled(
  before: string | null | undefined,
  after: string | null | undefined,
): boolean {
  return !isFulfilled(before) && isFulfilled(after);
}

/**
 * Barva oznake. Denar in odprema imata isto pravilo kot vse v tem sistemu:
 * barva nastopi samo tam, kjer nekaj terja pogled ali je opravljeno.
 */
export function financialTone(status: string | null | undefined): string {
  if (status === "REFUNDED" || status === "VOIDED" || status === "EXPIRED") return "var(--stamp)";
  if (status === "PARTIALLY_REFUNDED" || status === "PENDING" || status === "PARTIALLY_PAID") return "var(--warning)";
  if (status === "PAID") return "var(--success)";
  return "var(--ink-2)";
}

export function fulfillmentTone(status: string | null | undefined): string {
  if (status === "DELIVERED") return "var(--success)";
  if (status === "UNFULFILLED" || status === "ON_HOLD" || status === "RESTOCKED") return "var(--warning)";
  return "var(--ink-2)";
}
