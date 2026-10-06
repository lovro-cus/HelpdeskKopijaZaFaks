"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

import { usePriorities } from "@/lib/config/client";
import { findCategory } from "@/lib/config/shared";
import { useT } from "@/lib/i18n/client";
import { Avatar } from "./ui";

export type RailIssue = {
  key: string;
  orderNumber: string;
  priority: string;
  assignee: { name: string; color: string } | null;
};

export const RAIL_COOKIE = "helpdesk_rail";

/**
 * Trak ob desnem robu ticketa: ostala naročila iz istega kupa, iz katerega si
 * prišel — enak pogled, enak filter, enak vrstni red kot v seznamu. Namen je
 * predelati kup brez vračanja na seznam, zato je trenutni ticket v njem in je
 * označen: iz traku se vidi, kje si.
 *
 * Zaprtje si zapomni piškotek in ne seja: kdor traku noče, ga noče tudi jutri
 * in pri naslednjem ticketu.
 */
export function TicketRail({
  issues,
  currentKey,
  query,
  defaultOpen,
}: {
  issues: RailIssue[];
  currentKey: string;
  /** Filter, ki gre s klikom naprej, da trak ostane isti kup. */
  query: string;
  defaultOpen: boolean;
}) {
  const t = useT();
  const priorities = usePriorities();
  const [open, setOpen] = useState(defaultOpen);

  // Next prednaloži povezave, zato lahko ob kliku prispe stran, ki je bila
  // pripravljena še pred zaprtjem traku. Ob priklopu zato pogledamo, kaj je
  // zares izbrano, in obvelja piškotek, ne prednaložena slika.
  useEffect(() => {
    const stored = document.cookie.match(/(?:^|; )helpdesk_rail=([01])/)?.[1];
    if (stored) setOpen(stored === "1");
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    // Leto dni; odločitev o postavitvi ni skrivnost in ne rabi seje.
    document.cookie = `${RAIL_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  if (issues.length === 0) return null;

  return (
    <aside className="ticket-rail" data-open={open || undefined} aria-label={t("rail.title")}>
      <div className="mb-2 flex items-center gap-1.5">
        {open && (
          <span className="caption truncate">
            {t("rail.title")} <span className="text-label-3">{issues.length}</span>
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          className="btn btn-sm ml-auto px-1.5"
          title={t(open ? "rail.hide" : "rail.show")}
          aria-label={t(open ? "rail.hide" : "rail.show")}
          aria-expanded={open}
        >
          {open ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
        </button>
      </div>

      {open && (
        <ol className="grid gap-1.5">
          {issues.map((issue) => {
            const current = issue.key === currentKey;
            const priority = findCategory(priorities, issue.priority);
            const who = issue.assignee?.name ?? t("rail.unassigned");
            return (
              <li key={issue.key}>
                <Link
                  href={`/orders/${issue.key}${query}`}
                  className="rail-card"
                  data-current={current || undefined}
                  aria-current={current ? "page" : undefined}
                  // Prioriteto nosi samo barva poteze, zato mora biti beseda
                  // vsaj tu — barva sama ne sme biti edini nosilec pomena.
                  title={`#${issue.orderNumber} · ${priority?.label ?? issue.priority} · ${who}`}
                >
                  <span
                    aria-hidden
                    className="rail-prio"
                    style={{ background: priority?.color ?? "var(--ink-3)" }}
                  />
                  <span className="mono truncate text-[12.5px] font-medium">{issue.orderNumber}</span>
                  {issue.assignee ? (
                    <Avatar name={issue.assignee.name} color={issue.assignee.color} size={16} />
                  ) : (
                    <span className="mono text-[10px] text-label-3">{t("rail.unassigned")}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
