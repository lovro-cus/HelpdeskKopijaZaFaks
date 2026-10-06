/**
 * Zapisan potek dela podpore.
 *
 * Risbe ne rišemo po koordinatah: zapis je drevo korakov in postavitev se iz
 * njega izračuna sama. Tako lahko potek ureja kdorkoli — doda korak, ga premakne
 * ali izbriše — ne da bi mu bilo treba paziti, kam bo katera škatla padla.
 */

export const PROCESS_KINDS = ["act", "mail", "dec", "wait", "sys", "end", "undef"] as const;
export type ProcessKind = (typeof PROCESS_KINDS)[number];

export function isProcessKind(value: string | null | undefined): value is ProcessKind {
  return PROCESS_KINDS.includes((value ?? "") as ProcessKind);
}

/** Barva poteze ob levem robu koraka — pomen, ne okras. */
export const KIND_COLOR: Record<ProcessKind, string> = {
  act: "var(--petrol)",
  mail: "var(--petrol)",
  dec: "var(--rule-ink)",
  wait: "var(--warning)",
  sys: "var(--ink-3)",
  end: "var(--success)",
  undef: "var(--stamp)",
};

export type StepRow = {
  id: string;
  branchId: string;
  parentId: string | null;
  kind: string;
  title: string;
  body: string | null;
  edgeLabel: string | null;
  open: string | null;
  position: number;
};

export type StepNode = StepRow & { children: StepNode[]; depth: number };

/**
 * Iz ravnega seznama naredi drevo. Korak, ki mu je starš izginil (izbrisan med
 * dvema branjema), obvisi na korenu — bolje ga videti na napačnem mestu kot ga
 * tiho izgubiti.
 */
export function buildTree(steps: StepRow[]): StepNode[] {
  const byId = new Map<string, StepNode>();
  for (const step of steps) byId.set(step.id, { ...step, children: [], depth: 0 });

  const roots: StepNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }

  const sort = (list: StepNode[], depth: number) => {
    list.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
    for (const node of list) {
      node.depth = depth;
      sort(node.children, depth + 1);
    }
  };
  sort(roots, 0);
  return roots;
}

/** Odprta vprašanja koraka: po eno v vrstici, prazne vrstice odpadejo. */
export function openQuestions(open: string | null | undefined): string[] {
  return (open ?? "")
    // Iz brskalnika pride prelom kot CRLF; brez tega bi vsako vprašanje
    // vleklo za sabo neviden znak.
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-–•\s]+/, "").trim())
    .filter(Boolean);
}

/** Vsa odprta vprašanja poteka, po vejah — seznam "kar je treba določiti". */
export function collectOpen(
  branches: { id: string; key: string; title: string }[],
  steps: StepRow[],
): { branch: string; key: string; items: { step: string; question: string }[] }[] {
  return branches
    .map((branch) => ({
      branch: branch.title,
      key: branch.key,
      items: steps
        .filter((step) => step.branchId === branch.id)
        .flatMap((step) => openQuestions(step.open).map((question) => ({ step: step.title, question }))),
    }))
    .filter((group) => group.items.length > 0);
}

/** Zaporedne pozicije, da premik gor/dol nikoli ne obtiči na enakih številkah. */
export function reindex<T extends { id: string }>(list: T[]): { id: string; position: number }[] {
  return list.map((item, index) => ({ id: item.id, position: index }));
}

/** Premik znotraj seznama; vrne nov vrstni red ali null, če se ni imelo kam. */
export function moved<T extends { id: string }>(list: T[], id: string, direction: -1 | 1): T[] | null {
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const target = index + direction;
  if (target < 0 || target >= list.length) return null;
  const next = [...list];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

// --- postavitev diagrama ------------------------------------------------------

/** Širina vozlišča je fiksna: enako široke škatle so v risbi berljivejše od
 *  takih, ki se prilegajo besedilu, in postavitev je s tem predvidljiva. */
export const NODE_W = 232;
const H_GAP = 26;
const V_GAP = 46;
const PAD = 22;

export type Placed = { node: StepNode; x: number; y: number; w: number; h: number };
export type Wire = { d: string; label: string | null; labelX: number; labelY: number };

/** Ali korak konča pot: zaključek in nedefinirano se ne stekata naprej. */
const terminal = (node: StepNode) => node.kind === "end" || node.kind === "undef";

/**
 * Postavitev ene veje.
 *
 * Koraki na vrhu so veriga (eden za drugim), otroci koraka pa se razcepijo pod
 * njim in se — razen zaključkov — spet stečejo v naslednji člen verige. Prav to
 * je oblika, ki jo ima potek v resnici: vprašanje, dve poti, nadaljevanje.
 */
export function layoutBranch(
  roots: StepNode[],
  heightOf: (id: string) => number,
): { placed: Placed[]; edges: Wire[]; width: number; height: number } {
  const placed: Placed[] = [];
  const edges: Wire[] = [];
  const byId = new Map<string, Placed>();

  // Širina poddrevesa: koliko prostora potrebuje razcep pod korakom.
  const widthOf = (node: StepNode): number => {
    if (node.children.length === 0) return NODE_W;
    const children = node.children.reduce((sum, child) => sum + widthOf(child), 0)
      + H_GAP * (node.children.length - 1);
    return Math.max(NODE_W, children);
  };

  /** Postavi poddrevo v pas [left, left+width) in vrne najnižjo točko. */
  const put = (node: StepNode, left: number, top: number): number => {
    const width = widthOf(node);
    const h = heightOf(node.id);
    const item: Placed = { node, x: Math.round(left + (width - NODE_W) / 2), y: top, w: NODE_W, h };
    placed.push(item);
    byId.set(node.id, item);

    if (node.children.length === 0) return top + h;

    let childLeft = left;
    let bottom = top + h;
    const childTop = top + h + V_GAP;
    for (const child of node.children) {
      const childWidth = widthOf(child);
      bottom = Math.max(bottom, put(child, childLeft, childTop));
      childLeft += childWidth + H_GAP;
    }
    return bottom;
  };

  // Veriga na vrhu: vsak člen pod poddrevesom prejšnjega.
  const totalWidth = Math.max(NODE_W, ...roots.map(widthOf));
  let y = PAD;
  for (const root of roots) {
    const width = widthOf(root);
    const bottom = put(root, PAD + (totalWidth - width) / 2, y);
    y = bottom + V_GAP;
  }

  // Povezave: starš → otrok, in zaključki poddrevesa → naslednji člen verige.
  const leaves = (node: StepNode): StepNode[] =>
    node.children.length === 0 ? [node] : node.children.flatMap(leaves);

  for (const item of placed) {
    for (const child of item.node.children) {
      const target = byId.get(child.id);
      if (target) edges.push(wire(item, target, child.edgeLabel));
    }
  }
  for (let i = 0; i < roots.length - 1; i += 1) {
    const next = byId.get(roots[i + 1]!.id);
    if (!next) continue;
    for (const leaf of leaves(roots[i]!)) {
      if (terminal(leaf)) continue;
      const from = byId.get(leaf.id);
      if (from) edges.push(wire(from, next, null));
    }
  }

  const width = totalWidth + PAD * 2;
  const height = Math.max(y - V_GAP + PAD, PAD * 2);
  return { placed, edges, width, height };
}

/** Pravokotna povezava: dol, vstran, dol — da se poti ne poševijo čez risbo. */
function wire(from: Placed, to: Placed, label: string | null): Wire {
  const x1 = from.x + from.w / 2;
  const y1 = from.y + from.h;
  const x2 = to.x + to.w / 2;
  const y2 = to.y;
  const midY = y1 + Math.max(16, (y2 - y1) / 2);
  const d = Math.abs(x1 - x2) < 2
    ? `M ${x1} ${y1} V ${y2 - 2}`
    : `M ${x1} ${y1} V ${midY} H ${x2} V ${y2 - 2}`;
  return {
    d,
    label,
    labelX: Math.abs(x1 - x2) < 2 ? x1 + 7 : (x1 + x2) / 2,
    labelY: Math.abs(x1 - x2) < 2 ? midY + 4 : midY - 6,
  };
}
