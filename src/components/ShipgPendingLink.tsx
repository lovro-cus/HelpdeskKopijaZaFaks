"use client";

import Link, { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";

import { useT } from "@/lib/i18n/client";

/**
 * Zavihek ShipG, ki med nalaganjem pokaže vrtavko. Stanje nalaganja pove Next
 * sam (useLinkStatus); lasten useTransition okrog router.push je v Next 15.5
 * po obisku »Za odpremo« obvisel in zavihki so se vrteli v nedogled.
 */
export function ShipgPendingLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} data-active={active ? "true" : undefined} className={className}>
      <PendingContent>{children}</PendingContent>
    </Link>
  );
}

function PendingContent({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { pending } = useLinkStatus();
  return (
    <>
      {pending && <LoaderCircle size={13} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />}
      <span className={`inline-flex items-center gap-1.5 ${pending ? "opacity-60" : ""}`}>{children}</span>
      {pending && <span className="sr-only">{t("shipg.loading")}</span>}
    </>
  );
}
