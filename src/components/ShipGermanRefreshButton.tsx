"use client";

import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";

import { useT } from "@/lib/i18n/client";

export function ShipGermanRefreshButton() {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button type="submit" disabled={pending} className="btn btn-sm" aria-busy={pending}>
      <RefreshCw size={13} className={pending ? "animate-spin motion-reduce:animate-none" : ""} />
      {pending ? t("shipg.external.refreshing") : t("shipg.external.refresh")}
    </button>
  );
}
