"use client";

import { useFormStatus } from "react-dom";
import { History } from "lucide-react";

import { useT } from "@/lib/i18n/client";

/** Gumb za globoko osvežitev (vse strani) odposlanih pošiljk. Počasnejši, zato
 *  ločen od hitrega »Osveži«. */
export function ShipgDeepRefreshButton() {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button type="submit" disabled={pending} className="btn btn-sm" aria-busy={pending} title={t("shipg.shipped.deepRefreshHint")}>
      <History size={13} className={pending ? "animate-spin motion-reduce:animate-none" : ""} />
      {pending ? t("shipg.shipped.deepRefreshing") : t("shipg.shipped.deepRefresh")}
    </button>
  );
}
