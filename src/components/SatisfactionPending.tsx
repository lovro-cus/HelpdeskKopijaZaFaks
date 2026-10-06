"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Smile } from "lucide-react";

import { useT } from "@/lib/i18n/client";

const POLL_MS = 3_000;
const MAX_POLLS = 20;

/**
 * Ticket je zaprt, ocene zadovoljstva pa še ni — AI jo naredi v ozadju nekaj
 * sekund po zaključku. Stran se sama osvežuje, dokler ocena ne pride (največ
 * minuto); potem namesto te vrstice stoji kartica z oceno.
 */
export function SatisfactionPending() {
  const t = useT();
  const router = useRouter();

  useEffect(() => {
    let polls = 0;
    const timer = setInterval(() => {
      polls += 1;
      router.refresh();
      if (polls >= MAX_POLLS) clearInterval(timer);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <p className="mb-4 flex items-center gap-2 border px-4 py-2.5 text-[12px] text-label-2" style={{ borderColor: "var(--rule)" }} role="status">
      <Smile size={13} aria-hidden /> {t("satisfaction.pending")}
    </p>
  );
}
