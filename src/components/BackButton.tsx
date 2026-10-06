"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Gumb "nazaj", ki vrne na prejšnjo stran v zgodovini (od koder je uporabnik
 *  prišel — seznam, iskanje, ShipG …). Če zgodovine ni (neposredna povezava),
 *  gre na `fallback`. */
export function BackButton({ fallback, label }: { fallback: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="btn btn-sm btn-plain -ml-2"
    >
      <ChevronLeft size={15} />
      {label}
    </button>
  );
}
