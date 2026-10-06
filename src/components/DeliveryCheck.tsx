"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { checkDeliveryStatus } from "@/lib/actions/delivery";

/** Ob odprtju ticketa preveri dostavo pri Shopifyju; ob spremembi osveži stran. */
export function DeliveryCheck({ issueId }: { issueId: number }) {
  const router = useRouter();
  useEffect(() => {
    let active = true;
    checkDeliveryStatus(issueId)
      .then((result) => {
        if (active && result.changed) router.refresh();
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [issueId, router]);
  return null;
}
