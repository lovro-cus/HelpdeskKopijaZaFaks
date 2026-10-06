"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ChevronDown, ChevronUp, Plus, RotateCcw, Trash2 } from "lucide-react";

import {
  createCategory,
  moveCategory,
  removeCategory,
  restoreCategory,
  updateAppSettings,
  updateCategory,
  type FormState,
} from "@/lib/actions/config";
import { SETTING_DEFS, TEXT_SETTING_DEFS, TEXT_SETTING_KEYS, type SettingKey, type Settings, type TextSettings } from "@/lib/config/defaults";
import { CATEGORY_COLORS, type CategoryKind } from "@/lib/config/shared";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { Notice } from "../ui";

const initial: FormState = {};

/**
 * Strani so dinamične, zato revalidatePath sam po sebi ne prereže tega, kar je
 * že na zaslonu — seznam po vsaki spremembi izrecno osvežimo.
 */
function useRefreshOnOk(state: FormState) {
  const router = useRouter();
  useEffect(() => {
    // initial je modulska konstanta: dokler je stanje ono, akcija še ni tekla.
    if (state !== initial) router.refresh();
  }, [state, router]);
}

export type CatalogRow = {
  id: string;
  kind: CategoryKind;
  key: string;
  label: string;
  rawLabel: string | null;
  colorToken: string | null;
  color: string;
  hidden: boolean;
  requiresReturn: boolean;
  watchFulfillment: boolean;
  builtin: boolean;
  /** Koliko tiketov to vrednost trenutno nosi — brisanje mora vedeti ceno. */
  used: number;
};

/**
 * Šifrant in številke na enem mestu. Vrstice so listi v registru: ime levo,
 * lastnosti ob njem, ukazi na desnem robu — enako kot pri uporabnikih, da se
 * admin ne uči dvakrat.
 */
export function AdminCatalog({ rows, settings, text }: { rows: CatalogRow[]; settings: Settings; text: TextSettings }) {
  const t = useT();

  return (
    <>
      <p className="mb-5 max-w-[640px] text-[13px] text-label-2">{t("catalog.intro")}</p>

      <Section
        kind="type"
        title={t("catalog.types")}
        hint={t("catalog.typesHint")}
        rows={rows.filter((row) => row.kind === "type")}
      />
      <Section
        kind="priority"
        title={t("catalog.priorities")}
        hint={t("catalog.prioritiesHint")}
        rows={rows.filter((row) => row.kind === "priority")}
      />
      <SettingsCard settings={settings} text={text} />
    </>
  );
}

// --- šifrant ---------------------------------------------------------------

function Section({
  kind,
  title,
  hint,
  rows,
}: {
  kind: CategoryKind;
  title: string;
  hint: string;
  rows: CatalogRow[];
}) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const visible = rows.filter((row) => !row.hidden);
  const hidden = rows.filter((row) => row.hidden);

  return (
    <section className="mb-7">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        <button type="button" className="btn btn-sm" onClick={() => setAdding((open) => !open)}>
          <Plus size={14} />
          {t("catalog.add")}
        </button>
      </div>
      <p className="mb-3 max-w-[640px] text-[12px] text-label-3">{hint}</p>

      {adding && <AddForm kind={kind} onDone={() => setAdding(false)} />}

      <div className="grid gap-2">
        {visible.map((row, index) => (
          <Row key={row.id} row={row} first={index === 0} last={index === visible.length - 1} />
        ))}
      </div>

      {hidden.length > 0 && (
        <div className="mt-3">
          <p className="caption mb-2">{t("catalog.hidden")}</p>
          <div className="grid gap-2">
            {hidden.map((row) => (
              <HiddenRow key={row.id} row={row} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AddForm({ kind, onDone }: { kind: CategoryKind; onDone: () => void }) {
  const t = useT();
  const [state, action] = useActionState(createCategory, initial);
  useRefreshOnOk(state);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="card mb-2.5 p-3" style={{ borderTop: "2px solid var(--petrol)" }}>
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-wrap items-end gap-2.5">
        <label className="grid flex-1 gap-1 text-[11.5px] text-label-2">
          {t("catalog.newLabel")}
          <input
            name="label"
            autoFocus
            maxLength={40}
            placeholder={t(kind === "type" ? "catalog.newPlaceholderType" : "catalog.newPlaceholderPriority")}
            className="field h-[32px]"
          />
        </label>
        {kind === "priority" && <ColorPicker />}
        <SubmitButton label={t("catalog.add")} />
        <button type="button" className="btn btn-sm" onClick={onDone}>
          {t("common.cancel")}
        </button>
      </div>
      {kind === "type" && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
          <label className="flex items-center gap-2 text-[12px]">
            <input type="checkbox" name="requiresReturn" className="accent-[var(--petrol)]" />
            {t("catalog.requiresReturn")}
          </label>
          <label className="flex items-center gap-2 text-[12px]">
            <input type="checkbox" name="watchFulfillment" className="accent-[var(--petrol)]" />
            {t("catalog.watchFulfillment")}
          </label>
        </div>
      )}
      {state.error && (
        <div className="mt-2.5">
          <Notice kind="error">{state.error}</Notice>
        </div>
      )}
    </form>
  );
}

function Row({ row, first, last }: { row: CatalogRow; first: boolean; last: boolean }) {
  const t = useT();
  const [state, action] = useActionState(updateCategory, initial);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  useRefreshOnOk(state);

  useEffect(() => {
    if (state.ok) setDirty(false);
  }, [state]);

  return (
    <div className="card overflow-hidden">
      {/* Ukazi za premik so lastni obrazci, zato ne smejo stati v obrazcu
          vrstice — gnezdenega obrazca brskalnik zavrže in gumb bi shranil ime
          namesto premaknil vrstico. Zato vrstico drži ta div, obrazec z imenom
          pa se vanj razlije z display:contents. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 p-3">
        <form action={action} onChange={() => setDirty(true)} className="contents">
          <input type="hidden" name="id" value={row.id} />

          {/* Poteza v barvi prioritete; pri vrstah je prostor prazen namenoma. */}
          <span
            aria-hidden
            className="inline-block h-[22px] w-[3px] shrink-0"
            style={{ background: row.kind === "priority" ? row.color : "var(--rule-strong)" }}
          />

          <input
            name="label"
            defaultValue={row.label}
            maxLength={40}
            aria-label={t("catalog.name")}
            className="field h-[32px] min-w-[140px] flex-1 font-medium"
          />

          {row.kind === "priority" && <ColorPicker value={row.colorToken} />}

          {row.kind === "type" && (
            <>
              <label className="flex items-center gap-2 text-[12px] text-label-2" title={t("catalog.requiresReturnHint")}>
                <input
                  type="checkbox"
                  name="requiresReturn"
                  defaultChecked={row.requiresReturn}
                  className="accent-[var(--petrol)]"
                />
                {t("catalog.requiresReturn")}
              </label>
              <label className="flex items-center gap-2 text-[12px] text-label-2" title={t("catalog.watchFulfillmentHint")}>
                <input
                  type="checkbox"
                  name="watchFulfillment"
                  defaultChecked={row.watchFulfillment}
                  className="accent-[var(--petrol)]"
                />
                {t("catalog.watchFulfillment")}
              </label>
            </>
          )}

          <span className="mono text-[11px] text-label-3" title={t("catalog.key")}>
            {row.key}
            {row.builtin && ` · ${t("catalog.builtin")}`}
          </span>

          <span className="mono text-[11px] text-label-3">
            {row.used > 0 ? t("catalog.used", { count: row.used }) : t("catalog.unused")}
          </span>

          {dirty && (
            <span className="ml-auto">
              <SubmitButton label={t("common.save")} />
            </span>
          )}
        </form>

        <div className={`flex items-center gap-1.5${dirty ? "" : " ml-auto"}`}>
          <MoveButton id={row.id} direction="up" disabled={first} title={t("catalog.up")} />
          <MoveButton id={row.id} direction="down" disabled={last} title={t("catalog.down")} />
          <button
            type="button"
            className="btn btn-sm btn-plain"
            title={t("catalog.remove")}
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {confirming && <RemovePanel row={row} onDone={() => setConfirming(false)} />}

      {state.error && (
        <div className="px-3 pb-3">
          <Notice kind="error">{state.error}</Notice>
        </div>
      )}
    </div>
  );
}

/**
 * Brisanje pove, kaj se bo zgodilo, preden se zgodi: neuporabljena vrednost
 * gre zares proč, uporabljena se samo skrije.
 */
function RemovePanel({ row, onDone }: { row: CatalogRow; onDone: () => void }) {
  const t = useT();
  const [state, action] = useActionState(removeCategory, initial);
  useRefreshOnOk(state);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="border-t px-3 py-2.5" style={{ borderColor: "var(--rule)" }}>
      <input type="hidden" name="id" value={row.id} />
      <p className="mb-2 text-[12.5px] text-label-2">
        {row.used > 0 || row.builtin ? t("catalog.hiddenHint") : t("catalog.unused")}
      </p>
      {state.error && (
        <div className="mb-2">
          <Notice kind="error">{state.error}</Notice>
        </div>
      )}
      <div className="flex gap-2">
        <SubmitButton label={t("catalog.remove")} danger />
        <button type="button" className="btn btn-sm" onClick={onDone}>
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}

function HiddenRow({ row }: { row: CatalogRow }) {
  const t = useT();
  const [state, action] = useActionState(restoreCategory, initial);
  useRefreshOnOk(state);

  return (
    <form action={action} className="card flex items-center gap-3 p-2.5" style={{ opacity: 0.62 }}>
      <input type="hidden" name="id" value={row.id} />
      <span className="text-[13px]">{row.label}</span>
      <span className="mono text-[11px] text-label-3">
        {row.used > 0 ? t("catalog.used", { count: row.used }) : t("catalog.unused")}
      </span>
      <button type="submit" className="btn btn-sm ml-auto">
        <RotateCcw size={13} />
        {t("catalog.restore")}
      </button>
    </form>
  );
}

function MoveButton({
  id,
  direction,
  disabled,
  title,
}: {
  id: string;
  direction: "up" | "down";
  disabled: boolean;
  title: string;
}) {
  const [state, action] = useActionState(moveCategory, initial);
  useRefreshOnOk(state);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <button type="submit" className="btn btn-sm btn-plain" disabled={disabled} title={title} aria-label={title}>
        {direction === "up" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
    </form>
  );
}

function ColorPicker({ value }: { value?: string | null }) {
  const t = useT();
  return (
    <label className="flex items-center gap-1.5 text-[11.5px] text-label-2">
      {t("catalog.color")}
      <select name="color" defaultValue={value ?? ""} className="field h-[32px] w-[104px] text-[12px]">
        <option value="">—</option>
        {CATEGORY_COLORS.map((token) => (
          <option key={token} value={token}>
            {token}
          </option>
        ))}
      </select>
    </label>
  );
}

// --- številke --------------------------------------------------------------

const GROUPS: { title: TranslationKey; keys: SettingKey[] }[] = [
  { title: "catalog.group.storage", keys: ["storageFreeDays", "storageWarnDays", "storageRate"] },
  { title: "catalog.group.parcels", keys: ["parcelGraceHours", "parcelStaleHours", "parcelPollHours"] },
];

function SettingsCard({ settings, text }: { settings: Settings; text: TextSettings }) {
  const t = useT();
  const [state, action] = useActionState(updateAppSettings, initial);
  useRefreshOnOk(state);

  return (
    <section>
      <h2 className="mb-2.5 text-[15px] font-semibold tracking-[-0.01em]">{t("catalog.settings")}</h2>
      <p className="mb-3 max-w-[640px] text-[12px] text-label-3">{t("catalog.settingsHint")}</p>

      <form action={action} className="card p-3.5">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-4 last:mb-0">
            <p className="caption mb-2">{t(group.title)}</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {group.keys.map((key) => (
                <label key={key} className="grid gap-1 text-[11.5px] text-label-2">
                  {t(`catalog.${key}` as TranslationKey)}
                  <input
                    name={key}
                    type="number"
                    inputMode="decimal"
                    step={SETTING_DEFS[key].kind === "money" ? "0.01" : "1"}
                    min={SETTING_DEFS[key].min}
                    max={SETTING_DEFS[key].max}
                    defaultValue={settings[key]}
                    className="field mono h-[32px]"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="mb-4">
          <p className="caption mb-2">{t("catalog.group.names")}</p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {TEXT_SETTING_KEYS.map((key) => (
              <label key={key} className="grid gap-1 text-[11.5px] text-label-2">
                {t(`catalog.${key}` as TranslationKey)}
                <input
                  name={key}
                  type="text"
                  maxLength={TEXT_SETTING_DEFS[key].maxLength}
                  defaultValue={text[key]}
                  className="field h-[32px]"
                />
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] text-label-3">{t("catalog.supplierNameHint")}</p>
        </div>

        {state.error && (
          <div className="mb-3">
            <Notice kind="error">{state.error}</Notice>
          </div>
        )}
        {state.ok && (
          <div className="mb-3">
            <Notice kind="ok">{state.ok}</Notice>
          </div>
        )}

        <SubmitButton label={t("common.save")} primary />
      </form>
    </section>
  );
}

function SubmitButton({ label, primary, danger }: { label: string; primary?: boolean; danger?: boolean }) {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn btn-sm${primary ? " btn-primary" : ""}`}
      style={danger ? { color: "var(--stamp)", borderColor: "var(--stamp)" } : undefined}
    >
      {pending ? t("common.saving") : label}
    </button>
  );
}
