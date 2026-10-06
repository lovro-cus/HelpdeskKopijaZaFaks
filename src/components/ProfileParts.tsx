"use client";

import { Check } from "lucide-react";

import { useT } from "@/lib/i18n/client";

export type SaveState = "idle" | "saving" | "saved" | "failed";

/** Vrstica obrazca v profilu: rubrika z razlago levo, izbira desno. */
export function PrefRow({
  label,
  hint,
  labelFor,
  children,
}: {
  label: string;
  hint?: string;
  labelFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pref-row">
      <div>
        {labelFor ? (
          <label htmlFor={labelFor} className="pref-label block">{label}</label>
        ) : (
          <p className="pref-label">{label}</p>
        )}
        {hint && <p className="pref-hint">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Stanje shranjevanja. Vedno v DOM-u, da ga bralnik zaslona prebere ob spremembi. */
export function SaveStatus({ state }: { state: SaveState }) {
  const t = useT();
  return (
    <span role="status" aria-live="polite" className="pref-status" data-state={state}>
      {state === "saving" && t("appearance.saving")}
      {state === "saved" && (
        <>
          <Check size={13} aria-hidden />
          {t("appearance.saved")}
        </>
      )}
      {state === "failed" && t("appearance.failed")}
    </span>
  );
}

/**
 * Tipkovnica za skupino role="radio": puščice premaknejo izbiro, kot pri
 * pravih radijskih gumbih. V skupino se vstopi s tabulatorjem na izbrani.
 */
export function onRadioKeys(event: React.KeyboardEvent<HTMLElement>) {
  const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  const step = keys[event.key];
  if (!step) return;
  const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const current = radios.findIndex((radio) => radio === document.activeElement);
  if (current < 0) return;
  event.preventDefault();
  const next = radios[(current + step + radios.length) % radios.length];
  next.focus();
  next.click();
}
