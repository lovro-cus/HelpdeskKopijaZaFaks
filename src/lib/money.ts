/**
 * Izračun zneskov iz Shopifyjevih podatkov.
 *
 * Namenoma brez "server-only": tu ni ne skrivnosti ne dostopa do baze, zato
 * je logika, po kateri se odloča višina refunda, pokrita s testi.
 */

/**
 * Kar je stranka za postavko plačala.
 *
 * Shopify vrne izvirno vrednost vrstice (pred popusti) in seznam alokacij —
 * dejansko odštetih zneskov. Vzeti samo izvirno vrednost pomeni pri vsaki
 * akciji previsok refund; pri naročilu 1953 bi bilo 258 € namesto 199 €.
 */
export function lineTotalAfterDiscounts(
  originalAmount: string | null | undefined,
  allocations: (string | null | undefined)[],
): string | null {
  // Pozor: Number(null) je 0, Number("") tudi. Manjkajoč znesek ni brezplačna
  // postavka — raje ne vpišemo ničesar, kot da tiho znižamo refund.
  if (originalAmount == null || originalAmount.trim() === "") return null;

  const original = Number(originalAmount);
  if (!Number.isFinite(original)) return null;

  const discounts = allocations.reduce<number>((sum, raw) => {
    const value = Number(raw);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  // Zaokrožitev na cent prepreči zapise kot 99.49999999999999.
  const paid = Math.max(0, Math.round((original - discounts) * 100) / 100);
  return paid.toFixed(2);
}
