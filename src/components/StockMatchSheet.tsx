"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { PackageCheck } from "lucide-react";

import { reserveOutbound } from "@/lib/actions/outbound";
import { reserveShipgPackages } from "@/lib/actions/shipg-allocation";
import { useT } from "@/lib/i18n/client";
import { Sheet } from "./Sheet";

export type StockMatchRow = {
  orderNumber: string;
  customer: string | null;
  shipgReturnIds: number[];
  packages: { parcelId: string; current: boolean; contents: string }[];
  /** Menjava na obstoječem ticketu (namesto nefulfillanega naročila). */
  ticket?: { key: string; issueId: number; note: string | null };
};

function ReserveButton() {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-sm" disabled={pending}>
      <PackageCheck size={13} />
      {t("unfulfilled.reserve")}
    </button>
  );
}

/** List z naročili, ki jih lahko porabi ravnokar vpisan paket. */
export function StockMatchSheet({ title, subtitle, rows, closeHref }: {
  title: string;
  subtitle: string;
  rows: StockMatchRow[];
  closeHref: string;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  // Parameter v naslovu umaknemo, da se list ob osvežitvi strani ne dvigne znova.
  const close = useCallback(() => {
    setOpen(false);
    router.replace(closeHref, { scroll: false });
  }, [router, closeHref]);

  if (!open) return null;

  return (
    <Sheet title={title} subtitle={subtitle} onClose={close} width={640}>
      <ul className="border-t" style={{ borderColor: "var(--rule)" }}>
        {rows.map((row) => (
          <li
            key={row.ticket ? row.ticket.key : row.orderNumber}
            className="flex flex-col gap-3 border-b px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "var(--rule)" }}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <Link
                  href={row.ticket ? `/orders/${encodeURIComponent(row.ticket.key)}` : `/unfulfilled/${encodeURIComponent(row.orderNumber)}`}
                  className="link mono text-[13px] font-semibold"
                >
                  #{row.orderNumber}
                </Link>
                {row.ticket && <span className="pill pill-petrol">{t("stockMatch.exchange")}</span>}
                {row.customer && <span className="text-[12.5px] text-label-2">{row.customer}</span>}
              </div>
              {row.ticket?.note && (
                <p className="mt-1 text-[12px]" style={{ color: "var(--warning)" }}>{row.ticket.note}</p>
              )}
              <ul className="mt-1.5 grid gap-1">
                {row.packages.map((pkg) => (
                  <li key={pkg.parcelId} className="text-[12.5px] leading-snug text-label-2">
                    <span className="mono text-[11px] text-label-3">{pkg.parcelId}</span>
                    {row.packages.length > 1 && pkg.current && (
                      <span className="text-label-3"> ({t("stockMatch.thisParcel")})</span>
                    )}
                    {" "}{pkg.contents}
                  </li>
                ))}
              </ul>
            </div>
            <form action={row.ticket ? reserveShipgPackages : reserveOutbound} className="shrink-0">
              {row.ticket
                ? <input type="hidden" name="issueId" value={row.ticket.issueId} />
                : <input type="hidden" name="orderNumber" value={row.orderNumber} />}
              {row.shipgReturnIds.map((id) => <input key={id} type="hidden" name="shipgReturnId" value={id} />)}
              <ReserveButton />
            </form>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <p className="max-w-[340px] text-[12.5px] leading-snug text-label-3">{t("stockMatch.hint")}</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-sm" onClick={close}>{t("stockMatch.later")}</button>
          <Link href="/shipg?view=outbound&only=rare" className="btn btn-sm">{t("stockMatch.all")}</Link>
        </div>
      </div>
    </Sheet>
  );
}
