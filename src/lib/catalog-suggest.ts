import { imageKey } from "./catalog-import";

/**
 * Predlogi, kateri izdelki so isti kos.
 *
 * Isti fizični kos ima na vseh trgih iste fotografije (Shopify jih ne kopira,
 * ampak pripne isto datoteko), zato je skupna slika zanesljiv znak. Slika, ki
 * jo nosita dve različni skupini (npr. tabela velikosti), ne pove ničesar in
 * ne šteje.
 */

export const NEW_GROUP = "__new";

export type SuggestProduct = {
  id: string;
  title: string;
  image: string | null;
  variants: { image: string | null }[];
  groupId: string | null;
  /** Skupine (ali NEW_GROUP), ki jih je admin za ta izdelek zavrnil. */
  dismissed: string[];
  missing: boolean;
  status: string;
};

export type Suggestion =
  | { kind: "join"; groupId: string; productIds: string[] }
  | { kind: "new"; productIds: string[]; label: string };

export function imageKeysOf(product: Pick<SuggestProduct, "image" | "variants">): Set<string> {
  const keys = new Set<string>();
  for (const url of [product.image, ...product.variants.map((variant) => variant.image)]) {
    const key = imageKey(url);
    if (key) keys.add(key);
  }
  return keys;
}

/** Kratko ime skupine iz nazivov: brez znamke, oznak in barve v oklepaju. */
export function shortLabel(titles: string[]): string {
  const cleaned = titles
    .map((title) => title.replace(/kroj|testmoto/gi, "").replace(/[™®]/g, "").replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .sort((a, b) => a.length - b.length);
  return cleaned[0] ?? titles[0] ?? "";
}

export function suggestGroups(products: SuggestProduct[]): Suggestion[] {
  const keys = new Map(products.map((product) => [product.id, imageKeysOf(product)]));

  // Slika → skupine, ki jo nosijo.
  const owners = new Map<string, Set<string>>();
  for (const product of products) {
    if (!product.groupId) continue;
    for (const key of keys.get(product.id) ?? []) {
      const set = owners.get(key) ?? new Set<string>();
      set.add(product.groupId);
      owners.set(key, set);
    }
  }

  const live = products.filter((product) => !product.groupId && !product.missing && product.status !== "archived");
  const joins = new Map<string, string[]>();
  const loose: SuggestProduct[] = [];

  for (const product of live) {
    const score = new Map<string, number>();
    for (const key of keys.get(product.id) ?? []) {
      const groups = owners.get(key);
      if (!groups || groups.size !== 1) continue;
      const [group] = groups;
      if (product.dismissed.includes(group!)) continue;
      score.set(group!, (score.get(group!) ?? 0) + 1);
    }
    const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) joins.set(best[0], [...(joins.get(best[0]) ?? []), product.id]);
    else loose.push(product);
  }

  // Nepovezani izdelki, ki si med sabo delijo sliko: predlog za novo skupino.
  const parent = new Map(loose.map((product) => [product.id, product.id]));
  const find = (id: string): string => {
    const up = parent.get(id)!;
    if (up === id) return id;
    const root = find(up);
    parent.set(id, root);
    return root;
  };
  const firstByKey = new Map<string, string>();
  for (const product of loose) {
    for (const key of keys.get(product.id) ?? []) {
      if (owners.has(key)) continue;
      const other = firstByKey.get(key);
      if (other) parent.set(find(product.id), find(other));
      else firstByKey.set(key, product.id);
    }
  }
  const clusters = new Map<string, SuggestProduct[]>();
  for (const product of loose) {
    const root = find(product.id);
    clusters.set(root, [...(clusters.get(root) ?? []), product]);
  }

  const suggestions: Suggestion[] = [...joins.entries()].map(([groupId, productIds]) => ({ kind: "join", groupId, productIds }));
  for (const members of clusters.values()) {
    const candidates = members.filter((product) => !product.dismissed.includes(NEW_GROUP));
    if (candidates.length < 2) continue;
    suggestions.push({ kind: "new", productIds: candidates.map((product) => product.id), label: shortLabel(candidates.map((product) => product.title)) });
  }
  return suggestions;
}
