"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { PackagePlus } from "lucide-react";

import { createShipgReturn, type ShipgFormState } from "@/lib/actions/shipg";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { Notice } from "./ui";

const initialState: ShipgFormState = {};

type LinkedIssue = {
  id: number;
  key: string;
  orderNumber: string;
  customerName: string | null;
  items: { id: number; name: string; variant: string | null; qty: number; resolution: string }[];
  parcels: { id: number; number: string; state: string; carrierName: string | null }[];
};

export function ShipgReturnForm({ issue, orderNumber }: { issue: LinkedIssue | null; orderNumber: string }) {
  const t = useT();
  const [state, action] = useActionState(createShipgReturn, initialState);
  const arrivedParcel = issue?.parcels.find((parcel) => parcel.state === "arrived");
  const selectedParcel = arrivedParcel ?? issue?.parcels[0] ?? null;
  const [parcelId, setParcelId] = useState(selectedParcel ? String(selectedParcel.id) : "");
  const [newTracking, setNewTracking] = useState("");
  const [manualStatus, setManualStatus] = useState(arrivedParcel ? "check" : "expected");
  const activeParcel = issue?.parcels.find((parcel) => String(parcel.id) === parcelId) ?? null;
  const automaticStatus = issue && newTracking.trim()
    ? "expected"
    : activeParcel
      ? activeParcel.state === "arrived" ? "check" : "expected"
      : null;
  const shownStatus = automaticStatus ?? manualStatus;

  return (
    <form action={action} className="card overflow-hidden">
      {issue && <input type="hidden" name="issueId" value={issue.id} />}

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <label>
          <span className="field-label">{t("shipg.order")}</span>
          <input
            name="orderNumber"
            defaultValue={issue?.orderNumber ?? orderNumber}
            maxLength={40}
            required
            readOnly={Boolean(issue)}
            className="field mono"
          />
          {issue && (
            <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-label-2">
              <span>{t("shipg.linkedOrder", { key: issue.key })}</span>
              <a href="/shipg/new" className="link">{t("shipg.changeOrder")}</a>
            </span>
          )}
        </label>

        <label>
          <span className="field-label">{t("shipg.customerName")}</span>
          <input name="customerName" defaultValue={issue?.customerName ?? ""} maxLength={120} className="field" />
        </label>

        {issue && issue.parcels.length > 0 ? (
          <div className="grid gap-2">
            <label>
              <span className="field-label">{t("shipg.tracking")}</span>
              <select name="parcelId" value={parcelId} onChange={(event) => setParcelId(event.target.value)} className="field mono">
                <option value="">—</option>
                {issue.parcels.map((parcel) => (
                  <option key={parcel.id} value={parcel.id}>
                    {parcel.number} · {parcel.carrierName || parcel.state}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">{t("shipg.newTracking")}</span>
              <input name="trackingNumber" value={newTracking} onChange={(event) => setNewTracking(event.target.value)} maxLength={80} className="field mono" />
            </label>
          </div>
        ) : (
          <label>
            <span className="field-label">{t("shipg.tracking")}</span>
            <input name="trackingNumber" value={newTracking} onChange={(event) => setNewTracking(event.target.value)} maxLength={80} className="field mono" />
          </label>
        )}

        <label>
          <span className="field-label">{t("shipg.initialStatus")}</span>
          {automaticStatus && <input type="hidden" name="status" value={automaticStatus} />}
          <select
            name={automaticStatus ? undefined : "status"}
            value={shownStatus}
            onChange={(event) => setManualStatus(event.target.value)}
            disabled={Boolean(automaticStatus)}
            className="field"
          >
            {issue && <option value="expected">{t("shipg.status.expected")}</option>}
            <option value="check">{t("shipg.status.check")}</option>
          </select>
          {automaticStatus && <span className="mt-1 block text-[11px] text-label-2">{t("shipg.stageFromTracking")}</span>}
        </label>
      </div>

      {issue && issue.items.length > 0 && (
        <fieldset className="border-t p-4">
          <legend className="caption px-1">{t("shipg.selectItems")}</legend>
          <div className="mt-1 divide-y" style={{ borderColor: "var(--rule)" }}>
            {issue.items.map((item) => {
              const returning = item.resolution === "refund" || item.resolution === "exchange";
              return (
                <label key={item.id} className="flex cursor-pointer items-start gap-3 py-2.5">
                  <input name="issueItemId" value={item.id} type="checkbox" defaultChecked={returning} className="mt-1" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{item.name}</span>
                    <span className="mono block text-[11px] text-label-2">{item.variant || "—"} · ×{item.qty}</span>
                  </span>
                  <span className="pill">{t(`res.${item.resolution}` as TranslationKey)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {issue && issue.items.length > 0 ? (
        <details className="border-t p-4">
          <summary className="btn btn-sm w-fit cursor-pointer">{t("shipg.addManualItem")}</summary>
          <ManualItemFields />
        </details>
      ) : (
        <fieldset className="border-t p-4">
          <legend className="caption px-1">{t("shipg.manualItem")}</legend>
          <ManualItemFields />
        </fieldset>
      )}

      <div className="border-t p-4">
        <label>
          <span className="field-label">{t("shipg.notes")}</span>
          <textarea name="notes" maxLength={1000} className="field" />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3" style={{ background: "var(--sheet-2)" }}>
        <div>{state.error && <Notice kind="error">{state.error}</Notice>}</div>
        <Submit />
      </div>
    </form>
  );
}

function ManualItemFields() {
  const t = useT();
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(180px,1.4fr)_minmax(150px,1fr)_90px]">
          <label>
            <span className="field-label">{t("shipg.itemName")}</span>
            <input name="manualItemName" maxLength={200} className="field" />
          </label>
          <label>
            <span className="field-label">{t("shipg.variant")}</span>
            <input name="manualItemVariant" maxLength={120} className="field" />
          </label>
          <label>
            <span className="field-label">{t("shipg.quantity")}</span>
            <input name="manualItemQty" type="number" min={1} max={9999} defaultValue={1} className="field mono" />
          </label>
    </div>
  );
}

function Submit() {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      <PackagePlus size={15} />
      {pending ? t("shipg.creating") : t("shipg.create")}
    </button>
  );
}
