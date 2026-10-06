"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { GripVertical, Package, Plus, RefreshCw, Trash2, X } from "lucide-react";

import {
  assignProduct,
  createGroup,
  deleteGroup,
  dismissSuggestion,
  joinGroup,
  removeAlias,
  setProductLanguage,
  updateGroup,
  type ProductsState,
} from "@/lib/actions/catalog-products";
import { NEW_GROUP, shortLabel } from "@/lib/catalog-suggest";
import { useT } from "@/lib/i18n/client";
import { Notice } from "../ui";

export type AdminProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  language: string | null;
  thumb: string | null;
  groupId: string | null;
  missing: boolean;
  variants: number;
};

export type AdminGroup = { id: string; key: string; label: string; genderAgnostic: boolean; aliases: string[] };

export type AdminSuggestion =
  | { kind: "join"; groupId: string; productIds: string[] }
  | { kind: "new"; productIds: string[]; label: string };


const DRAG_TYPE = "application/x-helpdesk-product";
const MOVE_NEW = "__move_new";
const initial: ProductsState = {};

const byLanguage = (a: AdminProduct, b: AdminProduct) =>
  (a.language ?? "zz").localeCompare(b.language ?? "zz") || a.title.localeCompare(b.title);

/**
 * Izdelki in skupine.
 *
 * Skupina je en fizični kos v vseh jezikih trgovine. Admin jo sestavi tako, da
 * potrdi predlog (iste fotografije), izdelek povleče v skupino ali mu jo izbere v
 * meniju vrstice — vlečenje je bližnjica, meni je pot, ki deluje povsod.
 */
export function AdminProducts({ products, groups, suggestions, languages }: {
  products: AdminProduct[];
  groups: AdminGroup[];
  suggestions: AdminSuggestion[];
  /** Kode jezikov iz šifranta (Admin → Jeziki). */
  languages: string[];
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const byId = new Map(products.map((product) => [product.id, product]));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const ungrouped = products.filter((product) => !product.groupId && !product.missing).sort(byLanguage);
  const gone = products.filter((product) => !product.groupId && product.missing);

  function run(action: () => Promise<ProductsState>) {
    startTransition(async () => {
      const result = await action();
      setError(result.error ?? null);
      if (!result.error) router.refresh();
    });
  }

  function move(productId: string, target: string) {
    const product = byId.get(productId);
    if (!product) return;
    if (target === MOVE_NEW) run(() => createGroup(shortLabel([product.title]), [productId]));
    else if ((target || null) !== product.groupId) run(() => assignProduct(productId, target || null));
  }

  const row = (product: AdminProduct, compact = false) => (
    <ProductRow
      key={product.id}
      product={product}
      groups={groups}
      languages={languages}
      compact={compact}
      dragging={dragging === product.id}
      onDragStart={() => setDragging(product.id)}
      onDragEnd={() => setDragging(null)}
      onMove={(target) => move(product.id, target)}
      onLanguage={(language) => run(() => setProductLanguage(product.id, language))}
    />
  );

  return (
    <div className="grid gap-8" aria-busy={pending}>

      {error && <Notice kind="error">{error}</Notice>}

      {suggestions.length > 0 && (
        <section>
          <SectionHead title={t("products.suggestions")} count={suggestions.length} hint={t("products.suggestions.hint")} />
          <div className="grid gap-3 lg:grid-cols-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={`${suggestion.kind}:${suggestion.kind === "join" ? suggestion.groupId : ""}:${suggestion.productIds.join(",")}`}
                suggestion={suggestion}
                group={suggestion.kind === "join" ? groupById.get(suggestion.groupId) ?? null : null}
                products={suggestion.productIds.flatMap((id) => byId.get(id) ?? [])}
                busy={pending}
                onConfirm={(picked, label) => run(() => suggestion.kind === "join" ? joinGroup(suggestion.groupId, picked) : createGroup(label, picked))}
                onReject={() => run(() => dismissSuggestion(suggestion.productIds, suggestion.kind === "join" ? suggestion.groupId : NEW_GROUP))}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHead
          title={t("products.groups")}
          count={groups.length}
          hint={t("products.groups.hint")}
          action={(
            <button type="button" className="btn btn-sm" onClick={() => setAdding((open) => !open)} aria-expanded={adding}>
              <Plus size={14} />
              {t("products.group.add")}
            </button>
          )}
        />
        {adding && (
          <NewGroupForm
            busy={pending}
            onCancel={() => setAdding(false)}
            onCreate={(label) => { setAdding(false); run(() => createGroup(label, [])); }}
          />
        )}
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              products={products.filter((product) => product.groupId === group.id).sort(byLanguage)}
              dropActive={dragging !== null && byId.get(dragging)?.groupId !== group.id}
              onDropProduct={(productId) => move(productId, group.id)}
              onRename={(label) => run(() => updateGroup(group.id, { label }))}
              onGenderAgnostic={(value) => run(() => updateGroup(group.id, { genderAgnostic: value }))}
              onDelete={() => run(() => deleteGroup(group.id))}
              onRemoveAlias={(alias) => run(() => removeAlias(group.id, alias))}
              renderRow={(product) => row(product, true)}
            />
          ))}
          <DropZone
            active={dragging !== null}
            onDropProduct={(productId) => move(productId, MOVE_NEW)}
            className="flex min-h-[88px] items-center justify-center border border-dashed px-4 text-center text-[12.5px]"
            style={{ borderColor: "var(--rule-strong)", color: "var(--ink-2)" }}
          >
            {t("products.group.dropNew")}
          </DropZone>
        </div>
      </section>

      <section>
        <SectionHead title={t("products.ungrouped")} count={ungrouped.length} hint={t("products.ungrouped.hint")} />
        <DropZone
          active={dragging !== null && Boolean(byId.get(dragging)?.groupId)}
          onDropProduct={(productId) => move(productId, "")}
          className="card overflow-hidden"
        >
          {ungrouped.length === 0
            ? <p className="px-4 py-5 text-[12.5px] text-label-2">{t("products.ungrouped.empty")}</p>
            : <ul>{ungrouped.map((product) => row(product))}</ul>}
        </DropZone>
      </section>

      {gone.length > 0 && (
        <details className="group">
          <summary className="caption cursor-pointer list-none [&::-webkit-details-marker]:hidden" style={{ color: "var(--ink-2)" }}>
            {t("products.missing", { count: gone.length })}
          </summary>
          <div className="card mt-2 overflow-hidden"><ul>{gone.map((product) => row(product))}</ul></div>
        </details>
      )}
    </div>
  );
}

function SectionHead({ title, count, hint, action }: { title: string; count: number; hint: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-baseline gap-2 text-[15px] font-semibold tracking-[-0.012em]">
          {title}
          <span className="mono text-[12px] font-normal text-label-3">{count}</span>
        </h2>
        {action}
      </div>
      <p className="mt-1 max-w-[70ch] text-[12.5px] text-label-2">{hint}</p>
    </div>
  );
}

function SuggestionCard({ suggestion, group, products, busy, onConfirm, onReject }: {
  suggestion: AdminSuggestion;
  group: AdminGroup | null;
  products: AdminProduct[];
  busy: boolean;
  onConfirm: (picked: string[], label: string) => void;
  onReject: () => void;
}) {
  const t = useT();
  const [picked, setPicked] = useState(() => new Set(suggestion.productIds));
  const [label, setLabel] = useState(suggestion.kind === "new" ? suggestion.label : "");
  const join = suggestion.kind === "join";

  const toggle = (id: string) => setPicked((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div className="card overflow-hidden" style={{ borderTop: "2px solid var(--petrol)" }}>
      <div className="px-3 pb-2.5 pt-3">
        <p className="text-[13.5px] font-semibold">
          {join ? t("products.suggest.join", { group: group?.label ?? "—" }) : t("products.suggest.new")}
        </p>
        <p className="mt-0.5 text-[12px] text-label-2">{join ? t("products.suggest.joinHint") : t("products.suggest.newHint")}</p>
        {!join && (
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={60}
            aria-label={t("products.group.name")}
            className="field mt-2.5 h-[30px] font-medium"
          />
        )}
      </div>
      <ul>
        {products.map((product) => (
          <li key={product.id} className="border-t" style={{ borderColor: "var(--rule)" }}>
            <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2">
              <input
                type="checkbox"
                checked={picked.has(product.id)}
                onChange={() => toggle(product.id)}
                className="h-[14px] w-[14px] shrink-0 accent-[var(--petrol)]"
              />
              <Thumb src={product.thumb} />
              <LanguageStamp language={product.language} />
              <span className="min-w-0 flex-1 truncate text-[13px]">{product.title}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap justify-end gap-2 border-t px-3 py-2.5" style={{ borderColor: "var(--rule)" }}>
        <button type="button" className="btn btn-sm" onClick={onReject} disabled={busy}>{t("products.suggest.reject")}</button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy || picked.size === 0 || (!join && !label.trim())}
          onClick={() => onConfirm([...picked], label)}
        >
          {join ? t("products.suggest.confirmJoin", { count: picked.size }) : t("products.suggest.confirmNew")}
        </button>
      </div>
    </div>
  );
}

function GroupCard({ group, products, dropActive, onDropProduct, onRename, onGenderAgnostic, onDelete, onRemoveAlias, renderRow }: {
  group: AdminGroup;
  products: AdminProduct[];
  dropActive: boolean;
  onDropProduct: (productId: string) => void;
  onRename: (label: string) => void;
  onGenderAgnostic: (value: boolean) => void;
  onDelete: () => void;
  onRemoveAlias: (alias: string) => void;
  renderRow: (product: AdminProduct) => React.ReactNode;
}) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const languages = [...new Set(products.map((product) => product.language).filter((language): language is string => Boolean(language)))];

  return (
    <DropZone
      active={dropActive}
      onDropProduct={onDropProduct}
      className="card overflow-hidden"
      style={{ borderTop: "2px solid var(--rule-ink)" }}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <input
          key={group.label}
          defaultValue={group.label}
          maxLength={60}
          aria-label={t("products.group.name")}
          onBlur={(event) => {
            const value = event.currentTarget.value.trim();
            if (value && value !== group.label) onRename(value);
          }}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          className="field h-[30px] min-w-0 flex-1 text-[13.5px] font-semibold"
        />
        {confirming ? (
          <>
            <button type="button" className="btn btn-sm btn-destructive" onClick={onDelete}>{t("products.group.deleteConfirm")}</button>
            <button type="button" className="btn btn-sm px-1.5" onClick={() => setConfirming(false)} aria-label={t("common.cancel")}><X size={14} /></button>
          </>
        ) : (
          <button type="button" className="btn btn-sm btn-plain px-1.5" onClick={() => setConfirming(true)} title={t("products.group.delete")} aria-label={t("products.group.delete")}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 pb-2.5 pt-2">
        <span className="mono text-[10.5px] text-label-3" title={t("products.group.key")}>{group.key}</span>
        {languages.length > 0 && (
          <span className="flex flex-wrap gap-1">{languages.map((language) => <LanguageStamp key={language} language={language} />)}</span>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-[12px] text-label-2">
          <input
            type="checkbox"
            defaultChecked={group.genderAgnostic}
            onChange={(event) => onGenderAgnostic(event.currentTarget.checked)}
            className="h-[14px] w-[14px] accent-[var(--petrol)]"
          />
          {t("products.group.genderAgnostic")}
        </label>
      </div>

      {products.length === 0 ? (
        <p className="border-t px-3 py-4 text-center text-[12.5px] text-label-2" style={{ borderColor: "var(--rule)" }}>{t("products.group.drop")}</p>
      ) : (
        <ul>{products.map(renderRow)}</ul>
      )}

      {group.aliases.length > 0 && (
        <div className="border-t px-3 py-2.5" style={{ borderColor: "var(--rule)" }}>
          <p className="caption" title={t("products.group.aliasesHint")}>{t("products.group.aliases")}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {group.aliases.map((alias) => (
              <li key={alias} className="flex items-center gap-1 border py-0.5 pl-2 pr-0.5 text-[11.5px] text-label-2" style={{ borderColor: "var(--rule)" }}>
                {alias}
                <button type="button" className="btn btn-sm btn-plain h-[20px] px-1" onClick={() => onRemoveAlias(alias)} aria-label={t("products.group.removeAlias")}>
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DropZone>
  );
}

function ProductRow({ product, groups, languages, compact, dragging, onDragStart, onDragEnd, onMove, onLanguage }: {
  product: AdminProduct;
  groups: AdminGroup[];
  languages: string[];
  /** V kartici skupine: namesto izbire skupine samo "odstrani iz skupine". */
  compact: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (target: string) => void;
  onLanguage: (language: string | null) => void;
}) {
  const t = useT();
  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE, product.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-x-2.5 gap-y-1.5 border-t px-3 py-2 first:border-t-0 ${compact ? "" : "flex-wrap sm:flex-nowrap"}`}
      style={{ borderColor: "var(--rule)", opacity: dragging ? 0.45 : 1 }}
    >
      <span className="hidden cursor-grab text-label-3 sm:inline-flex" title={t("products.dragHint")} aria-hidden>
        <GripVertical size={14} />
      </span>
      <Thumb src={product.thumb} />
      {/* .field je širok 100 %; širino drži ovoj, ne razred na polju. */}
      <span className="w-[54px] shrink-0">
        <select
          value={product.language ?? ""}
          onChange={(event) => onLanguage(event.target.value || null)}
          aria-label={t("products.language")}
          className="field mono h-[26px] px-1.5 text-[11px] uppercase"
        >
          <option value="">?</option>
          {[...new Set([...languages, ...(product.language ? [product.language] : [])])].map((language) => <option key={language} value={language}>{language}</option>)}
        </select>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium" title={product.title}>{product.title}</span>
        <span className="mono mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-label-3">
          <span className="truncate">{product.handle}</span>
          <span>{t("products.variants", { count: product.variants })}</span>
          {product.status !== "active" && <span className="pill">{t(product.status === "draft" ? "products.status.draft" : "products.status.archived")}</span>}
          {product.missing && <span className="pill">{t("products.status.missing")}</span>}
        </span>
      </span>
      {compact ? (
        <button
          type="button"
          className="btn btn-sm btn-plain shrink-0 px-1.5"
          onClick={() => onMove("")}
          title={t("products.removeFromGroup")}
          aria-label={t("products.removeFromGroup")}
        >
          <X size={14} />
        </button>
      ) : (
        <span className="w-full shrink-0 sm:w-[170px]">
          <select
            value={product.groupId ?? ""}
            onChange={(event) => onMove(event.target.value)}
            aria-label={t("products.move")}
            className="field h-[26px] text-[12px]"
          >
            <option value="">{t("products.move.none")}</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
            <option value={MOVE_NEW}>{t("products.move.new")}</option>
          </select>
        </span>
      )}
    </li>
  );
}

function NewGroupForm({ busy, onCancel, onCreate }: { busy: boolean; onCancel: () => void; onCreate: (label: string) => void }) {
  const t = useT();
  const [label, setLabel] = useState("");
  return (
    <form
      className="card mb-3 flex flex-wrap items-center gap-2 p-3"
      style={{ borderTop: "2px solid var(--petrol)" }}
      onSubmit={(event) => { event.preventDefault(); if (label.trim()) onCreate(label.trim()); }}
    >
      <input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        autoFocus
        maxLength={60}
        placeholder={t("products.group.name")}
        aria-label={t("products.group.name")}
        className="field h-[30px] min-w-[200px] flex-1"
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !label.trim()}>{t("products.group.create")}</button>
      <button type="button" className="btn btn-sm" onClick={onCancel}>{t("common.cancel")}</button>
    </form>
  );
}

/** Ploskev, ki sprejme povlečen izdelek; med vlečenjem nad njo pokaže, da ga bo. */
function DropZone({ active, onDropProduct, className, style, children }: {
  active: boolean;
  onDropProduct: (productId: string) => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (!active) setOver(false);
  }, [active]);

  return (
    <div
      onDragOver={(event) => {
        if (!active) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(event) => {
        if (!active) return;
        event.preventDefault();
        setOver(false);
        const productId = event.dataTransfer.getData(DRAG_TYPE);
        if (productId) onDropProduct(productId);
      }}
      className={className}
      style={{
        ...style,
        ...(over ? { outline: "1px dashed var(--petrol)", outlineOffset: "-1px", background: "var(--petrol-wash)" } : null),
      }}
    >
      {children}
    </div>
  );
}

function Thumb({ src }: { src: string | null }) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border"
      style={{ borderColor: "var(--rule)", background: "var(--sheet)" }}
    >
      {src ? (
        // Shopify CDN sliko že zmanjša; Next posredovanje bi bilo odveč.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : <Package size={15} className="text-label-3" />}
    </span>
  );
}

function LanguageStamp({ language }: { language: string | null }) {
  return (
    <span
      className="mono inline-flex h-[18px] min-w-[26px] shrink-0 items-center justify-center border px-1 text-[10px] uppercase tracking-[0.08em]"
      style={{ borderColor: "var(--rule-strong)", color: language ? "var(--ink-2)" : "var(--ink-3)" }}
    >
      {language ?? "?"}
    </span>
  );
}
