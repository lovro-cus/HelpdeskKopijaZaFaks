"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { PackagePlus, RotateCcw } from "lucide-react";

import { startExchangeRound, type RoundState } from "@/lib/actions/exchange-round";
import { useT } from "@/lib/i18n/client";
import { Notice } from "./ui";

const initial: RoundState = {};

type Props = {
  issueId: number;
  nextRound: number;
  /** Zakaj ta hip ni mogoče nič (rezerviran paket še ni odšel). */
  blocked: string | null;
  /** Ali je menjava tekočega kroga odšla — šele takrat se lahko začne nov krog. */
  canNewRound: boolean;
  /** Vpis vračila v register je delo skladišča; kdor ga zmore, ga naredi ob "Poglej v ShipG". */
  canShipg: boolean;
  /** Kar ima stranka po začetku novega kroga, npr. "1× Nero pants L". */
  holding: string;
};

type Fault = "customer" | "ours";

/**
 * Nov krog brez vpisa v register. "Nov kos brez vračila": stranka kos obdrži.
 * Brez dostopa do ShipG še "stranka je vrnila nadomestek" — vračilo v register
 * potem vpiše skladišče.
 */
export function ExchangeRoundActions({ issueId, nextRound, blocked, canNewRound, canShipg, holding }: Props) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState<Fault | null>(null);

  if (open) {
    return (
      <RoundForm
        issueId={issueId}
        nextRound={nextRound}
        holding={holding}
        fault={open}
        onCancel={() => setOpen(null)}
        onDone={() => {
          setOpen(null);
          // revalidatePath trenutne dinamične strani ne nariše znova.
          router.refresh();
        }}
      />
    );
  }

  const disabled = Boolean(blocked) || !canNewRound;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!canShipg && (
        <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => setOpen("customer")}>
          <PackagePlus size={14} />
          {t("round.return")}
        </button>
      )}
      <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => setOpen("ours")}>
        <RotateCcw size={14} />
        {t("round.keep")}
      </button>
      {blocked && <span className="text-[11.5px] text-label-3">{blocked}</span>}
    </div>
  );
}

function RoundForm({ issueId, nextRound, holding, fault, onCancel, onDone }: {
  issueId: number;
  nextRound: number;
  holding: string;
  fault: Fault;
  onCancel: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const [state, action] = useActionState(startExchangeRound, initial);
  const handled = useRef<RoundState | null>(null);
  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="grid gap-3 py-1">
      <input type="hidden" name="issueId" value={issueId} />
      <input type="hidden" name="fault" value={fault} />
      <p className="text-[13px] font-medium">{t(`round.fault.${fault}`)}</p>
      <p className="max-w-[70ch] text-[12px] text-label-2">
        {fault === "ours" ? t("round.hint.ours") : t("round.hint.customer", { items: holding })}{" "}
        {t("round.explain", { round: nextRound, items: holding })}
      </p>
      <textarea name="note" rows={2} maxLength={1000} placeholder={t("round.note")} className="field" />
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-sm" onClick={onCancel}>{t("common.cancel")}</button>
        <Submit label={t("round.startTitle", { round: nextRound })} busy={t("common.saving")} />
      </div>
    </form>
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
