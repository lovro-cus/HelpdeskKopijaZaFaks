"use client";

import { useState } from "react";
import { Scale } from "lucide-react";

import { reserveShipgPackages } from "@/lib/actions/shipg-allocation";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export type MatchPackageView = {
  shipgReturnId: number;
  parcelId: string;
  sender: string | null;
  contents: string;
  weightKg: string;
  arrivalLabel: string;
  weightConfidence: "plausible" | "suspicious" | "unknown";
};

export type MatchView = {
  key: string;
  shipgReturnIds: number[];
  packages: MatchPackageView[];
};

const PAGE_SIZE = 5;
const INITIAL = 3;

/** Seznam predlaganih paketov za rezervacijo. Sprva pokaže 3, "pokaži več" jih
 *  razgrne do 5 na strani; nad 5 se stran deli (najstarejših 5 na prvi strani). */
export function ShipgMatchList({ issueId, matches }: { issueId: number; matches: MatchView[] }) {
  const t = useT();
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const pageMatches = matches.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const visible = expanded ? pageMatches : pageMatches.slice(0, INITIAL);
  const hiddenCount = pageMatches.length - visible.length;

  const goto = (next: number) => { setPage(next); setExpanded(false); };

  return (
    <div>
      <div className="space-y-3">
        {visible.map((match, localIndex) => {
          const isBest = page * PAGE_SIZE + localIndex === 0;
          return (
            <form
              key={match.key}
              action={reserveShipgPackages}
              className="border px-3 py-1.5"
              style={{ borderColor: isBest ? "var(--petrol)" : "var(--separator-strong)" }}
            >
              <input type="hidden" name="issueId" value={issueId} />
              {match.shipgReturnIds.map((id) => <input key={id} type="hidden" name="shipgReturnId" value={id} />)}
              {match.packages.map((pkg) => <PackageLine key={pkg.shipgReturnId} pkg={pkg} />)}
              <div className="flex items-center justify-between gap-3 border-t py-2" style={{ borderColor: "var(--separator)" }}>
                <span className="text-[11.5px] text-label-3">{isBest ? t("shipg.exchange.bestMatch") : t("shipg.exchange.exactMatch")}</span>
                <button className="btn btn-primary btn-sm">{t("shipg.exchange.reserve")}</button>
              </div>
            </form>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button type="button" onClick={() => setExpanded(true)} className="btn btn-sm mt-3">
          {t("shipg.exchange.showMore", { count: hiddenCount })}
        </button>
      )}

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--separator)" }}>
          <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => goto(page - 1)}>
            {t("shipg.previous")}
          </button>
          <span className="mono text-[11.5px] text-label-2">{t("shipg.exchange.pageOf", { page: page + 1, total: pageCount })}</span>
          <button type="button" className="btn btn-sm" disabled={page >= pageCount - 1} onClick={() => goto(page + 1)}>
            {t("shipg.next")}
          </button>
        </div>
      )}
    </div>
  );
}

function PackageLine({ pkg }: { pkg: MatchPackageView }) {
  const t = useT();
  return (
    <div className="grid gap-1 border-t py-2.5 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4" style={{ borderColor: "var(--separator)" }}>
      <div className="min-w-0">
        <div className="text-[12px] font-medium">
          <span className="mono">ShipGerman {pkg.parcelId}</span>
          {pkg.sender && <span className="ml-2 text-label-2">· {pkg.sender}</span>}
        </div>
        <div className="mt-0.5 text-[12.5px] text-label-2">{pkg.contents}</div>
      </div>
      <div className="flex items-center gap-3 text-[11.5px] text-label-3 sm:justify-end">
        <span><Scale className="mr-1 inline" size={12} />{pkg.weightKg} kg</span>
        <span>{pkg.arrivalLabel}</span>
        <span className="pill">{t(`shipg.exchange.weight.${pkg.weightConfidence}` as TranslationKey)}</span>
      </div>
    </div>
  );
}
