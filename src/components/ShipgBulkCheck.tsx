"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { PackageCheck, X } from "lucide-react";

import { confirmShipgReturnsBulk } from "@/lib/actions/shipg";
import { useT } from "@/lib/i18n/client";

type BulkSelection = {
  selected: Set<number>;
  toggle: (id: number) => void;
};

const BulkContext = createContext<BulkSelection | null>(null);

/** Izbira vrstic v "Za preverit"; vrstica brez ponudnika checkboxa ne pokaže. */
export function useBulkSelection() {
  return useContext(BulkContext);
}

export function ShipgBulkCheck({ eligibleIds, children }: { eligibleIds: number[]; children: React.ReactNode }) {
  const t = useT();
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const value = useMemo<BulkSelection>(() => ({
    selected,
    toggle: (id) => setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    }),
  }), [selected]);
  // Po potrditvi zapisi izginejo s seznama; izbira jih ne sme več šteti.
  const ids = eligibleIds.filter((id) => selected.has(id));
  const allSelected = eligibleIds.length > 0 && ids.length === eligibleIds.length;

  return (
    <BulkContext.Provider value={value}>
      {eligibleIds.length > 0 && (
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-label-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(eligibleIds))}
            className="h-4 w-4 accent-[var(--petrol)]"
          />
          {t("shipg.bulk.selectAll")} <span className="mono text-[10.5px] text-label-3">{eligibleIds.length}</span>
        </label>
      )}
      {children}
      {ids.length > 0 && (
        <form action={confirmShipgReturnsBulk} className="shipg-bulk-bar">
          {ids.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold">{t("shipg.bulk.selected", { count: ids.length })}</p>
            <p className="mt-0.5 max-w-[60ch] text-[11px] text-label-2">{t("shipg.bulk.hint")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSelected(new Set())} className="btn btn-sm"><X size={13} /> {t("shipg.bulk.clear")}</button>
            <ConfirmButton label={t("shipg.bulk.confirm", { count: ids.length })} />
          </div>
        </form>
      )}
    </BulkContext.Provider>
  );
}

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="btn btn-sm btn-primary"><PackageCheck size={14} />{pending ? "…" : label}</button>;
}
