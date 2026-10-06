import { canonicalKey, canonicalLabel } from "./catalog-canonical";
import { RETURN_RESOLUTIONS } from "./domain";

export type MergePackageItem = { name: string; variant: string | null; expectedQty: number; receivedQty: number };
export type MergeIssueItem = { name: string; variant: string | null; qty: number; resolution: string };

export type MergeDiffState = "match" | "qty" | "extra" | "missing";
export type MergeDiffRow = {
  key: string;
  label: string;
  packageQty: number;
  issueQty: number;
  state: MergeDiffState;
};

/** Bogata vrstica združitve: poleg količin ohrani ime/varianto (za ustvarjanje
 *  manjkajoče postavke ob urejljivem mergu) in izvorno stanje razlike. */
export type MergeRow = {
  key: string;
  name: string;
  variant: string | null;
  label: string;
  packageQty: number;
  orderQty: number;
  state: MergeDiffState;
};

/** Uniji postavk paketa in naročila po kanoničnem ključu (isti fizični kos med
 *  IT in DACH trgom je združen). Ime/varianta postavke prihaja iz paketa, če
 *  tam obstaja, sicer iz naročila — da ima novo ustvarjena postavka smiseln
 *  zapis. Če resolucije še niso nastavljene, kot izhodišče vzame vse postavke. */
export function mergeRows(packageItems: MergePackageItem[], issueItems: MergeIssueItem[]): MergeRow[] {
  const returnItems = issueItems.filter((item) => RETURN_RESOLUTIONS.has(item.resolution));
  const baseline = returnItems.length ? returnItems : issueItems;

  const rows = new Map<string, MergeRow>();
  const ensure = (name: string, variant: string | null) => {
    const key = canonicalKey(name, variant);
    let row = rows.get(key);
    if (!row) {
      row = { key, name, variant, label: canonicalLabel(name, variant), packageQty: 0, orderQty: 0, state: "match" };
      rows.set(key, row);
    }
    return row;
  };

  // Paket najprej: njegove postavke določijo ime/varianto slota.
  for (const item of packageItems) {
    const qty = item.receivedQty > 0 ? item.receivedQty : item.expectedQty;
    if (qty <= 0) continue;
    ensure(item.name, item.variant).packageQty += qty;
  }
  for (const item of baseline) {
    if (item.qty <= 0) continue;
    ensure(item.name, item.variant).orderQty += item.qty;
  }
  for (const row of rows.values()) {
    row.state = row.packageQty === 0 ? "missing"
      : row.orderQty === 0 ? "extra"
      : row.packageQty === row.orderQty ? "match"
      : "qty";
  }
  return [...rows.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** Primerja vsebino fizičnega paketa s postavkami naročila, ki naj bi se vrnile
 *  (samo za prikaz). */
export function mergeDiff(packageItems: MergePackageItem[], issueItems: MergeIssueItem[]): MergeDiffRow[] {
  return mergeRows(packageItems, issueItems).map((row) => ({
    key: row.key,
    label: row.label,
    packageQty: row.packageQty,
    issueQty: row.orderQty,
    state: row.state,
  }));
}
