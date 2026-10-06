import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";

import { ShipgReturnForm } from "@/components/ShipgReturnForm";
import { ShipGermanManualStockForm } from "@/components/ShipGermanManualStockForm";
import { ShipgMergePanel } from "@/components/ShipgMergePanel";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessShipg } from "@/lib/domain";
import { formatDateTime, formatWeightKg } from "@/lib/format";
import { t } from "@/lib/i18n/server";
import { orderNumberKey } from "@/lib/order-number";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewShipgReturnPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireUser();
  if (!canAccessShipg(me)) redirect("/orders");

  const params = await searchParams;
  const rawOrder = params.order;
  const order = (Array.isArray(rawOrder) ? rawOrder[0] : rawOrder)?.trim().replace(/^#/, "").slice(0, 40) ?? "";
  const rawShipGermanParcelId = params.shipgermanParcelId;
  const shipgermanParcelId = (Array.isArray(rawShipGermanParcelId) ? rawShipGermanParcelId[0] : rawShipGermanParcelId)?.trim().slice(0, 100) ?? "";
  const shipgermanParcel = shipgermanParcelId
    ? await db.shipGermanCachedParcel.findUnique({ where: { id: shipgermanParcelId } })
    : null;
  if (shipgermanParcelId) {
    const linked = await db.shipgReturn.findUnique({ where: { shipgermanParcelId }, select: { id: true } });
    if (!shipgermanParcel?.active || linked) redirect("/shipg?view=stock&error=manualStockStale");
  }
  const key = order ? orderNumberKey(order) : null;
  const issue = key
    ? await db.issue.findFirst({
        where: { OR: [{ orderNumberKey: key }, { orderNumberKey: null, orderNumber: order }] },
        select: {
          id: true,
          key: true,
          orderNumber: true,
          customerName: true,
          items: {
            orderBy: { position: "asc" },
            select: { id: true, name: true, variant: true, qty: true, resolution: true },
          },
          parcels: {
            where: { direction: "return" },
            orderBy: { createdAt: "desc" },
            select: { id: true, number: true, state: true, carrierName: true },
          },
        },
      })
    : null;

  // Ročno vpisana zaloga za isto naročilo, ki še ni povezana z nobenim issue-jem
  // in ni rezervirana — kandidat za merge namesto podvojenega vnosa.
  const mergeStock = issue
    ? await db.shipgReturn.findMany({
        where: {
          issueId: null,
          orderNumber: issue.orderNumber,
          shipgermanParcelId: { not: null },
          allocation: { is: null },
        },
        orderBy: { stockedAt: "desc" },
        select: {
          id: true,
          shipgermanParcelId: true,
          trackingNumber: true,
          customerName: true,
          stockedAt: true,
          items: { orderBy: { position: "asc" }, select: { name: true, variant: true, expectedQty: true, receivedQty: true } },
        },
      })
    : [];
  const mergeWeights = mergeStock.length
    ? new Map((await db.shipGermanCachedParcel.findMany({
        where: { id: { in: mergeStock.flatMap((r) => (r.shipgermanParcelId ? [r.shipgermanParcelId] : [])) } },
        select: { id: true, weightGrams: true },
      })).map((p) => [p.id, p.weightGrams] as const))
    : new Map<string, number>();
  const mergeRecords = mergeStock.map((record) => ({
    id: record.id,
    shipgermanParcelId: record.shipgermanParcelId,
    trackingNumber: record.trackingNumber,
    customerName: record.customerName,
    stockedAtLabel: record.stockedAt ? formatDateTime(record.stockedAt, me.locale) : null,
    weightLabel: record.shipgermanParcelId ? formatWeightKg(mergeWeights.get(record.shipgermanParcelId), me.locale) : null,
    items: record.items,
  }));

  return (
    <div className="shipg-surface mx-auto max-w-[920px] px-4 py-6 sm:px-6">
      <Link href={shipgermanParcel ? "/shipg?view=stock" : "/shipg"} className="btn btn-sm btn-plain -ml-2 mb-3">
        <ChevronLeft size={15} /> {t(me.locale, "shipg.title")}
      </Link>

      <div className="mb-5">
        <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.015em]">{t(me.locale, shipgermanParcel ? "shipg.manualStock.title" : "shipg.newTitle")}</h1>
        <p className="mt-1 text-[12.5px] text-label-2">{t(me.locale, shipgermanParcel ? "shipg.manualStock.subtitle" : "shipg.newSubtitle")}</p>
      </div>

      {!shipgermanParcel && <form method="get" className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[220px] flex-1">
          <span className="field-label">{t(me.locale, "shipg.order")}</span>
          <input name="order" defaultValue={order} className="field mono" autoFocus={!order} />
        </label>
        <button type="submit" className="btn">
          <Search size={14} /> {t(me.locale, "shipg.findOrder")}
        </button>
      </form>}

      {!shipgermanParcel && order && !issue && (
        <p className="mb-3 border-l-2 py-1 pl-2.5 text-[12.5px] text-label-2" style={{ borderColor: "var(--warning)" }}>
          {t(me.locale, "shipg.orderNotFound")}
        </p>
      )}

      {shipgermanParcel ? (
        <ShipGermanManualStockForm parcel={{
          id: shipgermanParcel.id,
          sender: shipgermanParcel.sender,
          trackingNumber: shipgermanParcel.trackingNumber,
          carrier: shipgermanParcel.carrier,
          weightGrams: shipgermanParcel.weightGrams,
          dimensionsMm: [shipgermanParcel.lengthMm, shipgermanParcel.widthMm, shipgermanParcel.heightMm],
        }} />
      ) : (
        <>
          {issue && mergeRecords.length > 0 && (
            <>
              <ShipgMergePanel
                issue={{ id: issue.id, orderNumber: issue.orderNumber, items: issue.items }}
                records={mergeRecords}
                locale={me.locale}
              />
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px flex-1" style={{ background: "var(--separator)" }} />
                <span className="caption text-label-3">{t(me.locale, "shipg.merge.orCreate")}</span>
                <span className="h-px flex-1" style={{ background: "var(--separator)" }} />
              </div>
            </>
          )}
          <ShipgReturnForm issue={issue} orderNumber={order} />
        </>
      )}
    </div>
  );
}
