"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Check, Package, PackagePlus, Plus, X } from "lucide-react";

import { recordAnotherReturn, type RoundState } from "@/lib/actions/exchange-round";
import { imageOf, selectionOf } from "@/lib/catalog";
import type { ReturnRow } from "@/lib/exchange-round";
import { useT } from "@/lib/i18n/client";
import { Sheet } from "./Sheet";
import { Notice } from "./ui";

const initial: RoundState = {};

export type PackageOption = {
  id: string;
  sender: string;
  arrived: string;
  weight: string | null;
  tracking: string | null;
};

type Packages = { suggested: PackageOption[]; other: PackageOption[] };
type Suggestion = { newRound: boolean; rows: ReturnRow[] };

const OTHER = "__other";
const NONE = "__none";

/**
 * Še en paket istega ticketa. Gumb stoji ob "Poglej v ShipG", ker je to delo
 * registra; obrazec je dvignjen list, ker gre za samostojno opravilo, ki ne sme
 * razmakniti glave zapisa.
 */
export function AnotherReturnForm({
  issueId,
  orderNumber,
  nextRound,
  blocked,
  suggestion,
  packages,
  label,
}: {
  /** Krajši napis gumba, kadar skupina okoli njega že pove, da gre za skladišče. */
  label?: string;
  issueId: number;
  orderNumber: string;
  nextRound: number;
  /** Zakaj ta hip ni mogoče (rezerviran paket še ni odšel). */
  blocked: string | null;
  suggestion: Suggestion;
  packages: Packages;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  // Stabilna referenca: list ob vsaki novi funkciji znova zaklene drsenje strani.
  const close = useCallback(() => setOpen(false), []);
  const finish = useCallback(() => {
    setOpen(false);
    setDone(true);
    // revalidatePath trenutne dinamične strani ne nariše znova.
    router.refresh();
  }, [router]);

  return (
    <>
      <button
        type="button"
        className="btn btn-sm"
        disabled={Boolean(blocked)}
        title={blocked ?? undefined}
        onClick={() => { setDone(false); setOpen(true); }}
      >
        <PackagePlus size={14} />
        {label ?? t("round.return")}
      </button>

      {done && (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-label-2" role="status">
          <Check size={13} style={{ color: "var(--success)" }} />
          {t("round.return.done")}
          <Link href={`/shipg?view=check&q=${encodeURIComponent(orderNumber)}`} className="link">{t("round.return.open")}</Link>
        </span>
      )}

      {open && (
        <Sheet
          title={t("round.return")}
          subtitle={suggestion.newRound
            ? t("round.return.sheetSubtitleRound", { order: orderNumber, round: nextRound })
            : t("round.return.sheetSubtitle", { order: orderNumber })}
          onClose={close}
          width={720}
        >
          <ReturnForm issueId={issueId} suggestion={suggestion} packages={packages} onCancel={close} onDone={finish} />
        </Sheet>
      )}
    </>
  );
}

type EditableRow = ReturnRow & { uid: number };

function ReturnForm({ issueId, suggestion, packages, onCancel, onDone }: {
  issueId: number;
  suggestion: Suggestion;
  packages: Packages;
  onCancel: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const [state, action] = useActionState(recordAnotherReturn, initial);
  const uid = useRef(0);
  const withUid = (row: ReturnRow): EditableRow => ({ ...row, uid: uid.current++ });
  const [rows, setRows] = useState<EditableRow[]>(() =>
    (suggestion.rows.length > 0 ? suggestion.rows : [{ name: "", variant: null, qty: 1 }]).map(withUid));

  // En predlagan paket je skoraj zagotovo pravi; pri več predlogih mora izbrati
  // človek, brez predlogov pa paketa praviloma še ni.
  const [choice, setChoice] = useState(
    packages.suggested.length === 1 ? packages.suggested[0]!.id : packages.suggested.length === 0 ? NONE : "",
  );
  const [other, setOther] = useState("");
  const parcelId = choice === OTHER ? other : choice === NONE ? "" : choice;

  const handled = useRef<RoundState | null>(null);
  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    onDone();
  }, [state, onDone]);

  const update = (key: number, patch: Partial<ReturnRow>) =>
    setRows((current) => current.map((row) => (row.uid === key ? { ...row, ...patch } : row)));

  return (
    <form action={action} className="border-t" style={{ borderColor: "var(--rule)" }}>
      <input type="hidden" name="issueId" value={issueId} />
      <input type="hidden" name="shipgermanParcelId" value={parcelId} />

      <section className="grid gap-3 px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="caption" style={{ color: "var(--ink)" }}>{t("round.return.contents")}</h3>
          <p className="text-[11.5px] text-label-3">
            {suggestion.newRound ? t("round.return.helpNewRound") : t("round.return.helpSameRound")}
          </p>
        </div>

        <div className="grid gap-2">
          <div aria-hidden className="hidden grid-cols-[36px_minmax(0,1.6fr)_minmax(0,1fr)_64px_26px] gap-2 sm:grid">
            <span />
            <span className="field-label mb-0">{t("round.return.item")}</span>
            <span className="field-label mb-0">{t("round.return.variant")}</span>
            <span className="field-label mb-0">{t("round.return.qty")}</span>
            <span />
          </div>
          {rows.map((row) => (
            <div
              key={row.uid}
              className="grid grid-cols-[36px_minmax(0,1fr)_64px_26px] items-center gap-2 sm:grid-cols-[36px_minmax(0,1.6fr)_minmax(0,1fr)_64px_26px]"
            >
              <Thumb name={row.name} variant={row.variant} />
              <input
                name="returnItem.name"
                value={row.name}
                maxLength={200}
                aria-label={t("round.return.item")}
                onChange={(event) => update(row.uid, { name: event.target.value })}
                className="field col-span-3 sm:col-span-1"
              />
              <input
                name="returnItem.variant"
                value={row.variant ?? ""}
                maxLength={120}
                aria-label={t("round.return.variant")}
                onChange={(event) => update(row.uid, { variant: event.target.value })}
                className="field mono col-start-2 sm:col-start-auto"
              />
              <input
                name="returnItem.qty"
                type="number"
                min={1}
                max={9999}
                value={row.qty}
                aria-label={t("round.return.qty")}
                onChange={(event) => update(row.uid, { qty: Number(event.target.value) })}
                className="field mono"
              />
              <button
                type="button"
                className="btn btn-sm btn-plain px-1.5"
                title={t("round.return.remove")}
                aria-label={t("round.return.remove")}
                onClick={() => setRows((current) => current.filter((candidate) => candidate.uid !== row.uid))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm btn-plain -ml-1.5 w-fit"
            onClick={() => setRows((current) => [...current, withUid({ name: "", variant: null, qty: 1 })])}
          >
            <Plus size={14} />
            {t("round.return.add")}
          </button>
        </div>
      </section>

      <section className="grid gap-3 border-t px-5 py-4" style={{ borderColor: "var(--rule)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="caption" style={{ color: "var(--ink)" }}>{t("round.return.package")}</h3>
          {packages.suggested.length > 0 && <p className="text-[11.5px] text-label-3">{t("round.return.packageSuggested")}</p>}
        </div>

        <div role="radiogroup" aria-label={t("round.return.package")} className="border" style={{ borderColor: "var(--rule-strong)" }}>
          {packages.suggested.map((parcel) => (
            <Choice key={parcel.id} value={parcel.id} choice={choice} onChoose={setChoice}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{parcel.sender}</span>
                <span className="mono mt-0.5 block truncate text-[11px] text-label-2">
                  {[parcel.arrived, parcel.weight, parcel.tracking].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="mono shrink-0 text-[11px] text-label-3">ID {parcel.id}</span>
            </Choice>
          ))}

          {packages.other.length > 0 && (
            <Choice value={OTHER} choice={choice} onChoose={setChoice} label={t("round.return.packageOther")}>
              {choice === OTHER && (
                <select
                  value={other}
                  required
                  aria-label={t("round.return.packageOther")}
                  onChange={(event) => setOther(event.target.value)}
                  className="field"
                >
                  <option value="">{t("round.return.packageOtherPick")}</option>
                  {packages.other.map((parcel) => (
                    <option key={parcel.id} value={parcel.id}>
                      {[parcel.sender, parcel.arrived, parcel.weight, parcel.tracking, `ID ${parcel.id}`].filter(Boolean).join(" · ")}
                    </option>
                  ))}
                </select>
              )}
            </Choice>
          )}

          <Choice value={NONE} choice={choice} onChoose={setChoice} label={t("round.return.packageNone")}>
            {choice === NONE && (
              <div className="grid gap-1.5">
                <input name="trackingNumber" maxLength={80} placeholder={t("round.return.tracking")} aria-label={t("round.return.tracking")} className="field mono" />
                <p className="text-[11.5px] text-label-3">{t("round.return.packageNoneHint")}</p>
              </div>
            )}
          </Choice>
        </div>
      </section>

      <section className="border-t px-5 py-4" style={{ borderColor: "var(--rule)" }}>
        <label className="block">
          <span className="field-label">{t("round.note")}</span>
          <textarea name="note" rows={2} maxLength={1000} className="field" />
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: "var(--rule)" }}>
        {state.error && <div className="mr-auto"><Notice kind="error">{state.error}</Notice></div>}
        <button type="button" className="btn btn-sm" onClick={onCancel}>{t("common.cancel")}</button>
        <Submit label={t("round.return.submit")} busy={t("common.saving")} />
      </div>
    </form>
  );
}

/**
 * Vrstica izbire paketa. Dodatno polje (izbor drugega paketa, sledilna številka)
 * stoji pod oznako in ne v njej — sicer bi klik vanj prestavil izbiro.
 */
export function Choice({ value, choice, onChoose, label, children }: {
  value: string;
  choice: string;
  onChoose: (value: string) => void;
  label?: string;
  children?: React.ReactNode;
}) {
  const checked = choice === value;
  return (
    <div
      className="border-t first:border-t-0"
      style={{ borderColor: "var(--rule)", background: checked ? "var(--petrol-wash)" : undefined }}
    >
      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
        <input
          type="radio"
          name="packageChoice"
          value={value}
          checked={checked}
          required
          onChange={() => onChoose(value)}
          className="h-[14px] w-[14px] shrink-0 accent-[var(--petrol)]"
        />
        {label ? <span className="text-[13px] font-medium">{label}</span> : children}
      </label>
      {label && children && <div className="px-3 pb-3 pl-[38px]">{children}</div>}
    </div>
  );
}

function Thumb({ name, variant }: { name: string; variant: string | null }) {
  const src = name ? imageOf(name, 96, selectionOf(name, variant ?? "")) : null;
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

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
      {pending ? busy : label}
    </button>
  );
}
