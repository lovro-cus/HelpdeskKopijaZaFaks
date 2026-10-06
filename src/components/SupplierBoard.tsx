import Link from "next/link";
import { Download, X } from "lucide-react";

import { cancelSupplierOrder } from "@/lib/actions/supplier-orders";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/shared";
import { addressLine } from "@/lib/supplier-address";
import { supplierOrderCode } from "@/lib/supplier-import";
import { itemLabel, parseSupplierItems, PENDING_STATUSES, supplierOrderInclude, supplierOrdersCoveredByStock } from "@/lib/supplier-orders";
import { SupplierImport } from "./SupplierImport";
import { SupplierAddressForm, SupplierTrackingForm } from "./SupplierRowForms";
import { EmptyState } from "./ui";

/** Koliko dni nazaj kažemo odposlane — dovolj, da se vidi, kaj je prišlo nazaj. */
const SHIPPED_DAYS = 30;

/**
 * Seznam za dobavitelja: kaj je treba naročiti, izvoz v Excel, uvoz trackinga.
 * Isti pogled vidita zaposleni (mode "staff") in dobavitelj prek zasebne
 * povezave (mode "portal") — portal ne vidi ticketov ne gumbov za urejanje.
 */
export async function SupplierBoard({ locale, portalToken }: { locale: Locale; portalToken: string | null }) {
  const staff = portalToken === null;
  const since = new Date(Date.now() - SHIPPED_DAYS * 24 * 60 * 60 * 1000);
  const [allPending, shipped, covered] = await Promise.all([
    db.supplierOrder.findMany({ where: { status: { in: PENDING_STATUSES } }, orderBy: { createdAt: "asc" }, include: supplierOrderInclude }),
    db.supplierOrder.findMany({ where: { status: "shipped", shippedAt: { gte: since } }, orderBy: { shippedAt: "desc" }, include: supplierOrderInclude, take: 200 }),
    supplierOrdersCoveredByStock(),
  ]);
  // Neprenesena zahteva, ki jo pokrije ShipG zaloga, ni za dobavitelja: portal
  // je ne pokaže, izvoz je izpusti, zaposleni jo vidi z opozorilom.
  const pending = staff ? allPending : allPending.filter((order) => !(order.status === "open" && covered.has(order.id)));
  const exportable = pending.filter((order) => !(order.status === "open" && covered.has(order.id)));
  const fresh = exportable.filter((order) => order.status === "open").length;
  const exportBase = staff ? "/api/supplier/export" : `/portal/${portalToken}/export`;

  return (
    <div className="grid gap-5">
      <section className="card px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="caption" style={{ color: "var(--ink)" }}>{t(locale, "supplier.export.title")}</h2>
            <p className="mt-1 max-w-[62ch] text-[12.5px] text-label-2">{t(locale, "supplier.export.body")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Navadna povezava: prenos datoteke ni navigacija, prefetch bi jo izvozil. */}
            <a href={`${exportBase}?scope=new`} className="btn btn-sm btn-primary" aria-disabled={fresh === 0 || undefined}>
              <Download size={14} />{t(locale, "supplier.export.new", { count: fresh })}
            </a>
            <a href={`${exportBase}?scope=pending`} className="btn btn-sm">
              <Download size={14} />{t(locale, "supplier.export.pending", { count: exportable.length })}
            </a>
          </div>
        </div>
        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--separator)" }}>
          <h2 className="caption" style={{ color: "var(--ink)" }}>{t(locale, "supplier.import.title")}</h2>
          <p className="mb-2.5 mt-1 max-w-[62ch] text-[12.5px] text-label-2">{t(locale, "supplier.import.body")}</p>
          <SupplierImport portalToken={portalToken} />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 pb-2.5 pt-3.5">
          <h2 className="caption" style={{ color: "var(--ink)" }}>{t(locale, "supplier.pending.title", { count: pending.length })}</h2>
        </div>
        {pending.length === 0 ? (
          <EmptyState title={t(locale, "supplier.pending.empty")} hint={t(locale, "supplier.pending.emptyHint")} />
        ) : (
          <ul>
            {pending.map((order) => (
              <li key={order.id} className="border-t px-4 py-3" style={{ borderColor: "var(--separator)" }}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="mono text-[12.5px] font-medium">{supplierOrderCode(order.id)}</span>
                  {staff ? (
                    <Link href={`/orders/${order.issue.key}`} className="link mono text-[12.5px]">#{order.issue.orderNumber}</Link>
                  ) : (
                    <span className="mono text-[12.5px]">#{order.issue.orderNumber}</span>
                  )}
                  <span className={`pill ${order.status === "open" ? "pill-petrol" : "pill-ink"}`}>
                    {order.status === "open"
                      ? t(locale, "supplier.status.open")
                      : t(locale, "supplier.status.exported", { date: formatDate(order.exportedAt, locale) })}
                  </span>
                  {staff && covered.has(order.id) && (
                    <Link href={`/orders/${order.issue.key}`} className="pill" style={{ borderColor: "var(--warning)", color: "var(--warning)" }}>
                      {t(locale, order.status === "open" ? "supplier.stock.open" : "supplier.stock.exported")}
                    </Link>
                  )}
                  <span className="text-[11.5px] text-label-3">
                    {t(locale, "supplier.requested", { date: formatDate(order.createdAt, locale), name: order.createdBy?.name ?? "—" })}
                  </span>
                </div>
                <div className="mt-1.5 text-[13px] font-medium">{parseSupplierItems(order.items).map(itemLabel).join(", ")}</div>
                <div className="mt-0.5 text-[12.5px] text-label-2">
                  {addressLine(order) || "—"}
                  {order.phone && <span className="mono"> · {order.phone}</span>}
                </div>
                {order.note && <div className="mt-0.5 text-[12px] text-label-2">{order.note}</div>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SupplierTrackingForm supplierOrderId={order.id} portalToken={portalToken} />
                  {staff && (
                    <>
                      <SupplierAddressForm supplierOrderId={order.id} address={order} />
                      <form action={cancelSupplierOrder}>
                        <input type="hidden" name="supplierOrderId" value={order.id} />
                        <button type="submit" className="btn btn-sm btn-plain"><X size={13} />{t(locale, "supplier.cancel")}</button>
                      </form>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {shipped.length > 0 && (
        <section className="card overflow-hidden">
          <div className="px-4 pb-2.5 pt-3.5">
            <h2 className="caption" style={{ color: "var(--ink)" }}>{t(locale, "supplier.shipped.title", { days: SHIPPED_DAYS })}</h2>
          </div>
          <ul>
            {shipped.map((order) => (
              <li key={order.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t px-4 py-2.5 text-[12.5px]" style={{ borderColor: "var(--separator)" }}>
                <span className="mono font-medium">{supplierOrderCode(order.id)}</span>
                {staff ? (
                  <Link href={`/orders/${order.issue.key}`} className="link mono">#{order.issue.orderNumber}</Link>
                ) : (
                  <span className="mono">#{order.issue.orderNumber}</span>
                )}
                <span className="text-label-2">{parseSupplierItems(order.items).map(itemLabel).join(", ")}</span>
                <span className="mono">{order.tracking}</span>
                <span className="ml-auto text-[11.5px] text-label-3">{formatDate(order.shippedAt, locale)} · {order.shippedBy ?? "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
