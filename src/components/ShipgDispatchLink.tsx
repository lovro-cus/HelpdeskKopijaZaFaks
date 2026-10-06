"use client";

import { useTransition } from "react";
import { PackageCheck } from "lucide-react";

import { prepareShipgDispatch } from "@/lib/actions/shipg-allocation";

/** Odprema iz skladišča: v kopiji za faks samo zabeleži, da je paket v pripravi. */
export function ShipgDispatchLink({ issueId, label }: { issueId: number; label: string }) {
  const [pending, start] = useTransition();

  const markDispatching = () => {
    const data = new FormData();
    data.set("issueId", String(issueId));
    start(() => { void prepareShipgDispatch(data); });
  };

  return (
    <button type="button" onClick={markDispatching} className="btn btn-primary btn-sm" aria-busy={pending} disabled={pending}>
      <PackageCheck size={14} />{label}
    </button>
  );
}
