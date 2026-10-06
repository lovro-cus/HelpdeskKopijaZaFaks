import assert from "node:assert/strict";
import test from "node:test";

import { NODE_W, buildTree, collectOpen, isProcessKind, layoutBranch, moved, openQuestions, reindex, type StepRow } from "../src/lib/process";

const step = (id: string, parentId: string | null, position: number, extra: Partial<StepRow> = {}): StepRow => ({
  id,
  branchId: extra.branchId ?? "b1",
  parentId,
  kind: extra.kind ?? "act",
  title: extra.title ?? id,
  body: extra.body ?? null,
  edgeLabel: extra.edgeLabel ?? null,
  open: extra.open ?? null,
  position,
});

test("koraki se zložijo v drevo po vrstnem redu, ne po vrsti iz baze", () => {
  const tree = buildTree([
    step("c", "a", 1),
    step("a", null, 0),
    step("b", "a", 0),
    step("d", null, 1),
  ]);
  assert.deepEqual(tree.map((n) => n.id), ["a", "d"]);
  assert.deepEqual(tree[0]!.children.map((n) => n.id), ["b", "c"]);
  assert.equal(tree[0]!.children[0]!.depth, 1);
});

test("korak, ki mu je starš izginil, obvisi na korenu in se ne izgubi", () => {
  const tree = buildTree([step("a", "ni-ga", 0), step("b", null, 1)]);
  assert.deepEqual(tree.map((n) => n.id), ["a", "b"]);
});

test("korak, ki bi bil sam sebi starš, ne naredi kroga", () => {
  const tree = buildTree([step("a", "a", 0)]);
  assert.deepEqual(tree.map((n) => n.id), ["a"]);
  assert.equal(tree[0]!.children.length, 0);
});

test("odprta vprašanja: eno na vrstico, brez praznih in brez vodilnih črtic", () => {
  assert.deepEqual(openQuestions("Kdo plača poštnino\n\n– Rok vračila\n  "), ["Kdo plača poštnino", "Rok vračila"]);
  assert.deepEqual(openQuestions(null), []);
  // Iz brskalnika pridejo prelomi kot CRLF.
  assert.deepEqual(openQuestions("Prvo\r\nDrugo"), ["Prvo", "Drugo"]);
});

test("rdeči seznam nastane iz korakov in pozna, iz katerega je", () => {
  const branches = [{ id: "b1", key: "A", title: "Vračilo" }, { id: "b2", key: "B", title: "Sledenje" }];
  const steps = [
    step("s1", null, 0, { title: "Pišemo, kam vrniti", open: "Naslov skladišča\nKdo plača poštnino" }),
    step("s2", null, 1, { title: "Brez vprašanj" }),
    step("s3", null, 0, { branchId: "b2", title: "Ročna pomoč", open: "Kdaj je izgubljen" }),
  ];
  const open = collectOpen(branches, steps);
  assert.deepEqual(open.map((g) => [g.key, g.items.length]), [["A", 2], ["B", 1]]);
  assert.equal(open[0]!.items[0]!.step, "Pišemo, kam vrniti");
});

test("veja brez odprtih vprašanj v rdečem seznamu ne stoji prazna", () => {
  const open = collectOpen([{ id: "b1", key: "A", title: "Vračilo" }], [step("s1", null, 0)]);
  assert.deepEqual(open, []);
});

test("premik zamenja soseda in pusti seznam pri miru, kadar se ni imelo kam", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(moved(list, "b", -1)?.map((i) => i.id), ["b", "a", "c"]);
  assert.deepEqual(moved(list, "c", 1), null);
  assert.deepEqual(moved(list, "ni-ga", 1), null);
  assert.deepEqual(list.map((i) => i.id), ["a", "b", "c"]);
});

test("po premiku so pozicije spet zaporedne", () => {
  assert.deepEqual(reindex([{ id: "x" }, { id: "y" }]), [{ id: "x", position: 0 }, { id: "y", position: 1 }]);
});

test("neznana vrsta koraka se ne shrani", () => {
  assert.ok(isProcessKind("undef"));
  assert.ok(!isProcessKind("karkoli"));
  assert.ok(!isProcessKind(null));
});

const H = () => 80;

test("razcep se razpre vodoravno, veriga teče navzdol", () => {
  const tree = buildTree([
    step("q", null, 0, { kind: "dec", title: "Vprašanje" }),
    step("da", "q", 0, { edgeLabel: "DA" }),
    step("ne", "q", 1, { edgeLabel: "NE" }),
    step("naprej", null, 1),
  ]);
  const { placed, edges, width } = layoutBranch(tree, H);

  const at = (id: string) => placed.find((p) => p.node.id === id)!;
  assert.ok(at("da").y > at("q").y, "otrok je pod staršem");
  assert.equal(at("da").y, at("ne").y, "sestri stojita v isti vrsti");
  assert.ok(at("ne").x > at("da").x, "sestri se ne prekrivata");
  assert.ok(at("naprej").y > at("da").y, "veriga se nadaljuje pod razcepom");
  assert.ok(width >= 2 * NODE_W, "razcep razširi platno");

  // Obe poti se stečeta nazaj v naslednji člen verige.
  assert.equal(edges.length, 4);
  assert.equal(edges.filter((e) => e.label === "DA").length, 1);
});

test("zaključek in nedefinirano poti ne peljeta naprej", () => {
  const tree = buildTree([
    step("q", null, 0, { kind: "dec" }),
    step("konec", "q", 0, { kind: "end" }),
    step("odprto", "q", 1, { kind: "undef" }),
    step("naprej", null, 1),
  ]);
  const { edges } = layoutBranch(tree, H);
  // Samo dve povezavi navzdol iz vprašanja; nič se ne steka v "naprej".
  assert.equal(edges.length, 2);
});

test("prazna veja ne razpade", () => {
  const { placed, edges, width, height } = layoutBranch([], H);
  assert.deepEqual(placed, []);
  assert.deepEqual(edges, []);
  assert.ok(width > 0 && height > 0);
});
