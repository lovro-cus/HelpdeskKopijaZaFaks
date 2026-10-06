"use client";

import { useActionState, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ChevronDown, ChevronUp, CornerDownRight, Pencil, Plus, Trash2 } from "lucide-react";

import {
  moveBranch,
  moveStep,
  removeBranch,
  removeStep,
  saveBranch,
  saveStep,
  type ProcessState,
} from "@/lib/actions/process";
import {
  PROCESS_KINDS,
  buildTree,
  layoutBranch,
  openQuestions,
  type Placed,
  type ProcessKind,
  type StepRow,
} from "@/lib/process";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { Notice } from "./ui";
import { Sheet } from "./Sheet";

const initial: ProcessState = {};

export type BranchRow = { id: string; key: string; title: string; subtitle: string | null; position: number };

type Editing =
  | { what: "branch"; branch?: BranchRow }
  | { what: "step"; branchId: string; parentId?: string | null; step?: StepRow };

/**
 * Zapisan potek kot diagram: oblika pove vrsto koraka, puščica pot.
 *
 * Postavitve ne riše nihče. Koraki so drevo, postavitev pa se izračuna iz
 * izmerjenih višin — kdor doda korak, dobi risbo, ki še vedno drži skupaj. To
 * je pogoj, da zapis sme urejati vsak in zato ostane živ.
 */
export function ProcessMap({ branches, steps }: { branches: BranchRow[]; steps: StepRow[] }) {
  const t = useT();
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);

  return (
    <div className="grid gap-6">
      {branches.map((branch, index) => (
        <section key={branch.id} className="pm-branch">
          <header className="pm-branch-head">
            <span className="pm-key mono">{branch.key}</span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold leading-tight tracking-[-0.012em]">{branch.title}</h2>
              {branch.subtitle && <p className="mt-0.5 text-[11.5px] text-label-3">{branch.subtitle}</p>}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <MoveButtons action={moveBranch} name="branchId" value={branch.id} first={index === 0} last={index === branches.length - 1} />
              <button type="button" className="btn btn-sm px-1.5" title={t("process.edit")} aria-label={t("process.edit")} onClick={() => setEditing({ what: "branch", branch })}>
                <Pencil size={13} />
              </button>
              <DeleteButton action={removeBranch} name="branchId" value={branch.id} />
            </div>
          </header>

          <BranchCanvas
            steps={steps.filter((step) => step.branchId === branch.id)}
            onEdit={setEditing}
            branchId={branch.id}
          />
        </section>
      ))}

      <div>
        <button type="button" className="btn btn-sm" onClick={() => setEditing({ what: "branch" })}>
          <Plus size={13} />
          {t("process.addBranch")}
        </button>
      </div>

      {editing?.what === "branch" && (
        <BranchSheet branch={editing.branch} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />
      )}
      {editing?.what === "step" && (
        <StepSheet
          branchId={editing.branchId}
          parentId={editing.parentId ?? null}
          step={editing.step}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

/**
 * Ena veja na svojem platnu.
 *
 * Vozlišča najprej izrišemo, da jih brskalnik izmeri (besedilo se lomi po svoje
 * in ocena višine bi prej ali slej lagala), šele nato jih postavimo. Prvi izris
 * je zato skrit — brez tega bi risba ob vsakem odprtju enkrat poskočila.
 */
function BranchCanvas({
  steps,
  branchId,
  onEdit,
}: {
  steps: StepRow[];
  branchId: string;
  onEdit: (e: Editing) => void;
}) {
  const t = useT();
  const tree = useMemo(() => buildTree(steps), [steps]);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const refs = useRef(new Map<string, HTMLDivElement>());

  useLayoutEffect(() => {
    const next: Record<string, number> = {};
    // Pravokotnik je v zaslonskih pikslih; ob povečavi vmesnika (CSS zoom) ga
    // vrnemo v piksle risbe, sicer se vozlišča razmaknejo za faktor povečave.
    for (const [id, element] of refs.current) {
      const zoom = (element as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom ?? 1;
      next[id] = Math.ceil(element.getBoundingClientRect().height / zoom);
    }
    setHeights((current) => {
      const same = steps.every((step) => current[step.id] === next[step.id]);
      return same ? current : next;
    });
  }, [steps]);

  const measured = steps.length === 0 || steps.every((step) => heights[step.id] !== undefined);
  const { placed, edges, width, height } = useMemo(
    () => layoutBranch(tree, (id) => heights[id] ?? 74),
    [tree, heights],
  );

  if (steps.length === 0) {
    return (
      <div className="pm-canvas-empty">
        <p className="text-[12.5px] text-label-3">{t("process.emptyBranch")}</p>
        <AddStepButton branchId={branchId} parentId={null} onEdit={onEdit} />
      </div>
    );
  }

  return (
    <div className="pm-canvas-wrap">
      <div className="pm-canvas" style={{ width, height, opacity: measured ? 1 : 0 }}>
        <svg className="pm-wires" width={width} height={height} aria-hidden focusable="false">
          <defs>
            <marker id="pm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
              <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--rule-ink)" />
            </marker>
          </defs>
          {edges.map((edge, index) => (
            <g key={index}>
              <path className="pm-wire" d={edge.d} markerEnd="url(#pm-arrow)" />
              {edge.label && (
                <text className="pm-wire-label mono" x={edge.labelX} y={edge.labelY}>{edge.label}</text>
              )}
            </g>
          ))}
        </svg>

        {placed.map((item) => (
          <StepBox
            key={item.node.id}
            item={item}
            branchId={branchId}
            onEdit={onEdit}
            innerRef={(element) => {
              if (element) refs.current.set(item.node.id, element);
              else refs.current.delete(item.node.id);
            }}
            siblings={placed.filter((other) => other.node.parentId === item.node.parentId).length}
            index={placed.filter((other) => other.node.parentId === item.node.parentId).findIndex((other) => other.node.id === item.node.id)}
          />
        ))}
      </div>

      <div className="mt-1 px-3 pb-3">
        <AddStepButton branchId={branchId} parentId={null} onEdit={onEdit} />
      </div>
    </div>
  );
}

function AddStepButton({ branchId, parentId, onEdit }: { branchId: string; parentId: string | null; onEdit: (e: Editing) => void }) {
  const t = useT();
  return (
    <button type="button" className="btn btn-sm" onClick={() => onEdit({ what: "step", branchId, parentId })}>
      <Plus size={13} />
      {t("process.addStep")}
    </button>
  );
}

function StepBox({
  item,
  branchId,
  onEdit,
  innerRef,
  siblings,
  index,
}: {
  item: Placed;
  branchId: string;
  onEdit: (e: Editing) => void;
  innerRef: (element: HTMLDivElement | null) => void;
  siblings: number;
  index: number;
}) {
  const t = useT();
  const node = item.node;
  const kind = ((PROCESS_KINDS as readonly string[]).includes(node.kind) ? node.kind : "act") as ProcessKind;
  const questions = openQuestions(node.open);

  return (
    <div className="pm-node" style={{ left: item.x, top: item.y, width: item.w }} data-kind={kind}>
      {/* Romb odločitve nosi samo vprašanje; podrobnost in odprta vprašanja
          stojijo pod njim, ker bi jih poševnica sicer odrezala. */}
      <div ref={innerRef} className="pm-node-inner">
        <div className="pm-node-body">
          <p className="pm-node-title">{node.title}</p>
          {kind !== "dec" && node.body && <p className="pm-node-sub">{node.body}</p>}
          {kind !== "dec" && questions.length > 0 && (
            <ul className="pm-node-open">
              {questions.map((question, i) => (
                <li key={i} className="mono">{question}</li>
              ))}
            </ul>
          )}
        </div>
        {kind === "dec" && (node.body || questions.length > 0) && (
          <div className="pm-node-caption">
            {node.body && <p className="pm-node-sub">{node.body}</p>}
            {questions.length > 0 && (
              <ul className="pm-node-open">
                {questions.map((question, i) => (
                  <li key={i} className="mono">{question}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="pm-tools">
        <MoveButtons action={moveStep} name="stepId" value={node.id} first={index === 0} last={index === siblings - 1} />
        <button type="button" className="btn btn-sm px-1.5" title={t("process.addChild")} aria-label={t("process.addChild")} onClick={() => onEdit({ what: "step", branchId, parentId: node.id })}>
          <CornerDownRight size={13} />
        </button>
        <button type="button" className="btn btn-sm px-1.5" title={t("process.edit")} aria-label={t("process.edit")} onClick={() => onEdit({ what: "step", branchId, step: node })}>
          <Pencil size={13} />
        </button>
        <DeleteButton action={removeStep} name="stepId" value={node.id} />
      </div>
    </div>
  );
}

/** Gor/dol sta lastna obrazca, ker vsak pošlje svojo smer. */
function MoveButtons({
  action,
  name,
  value,
  first,
  last,
}: {
  action: (prev: ProcessState, fd: FormData) => Promise<ProcessState>;
  name: string;
  value: string;
  first: boolean;
  last: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [state, submit] = useActionState(action, initial);
  useEffect(() => { if (state.ok) router.refresh(); }, [state, router]);
  if (first && last) return null;
  return (
    <form action={submit} className="contents">
      <input type="hidden" name={name} value={value} />
      <button type="submit" name="direction" value="up" disabled={first} className="btn btn-sm px-1.5" title={t("process.moveUp")} aria-label={t("process.moveUp")}>
        <ChevronUp size={13} />
      </button>
      <button type="submit" name="direction" value="down" disabled={last} className="btn btn-sm px-1.5" title={t("process.moveDown")} aria-label={t("process.moveDown")}>
        <ChevronDown size={13} />
      </button>
    </form>
  );
}

/** Brisanje v dveh potezah: drugi klik potrdi. Brez okenca, ki ga nihče ne bere. */
function DeleteButton({
  action,
  name,
  value,
}: {
  action: (prev: ProcessState, fd: FormData) => Promise<ProcessState>;
  name: string;
  value: string;
}) {
  const t = useT();
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [state, submit] = useActionState(action, initial);
  useEffect(() => { if (state.ok) router.refresh(); }, [state, router]);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <button type="button" className="btn btn-sm px-1.5" title={t("process.delete")} aria-label={t("process.delete")} onClick={() => setArmed(true)}>
        <Trash2 size={13} />
      </button>
    );
  }
  return (
    <form action={submit}>
      <input type="hidden" name={name} value={value} />
      <button type="submit" className="btn btn-sm btn-destructive px-2">{t("process.confirmDelete")}</button>
    </form>
  );
}

function BranchSheet({ branch, onClose, onSaved }: { branch?: BranchRow; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [state, submit] = useActionState(saveBranch, initial);
  useEffect(() => { if (state.ok) onSaved(); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet title={branch ? t("process.editBranch") : t("process.addBranch")} onClose={onClose} width={520}>
      <form action={submit} className="grid gap-3 border-t px-5 py-4" style={{ borderColor: "var(--rule)" }}>
        {branch && <input type="hidden" name="branchId" value={branch.id} />}
        <div className="grid gap-3 sm:grid-cols-[90px_1fr]">
          <label>
            <span className="field-label">{t("process.field.key")}</span>
            <input name="key" defaultValue={branch?.key ?? ""} maxLength={4} className="field mono mt-1" />
          </label>
          <label>
            <span className="field-label">{t("process.field.title")}</span>
            <input name="title" defaultValue={branch?.title ?? ""} maxLength={120} required className="field mt-1" />
          </label>
        </div>
        <label>
          <span className="field-label">{t("process.field.subtitle")}</span>
          <input name="subtitle" defaultValue={branch?.subtitle ?? ""} maxLength={160} className="field mt-1" />
        </label>
        {state.error && <Notice kind="error">{state.error}</Notice>}
        <SheetButtons onClose={onClose} />
      </form>
    </Sheet>
  );
}

function StepSheet({
  branchId,
  parentId,
  step,
  onClose,
  onSaved,
}: {
  branchId: string;
  parentId: string | null;
  step?: StepRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [state, submit] = useActionState(saveStep, initial);
  useEffect(() => { if (state.ok) onSaved(); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet
      title={step ? t("process.editStep") : parentId ? t("process.addChild") : t("process.addStep")}
      onClose={onClose}
      width={560}
    >
      <form action={submit} className="grid gap-3 border-t px-5 py-4" style={{ borderColor: "var(--rule)" }}>
        <input type="hidden" name="branchId" value={branchId} />
        {step ? <input type="hidden" name="stepId" value={step.id} /> : parentId && <input type="hidden" name="parentId" value={parentId} />}

        <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
          <label>
            <span className="field-label">{t("process.field.kind")}</span>
            <select name="kind" defaultValue={step?.kind ?? "act"} className="field mt-1">
              {PROCESS_KINDS.map((kind) => (
                <option key={kind} value={kind}>{t(`process.kind.${kind}` as TranslationKey)}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">{t("process.field.edgeLabel")}</span>
            <input name="edgeLabel" defaultValue={step?.edgeLabel ?? ""} maxLength={40} placeholder={t("process.field.edgePlaceholder")} className="field mono mt-1" />
          </label>
        </div>

        <label>
          <span className="field-label">{t("process.field.title")}</span>
          <input name="title" defaultValue={step?.title ?? ""} maxLength={160} required className="field mt-1" />
        </label>

        <label>
          <span className="field-label">{t("process.field.body")}</span>
          <textarea name="body" defaultValue={step?.body ?? ""} rows={2} maxLength={400} className="field mt-1" />
        </label>

        <label>
          <span className="field-label">{t("process.field.open")}</span>
          <textarea name="open" defaultValue={step?.open ?? ""} rows={4} maxLength={1200} placeholder={t("process.field.openPlaceholder")} className="field mt-1" />
          <span className="mt-1 block text-[11.5px] text-label-3">{t("process.field.openHint")}</span>
        </label>

        {state.error && <Notice kind="error">{state.error}</Notice>}
        <SheetButtons onClose={onClose} />
      </form>
    </Sheet>
  );
}

function SheetButtons({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <div className="mt-1 flex justify-end gap-2">
      <button type="button" className="btn btn-sm" onClick={onClose}>{t("common.cancel")}</button>
      <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
        {pending ? t("common.saving") : t("common.save")}
      </button>
    </div>
  );
}
