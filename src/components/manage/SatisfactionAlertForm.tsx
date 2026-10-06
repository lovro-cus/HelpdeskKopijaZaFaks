"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";

import { saveSatisfactionAlert, type ReviewState } from "@/lib/actions/satisfaction";
import { SETTING_DEFS } from "@/lib/config/defaults";
import { useT } from "@/lib/i18n/client";

const initial: ReviewState = {};

/**
 * Prag, pod katerim gre ocena v pregled, in ali nizka ocena sproži obvestilo.
 * Ena vrstica kot prag starosti v skladišču: razlaga levo, nastavitev desno.
 */
export function SatisfactionAlertForm({ below, notify }: { below: number; notify: boolean }) {
  const t = useT();
  const router = useRouter();
  const [state, action] = useActionState(saveSatisfactionAlert, initial);
  // Seznam za pregled na isti strani je odvisen od praga.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  const def = SETTING_DEFS.satisfactionReviewBelow;

  return (
    <form action={action} className="card flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3.5">
      <div className="min-w-[240px] flex-1">
        <h2 className="caption" style={{ color: "var(--ink)" }}>{t("satisfaction.alert.title")}</h2>
        <p className="mt-1 max-w-[62ch] text-[12px] leading-relaxed text-label-2">{t("satisfaction.alert.intro")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <label className="flex items-center gap-2 whitespace-nowrap text-[12.5px] text-label-2">
          {t("satisfaction.alert.below")}
          <input
            name="satisfactionReviewBelow"
            type="number"
            inputMode="numeric"
            step="1"
            min={def.min}
            max={def.max}
            required
            defaultValue={below}
            className="field mono h-[30px] text-right"
            style={{ width: 64 }}
          />
          /10
        </label>

        <label className="flex items-center gap-2 whitespace-nowrap text-[12.5px]" title={t("satisfaction.alert.notifyHint")}>
          <input type="checkbox" name="satisfactionNotify" defaultChecked={notify} />
          {t("satisfaction.alert.notify")}
        </label>

        <div className="flex items-center gap-2.5">
          <SaveButton />
          {state.ok && (
            <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: "var(--success)" }} role="status">
              <Check size={13} />{t("satisfaction.alert.saved")}
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
