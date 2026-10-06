import { redirect } from "next/navigation";

import { SupplierBoard } from "@/components/SupplierBoard";
import { SupplierPortalLink } from "@/components/SupplierRowForms";
import { requireUser } from "@/lib/auth";
import { loadTextSettings } from "@/lib/config/server";
import { canAccessShipg } from "@/lib/domain";
import { t } from "@/lib/i18n/server";
import { portalEnabled } from "@/lib/supplier-orders";

export const dynamic = "force-dynamic";

/** Naročila pri dobavitelju: kar ni v ShipG zalogi, pošlje dobavitelj sam. */
export default async function SupplierPage() {
  const me = await requireUser();
  if (!canAccessShipg(me)) redirect("/orders");
  const [{ supplierName }, portal] = await Promise.all([loadTextSettings(), portalEnabled()]);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.015em]">{t(me.locale, "supplier.title", { supplier: supplierName })}</h1>
        <p className="mt-1 max-w-[70ch] text-[12.5px] text-label-2">{t(me.locale, "supplier.subtitle", { supplier: supplierName })}</p>
      </div>
      <SupplierBoard locale={me.locale} portalToken={null} />
      {me.isAdmin && (
        <section className="card mt-5 px-4 py-4">
          <h2 className="caption" style={{ color: "var(--ink)" }}>{t(me.locale, "supplier.portal.title", { supplier: supplierName })}</h2>
          <p className="mb-2.5 mt-1 max-w-[62ch] text-[12.5px] text-label-2">{t(me.locale, "supplier.portal.body", { supplier: supplierName })}</p>
          <SupplierPortalLink enabled={portal.enabled} />
        </section>
      )}
    </div>
  );
}
