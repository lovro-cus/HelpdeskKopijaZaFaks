"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, Pencil, Truck } from "lucide-react";

import {
  addSupplierTracking,
  disableSupplierPortal,
  rotateSupplierPortal,
  updateSupplierOrder,
  type PortalLinkState,
  type RowState,
} from "@/lib/actions/supplier-orders";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { useT } from "@/lib/i18n/client";
import { Notice } from "./ui";

const initialRow: RowState = {};

/** Tracking za eno zahtevo na roko — ko pride po WhatsAppu ali mailu. */
export function SupplierTrackingForm({ supplierOrderId, portalToken }: { supplierOrderId: number; portalToken: string | null }) {
  const t = useT();
  const router = useRouter();
  const [state, action, pending] = useActionState(addSupplierTracking, initialRow);
  useEffect(() => { if (state.ok) router.refresh(); }, [state, router]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="supplierOrderId" value={supplierOrderId} />
      {portalToken && <input type="hidden" name="portalToken" value={portalToken} />}
      <input name="tracking" className="field mono h-8 w-[180px] text-[12px]" placeholder={t("supplier.tracking.placeholder")} aria-label={t("supplier.col.tracking")} required />
      <input name="carrier" className="field h-8 w-[110px] text-[12px]" placeholder={t("supplier.col.carrier")} aria-label={t("supplier.col.carrier")} />
      <button type="submit" className="btn btn-sm" disabled={pending}><Truck size={13} />{t("supplier.tracking.save")}</button>
      {state.error && <span className="w-full"><Notice kind="error">{state.error}</Notice></span>}
    </form>
  );
}

type Address = {
  recipient: string | null; company: string | null; address1: string | null; address2: string | null;
  zip: string | null; city: string | null; province: string | null; country: string | null;
  countryCode: string | null; phone: string | null; email: string | null; note: string | null;
};

const FIELDS: { name: keyof Address; label: string; wide?: boolean }[] = [
  { name: "recipient", label: "supplier.address.recipient" },
  { name: "company", label: "supplier.address.company" },
  { name: "address1", label: "supplier.address.address1", wide: true },
  { name: "address2", label: "supplier.address.address2", wide: true },
  { name: "zip", label: "supplier.address.zip" },
  { name: "city", label: "supplier.address.city" },
  { name: "province", label: "supplier.address.province" },
  { name: "country", label: "supplier.address.country" },
  { name: "countryCode", label: "supplier.address.countryCode" },
  { name: "phone", label: "supplier.address.phone" },
  { name: "email", label: "supplier.address.email", wide: true },
  { name: "note", label: "supplier.address.note", wide: true },
];

/** Popravek naslova pred izvozom (stranka je sporočila drugega). */
export function SupplierAddressForm({ supplierOrderId, address }: { supplierOrderId: number; address: Address }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateSupplierOrder, initialRow);
  useEffect(() => { if (state.ok) { setOpen(false); router.refresh(); } }, [state, router]);

  if (!open) {
    return (
      <button type="button" className="btn btn-sm btn-plain" onClick={() => setOpen(true)}>
        <Pencil size={13} />{t("supplier.address.edit")}
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 grid w-full max-w-[560px] grid-cols-2 gap-2">
      <input type="hidden" name="supplierOrderId" value={supplierOrderId} />
      {FIELDS.map((field) => (
        <label key={field.name} className={field.wide ? "col-span-2" : undefined}>
          <span className="field-label">{t(field.label as TranslationKey)}</span>
          <input name={field.name} defaultValue={address[field.name] ?? ""} className="field h-8 w-full text-[12.5px]" />
        </label>
      ))}
      <div className="col-span-2 flex items-center gap-2">
        <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>{t("supplier.address.save")}</button>
        <button type="button" className="btn btn-sm btn-plain" onClick={() => setOpen(false)}>{t("supplier.address.cancel")}</button>
      </div>
      {state.error && <div className="col-span-2"><Notice kind="error">{state.error}</Notice></div>}
    </form>
  );
}

const initialLink: PortalLinkState = {};

/** Admin ustvari (ali zamenja) zasebno povezavo za dobavitelja. */
export function SupplierPortalLink({ enabled }: { enabled: boolean }) {
  const t = useT();
  const [rotated, rotate, rotating] = useActionState(rotateSupplierPortal, initialLink);
  const [disabled, disable, disabling] = useActionState(disableSupplierPortal, initialLink);
  const [copied, setCopied] = useState(false);
  const active = rotated.link ? true : disabled.disabled ? false : enabled;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <form action={rotate}>
          <button type="submit" className="btn btn-sm" disabled={rotating}
            onClick={(event) => { if (active && !confirm(t("supplier.portal.rotateConfirm"))) event.preventDefault(); }}>
            <Link2 size={13} />{t(active ? "supplier.portal.rotate" : "supplier.portal.create")}
          </button>
        </form>
        {active && (
          <form action={disable}>
            <button type="submit" className="btn btn-sm btn-plain" disabled={disabling}
              onClick={(event) => { if (!confirm(t("supplier.portal.disableConfirm"))) event.preventDefault(); }}>
              {t("supplier.portal.disable")}
            </button>
          </form>
        )}
        <span className="text-[11.5px] text-label-3">{t(active ? "supplier.portal.active" : "supplier.portal.inactive")}</span>
      </div>
      {rotated.link && !disabled.disabled && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input readOnly value={rotated.link} className="field mono h-8 w-full max-w-[520px] text-[12px]" onFocus={(event) => event.currentTarget.select()} />
          <button type="button" className="btn btn-sm" onClick={() => { void navigator.clipboard?.writeText(rotated.link!); setCopied(true); }}>
            <Copy size={13} />{t(copied ? "supplier.portal.copied" : "supplier.portal.copy")}
          </button>
          <p className="w-full text-[11.5px] text-label-3">{t("supplier.portal.onceHint")}</p>
        </div>
      )}
    </div>
  );
}
