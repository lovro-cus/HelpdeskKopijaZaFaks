"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { PackagePlus, Plus, Trash2 } from "lucide-react";

import { createManualShipGermanStock, type ShipgFormState } from "@/lib/actions/shipg";
import { catalogTitles } from "@/lib/catalog";
import { MATCH_QUALITIES } from "@/lib/domain";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { EmailConversation } from "./EmailConversation";
import type { EditableItem } from "./ItemsEditor";
import { Notice } from "./ui";

const initialState: ShipgFormState = {};

type ParcelSummary = {
  id: string;
  sender: string;
  trackingNumber: string | null;
  carrier: string;
  weightGrams: number;
  dimensionsMm: [number, number, number];
};

type ManualRow = { id: number; name: string; variant: string; quantity: number };

export function ShipGermanManualStockForm({ parcel }: { parcel: ParcelSummary }) {
  const t = useT();
  const [state, action] = useActionState(createManualShipGermanStock, initialState);
  const [rows, setRows] = useState<ManualRow[]>([{ id: 0, name: "", variant: "", quantity: 1 }]);
  const [nextId, setNextId] = useState(1);
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState(parcel.sender || "");
  const [customerEmail, setCustomerEmail] = useState("");
  const emailReady = Boolean(orderNumber.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()));

  function addItem() {
    if (rows.length >= 20) return;
    setRows((current) => [...current, { id: nextId, name: "", variant: "", quantity: 1 }]);
    setNextId((current) => current + 1);
  }

  function fillShopifyItems(items: EditableItem[]) {
    const imported = items.slice(0, 20).map((item, index) => ({
      id: nextId + index,
      name: item.name,
      variant: item.variant,
      quantity: Math.max(1, Number.parseInt(item.qty, 10) || 1),
    }));
    const replacement = imported.length > 0
      ? imported
      : [{ id: nextId, name: "", variant: "", quantity: 1 }];
    setRows(replacement);
    setNextId((current) => current + replacement.length);
    return imported.length;
  }

  return (
    <form action={action} className="card overflow-hidden">
      <input type="hidden" name="shipgermanParcelId" value={parcel.id} />
      <datalist id="shipgerman-manual-products">
        {catalogTitles().map((title) => <option key={title} value={title} />)}
      </datalist>

      <div className="grid gap-3 border-b p-4 sm:grid-cols-3" style={{ background: "var(--sheet-2)" }}>
        <div className="min-w-0">
          <p className="field-label">{t("shipg.external.sender")}</p>
          <p className="mt-1 truncate text-[12.5px] font-medium">{parcel.sender || "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="field-label">{t("shipg.external.tracking")}</p>
          <p className="mono mt-1 truncate text-[11.5px]">{parcel.trackingNumber || t("shipg.external.unknown")}</p>
          <p className="mt-0.5 text-[10.5px] text-label-2">{parcel.carrier}</p>
        </div>
        <div className="min-w-0">
          <p className="field-label">ShipGerman ID</p>
          <p className="mono mt-1 truncate text-[11.5px]">{parcel.id}</p>
          <p className="mono mt-0.5 text-[10.5px] text-label-2">
            {parcel.dimensionsMm.map((value) => value / 10).join(" × ")} cm · {(parcel.weightGrams / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-3">
        <div>
          <label>
            <span className="field-label">{t("shipg.order")}</span>
            <input
              name="orderNumber"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              maxLength={40}
              required
              autoFocus
              className="field mono"
              placeholder="#2430"
            />
          </label>
        </div>
        <label>
          <span className="field-label">{t("shipg.customerName")}</span>
          <input
            name="customerName"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            maxLength={120}
            className="field"
          />
        </label>
        <div>
          <label>
            <span className="field-label">{t("new.email")}</span>
            <input
              name="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              maxLength={320}
              className="field"
              placeholder="customer@example.com"
            />
          </label>
          <div className="mt-2">
            <EmailConversation
              customerEmail={customerEmail.trim()}
              customerName={customerName.trim() || null}
              orderNumber={orderNumber.trim()}
              disabled={!emailReady}
            />
          </div>
        </div>
      </div>

      <fieldset className="border-t p-4">
        <legend className="sr-only">{t("shipg.manualStock.contents")}</legend>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="caption">{t("shipg.manualStock.contents")}</p>
          <button type="button" onClick={addItem} disabled={rows.length >= 20} className="btn btn-sm">
            <Plus size={13} /> {t("shipg.manualStock.addItem")}
          </button>
        </div>
        <p className="mt-1 text-[11.5px] text-label-2">{t("shipg.manualStock.contentsHint")}</p>

        <div className="mt-3 grid gap-2">
          {rows.map((row, index) => (
            <div key={row.id} className="grid gap-2 border-t pt-3 sm:grid-cols-[minmax(220px,1.5fr)_minmax(180px,1fr)_90px_34px] sm:items-end" style={{ borderColor: "var(--rule)" }}>
              <label className="min-w-0">
                <span className="field-label">{t("shipg.itemName")}</span>
                <input name="itemName" list="shipgerman-manual-products" defaultValue={row.name} maxLength={200} required={index === 0} className="field" />
              </label>
              <label className="min-w-0">
                <span className="field-label">{t("shipg.variant")}</span>
                <input name="itemVariant" defaultValue={row.variant} maxLength={120} className="field" />
              </label>
              <label>
                <span className="field-label">{t("shipg.quantity")}</span>
                <input name="itemQty" type="number" min={1} max={9999} defaultValue={row.quantity} className="field mono" />
              </label>
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                disabled={rows.length === 1}
                className="btn btn-sm px-2"
                aria-label={t("shipg.manualStock.removeItem")}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 border-t p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        {/* Gotovost se odloči tu, ob vpisu, ko človek paket dejansko gleda —
            pozneje se je nihče ne spomni preveriti. */}
        <label>
          <span className="field-label">{t("matchQuality.label")}</span>
          <select name="matchQuality" defaultValue="high" className="field">
            {MATCH_QUALITIES.map((quality) => (
              <option key={quality} value={quality}>{t(`matchQuality.${quality}` as TranslationKey)}</option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-label-2">{t("matchQuality.hint")}</span>
        </label>
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

function Submit() {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      <PackagePlus size={15} />
      {pending ? t("shipg.manualStock.saving") : t("shipg.manualStock.save")}
    </button>
  );
}
