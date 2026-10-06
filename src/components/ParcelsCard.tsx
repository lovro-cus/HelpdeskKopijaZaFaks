"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLink, PackageCheck, Plus, RefreshCw, X } from "lucide-react";

import {
  addParcel,
  markParcelArrived,
  markReturnHere,
  refreshParcel,
  removeParcel,
  type FormState,
} from "@/lib/actions/parcels";
import { useSettings } from "@/lib/config/client";
import { formatDateTime } from "@/lib/format";
import { CopyButton } from "./CopyButton";
import { Notice } from "./ui";
import { useLocale, useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const initial: FormState = {};

export type CardParcel = {
  id: number;
  number: string;
  direction: string;
  carrierName: string | null;
  state: string;
  manualReason: string | null;
  lastEventAt: Date | null;
  lastEventText: string | null;
  checkedAt: Date | null;
};

/**
 * Jakost črnila po stanju. Rdeče dobi samo `manual` — takrat mora paket v
 * roke človeku. Prispelo je polno črnilo, vse vmesno bledi.
 */
const STATE_COLOR: Record<string, string> = {
  pending: "var(--ink-3)",
  transit: "var(--ink-2)",
  arrived: "var(--ink)",
  manual: "var(--stamp)",
  untracked: "var(--ink-3)",
};

export function ParcelsCard({ issueId, parcels }: { issueId: number; parcels: CardParcel[] }) {
  const t = useT();
  const [state, action] = useActionState(addParcel, initial);
  const [hereState, hereAction] = useActionState(markReturnHere, initial);
  const [adding, setAdding] = useState(false);

  // Obrazec zapremo šele, ko strežnik potrdi — ob napaki mora ostati odprt,
  // sicer bi se vnos izgubil.
  useEffect(() => {
    if (state.ok) setAdding(false);
  }, [state]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2.5 pt-3.5">
        <h3 className="caption" style={{ color: "var(--ink)" }}>{t("parcel.title")}</h3>
        {!adding && (
          <div className="flex flex-wrap items-center gap-2">
            <form action={hereAction}>
              <input type="hidden" name="issueId" value={issueId} />
              <IconSubmit label={t("parcel.here")}>
                <PackageCheck size={13} />
              </IconSubmit>
            </form>
            <button type="button" onClick={() => setAdding(true)} className="btn btn-sm">
              <Plus size={13} />
              {t("parcel.add")}
            </button>
          </div>
        )}
      </div>

      {hereState.error && (
        <div className="px-4 pb-2">
          <Notice kind="error">{hereState.error}</Notice>
        </div>
      )}

      {parcels.length === 0 && !adding ? (
        <p className="px-4 pb-3.5 text-[12.5px] text-label-3">{t("parcel.emptyHint")}</p>
      ) : (
        <ul className="px-4 pb-3.5">
          {parcels.map((parcel) => (
            <ParcelRow key={parcel.id} parcel={parcel} />
          ))}
        </ul>
      )}

      {adding && (
        <form
          action={action}
          className="animate-in border-t px-4 py-3"
          style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}
        >
          <input type="hidden" name="issueId" value={issueId} />

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div>
              <label className="field-label" htmlFor="parcel-number">
                {t("parcel.number")}
              </label>
              <input
                id="parcel-number"
                name="number"
                required
                autoFocus
                maxLength={50}
                placeholder={t("parcel.numberPlaceholder")}
                className="field mono"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="parcel-direction">
                {t("parcel.directionLabel")}
              </label>
              <select id="parcel-direction" name="direction" defaultValue="return" className="field">
                <option value="return">{t("parcel.direction.return")}</option>
                <option value="replacement">{t("parcel.direction.replacement")}</option>
              </select>
            </div>
          </div>

          {state.error && (
            <div className="mt-2.5">
              <Notice kind="error">{state.error}</Notice>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[12px] text-label-3">{t("parcel.checkBeforeHold")}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding(false)} className="btn btn-sm">
                {t("common.cancel")}
              </button>
              <Submit idle={t("parcel.add")} />
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function ParcelRow({ parcel }: { parcel: CardParcel }) {
  const t = useT();
  const locale = useLocale();
  const { parcelStaleHours: staleHours } = useSettings();

  const [, refreshAction] = useActionState(refreshParcel, initial);
  const [, arrivedAction] = useActionState(markParcelArrived, initial);
  const [, removeAction] = useActionState(removeParcel, initial);

  const color = STATE_COLOR[parcel.state] ?? "var(--text-3)";
  const done = parcel.state === "arrived";
  // Paket, ki je pri nas brez tracking številke — številke ne prikazujemo.
  const noTracking = parcel.manualReason === "here";

  const reason = parcel.manualReason && !noTracking
    ? t(`parcel.reason.${parcel.manualReason}` as TranslationKey, { hours: staleHours })
    : null;

  return (
    <li
      className="reveal-host py-2.5 first:pt-0 [&+li]:border-t"
      style={{ borderColor: "var(--rule)" }}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className="h-[7px] w-[7px] shrink-0 "
          style={{ background: color }}
          aria-hidden
        />
        {noTracking ? (
          <span className="text-[12.5px] font-medium">{t("parcel.hereLabel")}</span>
        ) : (
          <>
            <span className="mono text-[12.5px] font-medium">{parcel.number}</span>
            <CopyButton value={parcel.number} label={t("parcel.number")} className="-ml-1" />
          </>
        )}
        <span className="text-[12px]" style={{ color }}>
          {t(`parcel.state.${parcel.state}` as TranslationKey)}
        </span>
        {parcel.carrierName && (
          <span className="text-[12px] text-label-3">· {parcel.carrierName}</span>
        )}
        <span className="text-[12px] text-label-3">
          · {t(`parcel.direction.${parcel.direction}` as TranslationKey)}
        </span>

        {!noTracking && (
          <a
            href={`https://t.17track.net/en#nums=${encodeURIComponent(parcel.number)}`}
            target="_blank"
            rel="noreferrer"
            className="link ml-auto flex items-center gap-1 text-[12px]"
            title={t("parcel.open17")}
          >
            17track <ExternalLink size={11} />
          </a>
        )}
      </div>

      {reason && (
        <p className="mt-1 text-[12px]" style={{ color }}>
          {reason}
        </p>
      )}

      {parcel.lastEventText && (
        <p className="mt-1 text-[12px] text-label-2">
          {parcel.lastEventText}
          {parcel.lastEventAt && (
            <span className="text-label-3"> · {formatDateTime(parcel.lastEventAt, locale)}</span>
          )}
        </p>
      )}

      {parcel.state === "untracked" && (
        <p className="mt-1 text-[12px] text-label-3">{t("parcel.untrackedHint")}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {!done && (
          <>
            <form action={refreshAction}>
              <input type="hidden" name="parcelId" value={parcel.id} />
              <IconSubmit label={t("parcel.refresh")}>
                <RefreshCw size={12} />
              </IconSubmit>
            </form>

            <form action={arrivedAction}>
              <input type="hidden" name="parcelId" value={parcel.id} />
              <IconSubmit label={t("parcel.markArrived")}>
                <PackageCheck size={12} />
              </IconSubmit>
            </form>
          </>
        )}

        <form action={removeAction} className="ml-auto">
          <input type="hidden" name="parcelId" value={parcel.id} />
          <IconSubmit label={t("parcel.remove")} iconOnly>
            <X size={12} />
          </IconSubmit>
        </form>

        {parcel.checkedAt && (
          <span className="mono order-last w-full text-[11.5px] text-label-3">
            {t("parcel.checked", { date: formatDateTime(parcel.checkedAt, locale) })}
          </span>
        )}
      </div>
    </li>
  );
}

function Submit({ idle }: { idle: string }) {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
      {pending ? t("common.saving") : idle}
    </button>
  );
}

function IconSubmit({
  label,
  children,
  iconOnly,
}: {
  label: string;
  children: React.ReactNode;
  iconOnly?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={label}
      aria-label={label}
      className={`btn btn-sm ${iconOnly ? "px-1.5" : ""}`}
    >
      {children}
      {!iconOnly && label}
    </button>
  );
}
