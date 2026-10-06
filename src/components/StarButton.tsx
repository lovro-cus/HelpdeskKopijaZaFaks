"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";

import { toggleStar } from "@/lib/actions/stars";
import { useT } from "@/lib/i18n/client";

/**
 * Osebna zvezdica na ticketu. Stanje se zamenja takoj; če strežnik ne uspe,
 * se vrne nazaj.
 */
export function StarButton({ issueId, starred: initial, size = 16, className = "" }: { issueId: number; starred: boolean; size?: number; className?: string }) {
  const t = useT();
  const [starred, setStarred] = useState(initial);
  const [pending, start] = useTransition();
  const label = t(starred ? "star.remove" : "star.add");

  return (
    <button
      type="button"
      className={`star-button inline-flex items-center justify-center ${className}`}
      data-starred={starred || undefined}
      aria-pressed={starred}
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={(event) => {
        // Na listu je gumb nad povezavo na ticket: klik ne sme odpreti ticketa.
        event.preventDefault();
        event.stopPropagation();
        const next = !starred;
        setStarred(next);
        start(async () => {
          try {
            const result = await toggleStar(issueId, next);
            setStarred(result.starred);
          } catch {
            setStarred(!next);
          }
        });
      }}
    >
      <Star size={size} strokeWidth={2} fill={starred ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}
