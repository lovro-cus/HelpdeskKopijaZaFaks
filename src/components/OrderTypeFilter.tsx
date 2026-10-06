"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MailWarning } from "lucide-react";

import { useTypeFilterOptions } from "@/lib/config/client";
import { useT } from "@/lib/i18n/client";

/**
 * Vrsta naročila ni spustnik, ampak vrsta kvadratkov tik nad ticketi — enako
 * kot pogledi po stanju zgoraj. Številka v kvadratku pove, koliko primerov te
 * vrste je v trenutnem pogledu, tako da se vidi tudi brez klika, kje je delo.
 *
 * Ponovni klik na izbrano vrsto filter odstrani: kvadratki so preklopniki,
 * zato ne rabijo posebne možnosti "vse vrste".
 */
export function OrderTypeFilter({ counts, reopened = 0 }: { counts: Record<string, number>; reopened?: number }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("type") ?? "";
  const options = useTypeFilterOptions();

  // Vrste brez primerov ne kažemo — kvadratek, ki nikamor ne pelje, je šum.
  // Izbrana vrsta ostane vidna tudi pri nič zadetkih, sicer je ne bi imel
  // kam odklikniti.
  const shown = options.filter((type) => counts[type.key] > 0 || type.key === active);
  const reopenedActive = params.get("reopened") === "1";
  const showReopened = reopened > 0 || reopenedActive;
  if (shown.length === 0 && !showReopened) return null;

  function toggleReopened() {
    const next = new URLSearchParams(params.toString());
    if (reopenedActive) next.delete("reopened");
    else next.set("reopened", "1");
    router.push(`/orders?${next.toString()}`);
  }

  function set(type: string) {
    const next = new URLSearchParams(params.toString());
    if (type && type !== active) next.set("type", type);
    else next.delete("type");
    router.push(`/orders?${next.toString()}`);
  }

  return (
    <div className="filters" role="tablist" aria-label={t("orders.type")}>
      {/* Znova odprti z mailom stranke niso vrsta, a jih je treba najti hitro. */}
      {showReopened && (
        <button
          role="tab"
          aria-selected={reopenedActive}
          data-active={reopenedActive}
          onClick={toggleReopened}
          title={t("issue.reopenCue")}
          data-view="reopened"
        >
          <MailWarning size={13} strokeWidth={2.25} className="mr-1.5" aria-hidden />
          {t("orders.reopened")}
          <span className="ml-1.5 tabular-nums" style={{ opacity: 0.7 }}>{reopened}</span>
        </button>
      )}
      {shown.map((type) => (
        <button
          key={type.key}
          role="tab"
          aria-selected={active === type.key}
          data-active={active === type.key}
          onClick={() => set(type.key)}
        >
          {type.label}
          <span
            className="ml-1.5 tabular-nums"
            style={{
              color: active === type.key ? "currentColor" : "var(--text-3)",
              opacity: active === type.key ? 0.7 : 1,
            }}
          >
            {counts[type.key] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}
