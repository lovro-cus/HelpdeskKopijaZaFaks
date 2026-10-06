"use server";

import { revalidatePath } from "next/cache";

import { requireAdminStrict, requireUserStrict } from "../auth";
import { loadTextSettings } from "../config/server";
import { db } from "../db";
import { canAccessShipg } from "../domain";
import { t } from "../i18n/server";
import { addressLine } from "../supplier-address";
import { splitTrackings, supplierOrderCode } from "../supplier-import";
import {
  applyTrackings,
  disablePortalToken,
  PENDING_STATUSES,
  previewImport,
  rotatePortalToken,
  validPortalToken,
  type ImportActor,
  type ImportPreview,
  type TrackingEntry,
} from "../supplier-orders";

/**
 * Isti ukazi služijo dvema: zaposlenemu (ShipG dostop) in dobavitelju prek
 * zasebne povezave. Žeton v obrazcu pove, da gre za portal; brez njega mora
 * obstajati seja.
 */
async function actorOf(fd: FormData): Promise<ImportActor> {
  const token = fd.get("portalToken");
  if (typeof token === "string" && token) {
    if (!(await validPortalToken(token))) throw new Error("Forbidden");
    const supplier = (await loadTextSettings()).supplierName;
    return { userId: null, name: `${supplier} (portal)` };
  }
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  return { userId: me.id, name: me.name };
}

function refresh(issueKeys: string[] = []) {
  revalidatePath("/dobavitelj");
  revalidatePath("/portal/[token]", "page");
  for (const key of issueKeys) revalidatePath(`/orders/${key}`);
}

async function keysOf(ids: number[]) {
  const rows = await db.supplierOrder.findMany({ where: { id: { in: ids } }, select: { issue: { select: { key: true } } } });
  return rows.map((row) => row.issue.key);
}

export type ImportState = { preview?: ImportPreview; applied?: number; error?: string };

/** Prvi korak uvoza: prebere datoteko in pokaže, kaj bi se zgodilo. */
export async function previewSupplierImport(_prev: ImportState, fd: FormData): Promise<ImportState> {
  await actorOf(fd);
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { preview: { ok: false, error: "empty" } };
  return { preview: await previewImport(file) };
}

/** Drugi korak: potrjene vrstice. Vse se na strežniku preveri znova. */
export async function applySupplierImport(entries: TrackingEntry[], portalToken: string | null): Promise<ImportState> {
  const fd = new FormData();
  if (portalToken) fd.set("portalToken", portalToken);
  const actor = await actorOf(fd);
  const clean = (Array.isArray(entries) ? entries : []).slice(0, 500).flatMap((entry) => {
    const id = Number(entry?.supplierOrderId);
    if (!Number.isInteger(id) || id <= 0 || !Array.isArray(entry.trackings)) return [];
    const { trackings } = splitTrackings(entry.trackings.filter((value) => typeof value === "string").join(","));
    const carrier = typeof entry.carrier === "string" ? entry.carrier.trim().slice(0, 60) || null : null;
    return trackings.length ? [{ supplierOrderId: id, trackings, carrier }] : [];
  });
  const applied = await applyTrackings(clean, actor);
  refresh(await keysOf(applied));
  return { applied: applied.length };
}

export type RowState = { error?: string; ok?: boolean };

/** Tracking za eno vrstico na roko — npr. ko ga dobavitelj pošlje v sporočilu. */
export async function addSupplierTracking(_prev: RowState, fd: FormData): Promise<RowState> {
  const actor = await actorOf(fd);
  const locale = actor.userId ? (await requireUserStrict()).locale : "en";
  const id = Number(fd.get("supplierOrderId"));
  const { trackings, invalid } = splitTrackings(String(fd.get("tracking") ?? ""));
  if (!Number.isInteger(id) || id <= 0) return { error: t(locale, "supplier.error.missing") };
  if (!trackings.length || invalid.length) return { error: t(locale, "supplier.error.tracking") };
  const carrier = String(fd.get("carrier") ?? "").trim().slice(0, 60) || null;
  const applied = await applyTrackings([{ supplierOrderId: id, trackings, carrier }], actor);
  if (!applied.length) return { error: t(locale, "supplier.error.notPending") };
  refresh(await keysOf(applied));
  return { ok: true };
}

async function staff() {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  return me;
}

/** Preklic zahteve, ki je dobavitelj še ni poslal (npr. paket se je našel). */
export async function cancelSupplierOrder(fd: FormData): Promise<void> {
  const me = await staff();
  const id = Number(fd.get("supplierOrderId"));
  const order = Number.isInteger(id) && id > 0
    ? await db.supplierOrder.findUnique({ where: { id }, include: { issue: { select: { id: true, key: true } } } })
    : null;
  if (!order || !PENDING_STATUSES.includes(order.status)) return;
  await db.$transaction([
    db.supplierOrder.update({ where: { id }, data: { status: "cancelled" } }),
    db.event.create({
      data: {
        issueId: order.issue.id, kind: "system", field: "supplier_order",
        fromValue: order.status, toValue: "cancelled", body: supplierOrderCode(id), authorId: me.id,
      },
    }),
  ]);
  refresh([order.issue.key]);
}

const text = (fd: FormData, name: string, max = 120) => String(fd.get(name) ?? "").trim().slice(0, max) || null;

/** Popravek naslova ali opombe, preden gre zahteva k dobavitelju. */
export async function updateSupplierOrder(_prev: RowState, fd: FormData): Promise<RowState> {
  const me = await staff();
  const id = Number(fd.get("supplierOrderId"));
  const order = Number.isInteger(id) && id > 0
    ? await db.supplierOrder.findUnique({ where: { id }, include: { issue: { select: { id: true, key: true } } } })
    : null;
  if (!order || !PENDING_STATUSES.includes(order.status)) return { error: t(me.locale, "supplier.error.notPending") };
  const data = {
    recipient: text(fd, "recipient"),
    company: text(fd, "company"),
    address1: text(fd, "address1", 200),
    address2: text(fd, "address2", 200),
    zip: text(fd, "zip", 20),
    city: text(fd, "city"),
    province: text(fd, "province"),
    country: text(fd, "country"),
    countryCode: text(fd, "countryCode", 2)?.toUpperCase() ?? null,
    phone: text(fd, "phone", 40),
    email: text(fd, "email", 200),
    note: text(fd, "note", 500),
  };
  if (!data.recipient || !data.address1) return { error: t(me.locale, "supplier.error.address") };
  await db.$transaction([
    db.supplierOrder.update({ where: { id }, data }),
    db.event.create({
      data: {
        issueId: order.issue.id, kind: "system", field: "supplier_address",
        fromValue: addressLine(order) || null, toValue: addressLine(data) || null,
        body: supplierOrderCode(id), authorId: me.id,
      },
    }),
  ]);
  refresh([order.issue.key]);
  return { ok: true };
}

export type PortalLinkState = { link?: string; disabled?: boolean };

/** Nova zasebna povezava za dobavitelja; prejšnja s tem neha delovati. */
export async function rotateSupplierPortal(_prev: PortalLinkState, _fd: FormData): Promise<PortalLinkState> {
  await requireAdminStrict();
  const token = await rotatePortalToken();
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  revalidatePath("/dobavitelj");
  return { link: `${base}/portal/${token}` };
}

export async function disableSupplierPortal(_prev: PortalLinkState, _fd: FormData): Promise<PortalLinkState> {
  await requireAdminStrict();
  await disablePortalToken();
  revalidatePath("/dobavitelj");
  return { disabled: true };
}
