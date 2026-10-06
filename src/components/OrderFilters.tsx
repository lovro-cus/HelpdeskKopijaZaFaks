"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { usePriorityOptions } from "@/lib/config/client";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

/**
 * Trije delovni pogledi so ena izbira in stojijo v segmentnem kontrolniku.
 * Arhiv je zunaj njega namenoma: ostali trije so pogledi na delo, ki je pred
 * tabo, arhiv pa je zgodovina — tja greš nekaj iskat, ne delat.
 */
const WORK_VIEWS = ["mine", "level", "all", "system"] as const;

const LABEL: Record<string, TranslationKey> = {
  mine: "orders.mine",
  level: "orders.myLevel",
  all: "orders.allOpen",
  system: "orders.system",
  waiting: "orders.waiting",
  manual: "orders.manual",
  archive: "orders.archive",
  starred: "orders.starred",
};

export function OrderFilters({ counts }: { counts: Record<string, number> }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get("view") ?? "mine";
  const priorities = usePriorityOptions();

  const group = useRef<HTMLDivElement>(null);
  const active = WORK_VIEWS.indexOf(view as (typeof WORK_VIEWS)[number]);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/orders?${next.toString()}`);
  }

  /** Puščice premikajo med segmenti, kakor se od takega kontrolnika pričakuje. */
  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();

    const from = active === -1 ? 0 : active;
    const next = (from + step + WORK_VIEWS.length) % WORK_VIEWS.length;
    set("view", WORK_VIEWS[next]);
    group.current?.querySelectorAll("button")[next]?.focus();
  }

  const filtered = ["type", "priority", "q", "sort"].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div
        ref={group}
        role="tablist"
        aria-label={t("orders.title")}
        onKeyDown={onKeyDown}
        className="segmented"
      >
        {WORK_VIEWS.map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            data-active={view === v}
            tabIndex={view === v || (active === -1 && v === "mine") ? 0 : -1}
            onClick={() => set("view", v)}
          >
            {t(LABEL[v])}
            {counts[v] > 0 && (
              <span className="tabular-nums" style={{ color: "var(--ink-3)" }}>
                {counts[v]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="filters" role="tablist" aria-label={t("orders.stateViews")}>
        {(["starred", "waiting", "manual", "archive"] as const).filter((stateView) => stateView !== "starred" || counts.starred > 0 || view === "starred").map((stateView) => (
          <button
            key={stateView}
            role="tab"
            aria-selected={view === stateView}
            data-active={view === stateView}
            data-view={stateView}
            onClick={() => set("view", stateView)}
          >
            {t(LABEL[stateView])}
            {counts[stateView] > 0 && (
              <span
                className="ml-1.5 tabular-nums"
                style={{
                  color: view === stateView ? "currentColor" : "var(--text-3)",
                  opacity: view === stateView ? 0.7 : 1,
                }}
              >
                {counts[stateView]}
              </span>
            )}
          </button>
        ))}
      </div>

      <Select
        label={t("orders.priority")}
        value={params.get("priority") ?? ""}
        onChange={(value) => set("priority", value)}
        placeholder={t("orders.allPriorities")}
        options={priorities.map((p) => ({ value: p.key, label: p.label }))}
      />

      {/* Razvrščanje: privzeto po prioriteti, zato je "priority" prazna vrednost
          (v naslovu ne pusti odvečnega parametra). */}
      <Select
        label={t("orders.sort")}
        value={params.get("sort") ?? ""}
        onChange={(value) => set("sort", value)}
        options={[
          { value: "", label: t("orders.sortPriority") },
          { value: "created", label: t("orders.sortCreated") },
          { value: "updated", label: t("orders.sortUpdated") },
          { value: "type", label: t("orders.sortType") },
          { value: "emails", label: t("orders.sortEmails") },
          { value: "emailsFew", label: t("orders.sortEmailsFew") },
        ]}
      />

      {filtered && (
        <button onClick={() => router.push(`/orders?view=${view}`)} className="btn btn-sm btn-plain">
          <X size={13} />
          {t("orders.clear")}
        </button>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Brez njega izbirnik nima prazne vrstice — možnosti so popolne same po sebi. */
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="field"
      // Mere morajo biti tu: .field je nelojeren CSS in premaga Tailwindovo
      // plast, zato bi razred za širino ostal brez učinka in bi se izbirnik
      // raztegnil čez vso vrstico.
      style={{ width: 136, height: 28, fontSize: 12.5 }}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
