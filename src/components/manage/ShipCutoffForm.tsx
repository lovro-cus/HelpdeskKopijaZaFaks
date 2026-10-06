"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";

import { saveShipCutoff, type ShipCutoffState } from "@/lib/actions/warehouse-settings";
import { SETTING_DEFS } from "@/lib/config/defaults";
import { useT } from "@/lib/i18n/client";

const initial: ShipCutoffState = {};

/**
 * Prag starosti, čez katerega paketov ne pošiljamo, in izjema za redka
 * ujemanja. Ena vrstica: razlaga levo, nastavitev desno — dve polji ne
 * potrebujeta obrazca čez celo širino.
 */
export function ShipCutoffForm({ maxDays, rareExempt }: { maxDays: number; rareExempt: boolean }) {
  const t = useT();
  const router = useRouter();
  const [state, action] = useActionState(saveShipCutoff, initial);
  // Seznami na strani so dinamični: po shranjevanju jih izrecno osvežimo.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  const def = SETTING_DEFS.shipMaxAgeDays;

  return (
    <form action={action} className="card flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3.5">
      <div className="min-w-[240px] flex-1">
        <h2 className="caption" style={{ color: "var(--ink)" }}>{t("warehouse.cutoff.title")}</h2>
        <p className="mt-1 max-w-[62ch] text-[12px] leading-relaxed text-label-2">{t("warehouse.cutoff.intro")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <label className="flex items-center gap-2 whitespace-nowrap text-[12.5px] text-label-2">
          {t("warehouse.cutoff.days")}
          <input
            name="shipMaxAgeDays"
            type="number"
            inputMode="numeric"
            step="1"
            min={def.min}
            max={def.max}
            required
            defaultValue={maxDays}
            className="field mono h-[30px] text-right"
            // .field je privzeto čez celo širino; za dvomestno število je 72 px dovolj.
            style={{ width: 72 }}
          />
          {t("warehouse.cutoff.unit")}
        </label>

        <label className="flex items-center gap-2 whitespace-nowrap text-[12.5px]" title={t("warehouse.cutoff.rareHint")}>
          <input type="checkbox" name="shipMaxAgeRareExempt" defaultChecked={rareExempt} />
          {t("warehouse.cutoff.rare")}
        </label>

        <div className="flex items-center gap-2.5">
          <SaveButton />
          {state.ok && (
            <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: "var(--success)" }} role="status">
              <Check size={13} />{t("warehouse.cutoff.saved")}
            </span>
          )}
          {state.error && <span className="text-[12px]" style={{ color: "var(--stamp)" }} role="alert">{state.error}</span>}
        </div>
      </div>
    </form>
  );
}

function SaveButton() {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-sm btn-primary">
      {pending ? t("common.saving") : t("common.save")}
    </button>
  );
}
