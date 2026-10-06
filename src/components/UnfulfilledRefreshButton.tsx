"use client";

import { useFormStatus } from "react-dom";
import { RotateCw } from "lucide-react";

import { useT } from "@/lib/i18n/client";

/** Osveži seznam za odpremo. Submit sproži strežniško akcijo, ki poleg živega
 *  Shopify branja na novo potegne tudi ShipGerman zalogo — zato je počasnejši od
 *  navadnega reloada, a pokaže res realno sliko. */
export function UnfulfilledRefreshButton() {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button type="submit" className="btn btn-sm" disabled={pending} aria-busy={pending}>
      <RotateCw size={13} className={pending ? "animate-spin motion-reduce:animate-none" : ""} />
      {pending ? t("unfulfilled.refreshing") : t("unfulfilled.refresh")}
    </button>
  );
}
