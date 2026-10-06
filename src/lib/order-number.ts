/**
 * Enolični ključ Shopify naročila. Prikaz lahko ohrani presledke in zapis,
 * primerjava pa ne sme razlikovati med `#1234`, `1234` ali `1 234`.
 */
export function orderNumberKey(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/^#/, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

/**
 * Ali vpisano besedilo sploh izgleda kot številka naročila. Iskanje zajame tudi
 * imena, naslove in tracking, zato ima ponudba "odpri ticket za to naročilo"
 * smisel samo pri številki — za »kessare« bi bila nesmisel.
 */
export function looksLikeOrderNumber(value: string): boolean {
  return /^\d{3,10}$/.test(orderNumberKey(value));
}
