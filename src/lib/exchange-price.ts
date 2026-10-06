/**
 * Razlika v ceni pri menjavi v DRUG izdelek.
 *
 * Menjava znotraj istega izdelka (druga velikost, druga barva) cene ne
 * spremeni. Menjava v drug izdelek pa skoraj vedno: hlače za 129 € za jeans za
 * 159 € pomenijo 30 € doplačila. Ticket razlike ne pobira in ne vrača — to je
 * delo človeka — pove pa, koliko je, in menjave ne spusti v rezervacijo, dokler
 * nekdo ne potrdi, da je urejena. Tiho odposlan dražji kos je izguba.
 *
 * Cene v katalogu so v evrih. Pri naročilu v drugi valuti razlike ne
 * izračunavamo — 30 bi bilo videti kot evri, v resnici pa bi bili franki.
 */

import { priceOf } from "./catalog";
import { DEFAULT_CURRENCY } from "./domain";

export type PriceDiff =
  /** Menjava ostane pri istem izdelku ali pa sta ceni enaki — ni kaj urejati. */
  | { kind: "none" }
  /** Izdelek je drug, cene pa ne poznamo (izven kataloga, tuja valuta). */
  | { kind: "unknown" }
  /** Pozitivno: stranka doplača. Negativno: vrnemo ji razliko. */
  | { kind: "diff"; amount: number };

export type PriceDiffItem = {
  name: string;
  qty: number;
  resolution: string;
  replacementName?: string | null;
  priceDiffSettled?: boolean;
};

/** Razlika za eno postavko, iz cen, ki ju poda klicatelj. Brez kataloga, da je
 *  pravilo preverljivo samo zase. */
export function priceDiffOf(
  returnedPrice: number | null,
  replacementPrice: number | null,
  qty: number,
): PriceDiff {
  if (returnedPrice === null || replacementPrice === null) return { kind: "unknown" };
  const amount = Number(((replacementPrice - returnedPrice) * Math.max(qty, 1)).toFixed(2));
  return amount === 0 ? { kind: "none" } : { kind: "diff", amount };
}

/** Razlika za postavko naročila, s cenami iz kataloga. */
export function itemPriceDiff(item: PriceDiffItem, currency: string = DEFAULT_CURRENCY): PriceDiff {
  const replacement = item.replacementName?.trim();
  if (item.resolution !== "exchange" || !replacement) return { kind: "none" };
  if (currency !== DEFAULT_CURRENCY) return { kind: "unknown" };
  return priceDiffOf(priceOf(item.name), priceOf(replacement), item.qty);
}

/**
 * Ali postavka čaka na potrditev razlike. Enaki ceni potrditve ne potrebujeta;
 * neznana cena jo potrebuje — da neznano ne pomeni "ni razlike".
 */
export function awaitsPriceSettlement(item: PriceDiffItem, currency: string = DEFAULT_CURRENCY): boolean {
  if (item.priceDiffSettled) return false;
  return itemPriceDiff(item, currency).kind !== "none";
}

/** Ali katera postavka menjave še čaka na potrditev razlike. */
export function hasUnsettledPriceDiff(items: PriceDiffItem[], currency?: string): boolean {
  return items.some((item) => awaitsPriceSettlement(item, currency));
}
