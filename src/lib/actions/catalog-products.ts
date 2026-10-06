"use server";

import { revalidatePath } from "next/cache";

import { requirePermissionStrict, type SessionUser } from "../auth";
import { invalidateCatalog } from "../catalog-server";
import { NEW_GROUP } from "../catalog-suggest";
import { db } from "../db";
import { t } from "../i18n/server";
import { logManage } from "../manage-log";

/**
 * Urejanje kataloga na strani »Urejanje« (admin ali pravica "products"): branje iz Shopifyja, skupine (isti kos v več
 * jezikih) in jezik izdelka. Vsaka sprememba razveljavi posnetek kataloga, da
 * jo naslednja stran in naslednje ujemanje zaloge že upoštevata.
 */

export type ProductsState = { ok?: boolean; error?: string };

async function done(me: SessionUser, action: string, detail: string): Promise<ProductsState> {
  invalidateCatalog();
  await logManage("products", action, detail, me.id);
  revalidatePath("/urejanje");
  return { ok: true };
}

const productTitle = async (id: string) =>
  (await db.catalogProduct.findUnique({ where: { id }, select: { title: true } }))?.title ?? id;
const groupLabel = async (id: string | null) =>
  id ? (await db.productGroup.findUnique({ where: { id }, select: { label: true } }))?.label ?? id : "";

const ids = (values: unknown): string[] =>
  Array.isArray(values) ? [...new Set(values.filter((value): value is string => typeof value === "string" && value.length < 60))] : [];

function parseList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Stabilen ključ iz imena: ascii, pomišljaji, brez podvojitev. */
async function uniqueKey(label: string): Promise<string> {
  const base = label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "skupina";
  const taken = new Set((await db.productGroup.findMany({ where: { key: { startsWith: base } }, select: { key: true } })).map((row) => row.key));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Izdelek v skupino ali iz nje (groupId null). */
export async function assignProduct(productId: string, groupId: string | null): Promise<ProductsState> {
  const me = await requirePermissionStrict("products");
  try {
    await db.catalogProduct.update({ where: { id: productId }, data: { groupId } });
  } catch {
    return { error: t(me.locale, "products.error.generic") };
  }
  const product = await productTitle(productId);
  return groupId
    ? done(me, "product.group", `${product} → ${await groupLabel(groupId)}`)
    : done(me, "product.ungroup", product);
}

export async function joinGroup(groupId: string, productIds: string[]): Promise<ProductsState> {
  const me = await requirePermissionStrict("products");
  const selected = ids(productIds);
  if (selected.length === 0) return { ok: true };
  const group = await db.productGroup.findUnique({ where: { id: groupId }, select: { id: true } });
  if (!group) return { error: t(me.locale, "products.error.generic") };
  await db.catalogProduct.updateMany({ where: { id: { in: selected } }, data: { groupId } });
  return done(me, "group.join", `${await groupLabel(groupId)} (+${selected.length})`);
}

export async function createGroup(label: string, productIds: string[]): Promise<ProductsState> {
  const me = await requirePermissionStrict("products");
  const name = label.trim().slice(0, 60);
  if (!name) return { error: t(me.locale, "products.error.label") };
  const last = await db.productGroup.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  const group = await db.productGroup.create({
    data: { key: await uniqueKey(name), label: name, position: (last?.position ?? -1) + 1 },
  });
  const selected = ids(productIds);
  if (selected.length > 0) await db.catalogProduct.updateMany({ where: { id: { in: selected } }, data: { groupId: group.id } });
  return done(me, "group.create", name);
}

export async function updateGroup(groupId: string, patch: { label?: string; genderAgnostic?: boolean }): Promise<ProductsState> {
  const me = await requirePermissionStrict("products");
  const data: { label?: string; genderAgnostic?: boolean } = {};
  if (typeof patch.label === "string") {
    const name = patch.label.trim().slice(0, 60);
    if (!name) return { error: t(me.locale, "products.error.label") };
    data.label = name;
  }
  if (typeof patch.genderAgnostic === "boolean") data.genderAgnostic = patch.genderAgnostic;
  try {
    await db.productGroup.update({ where: { id: groupId }, data });
  } catch {
    return { error: t(me.locale, "products.error.generic") };
  }
  return done(me, "group.update", await groupLabel(groupId));
}

/** Izdelki izbrisane skupine ostanejo, samo brez skupine. */
export async function deleteGroup(groupId: string): Promise<ProductsState> {
  const me = await requirePermissionStrict("products");
  const label = await groupLabel(groupId);
  await db.productGroup.deleteMany({ where: { id: groupId } });
  return done(me, "group.delete", label);
}

export async function removeAlias(groupId: string, alias: string): Promise<ProductsState> {
  const me = await requirePermissionStrict("products");
  const group = await db.productGroup.findUnique({ where: { id: groupId }, select: { aliases: true } });
  if (!group) return { error: t(me.locale, "products.error.generic") };
  await db.productGroup.update({
    where: { id: groupId },
    data: { aliases: JSON.stringify(parseList(group.aliases).filter((item) => item !== alias)) },
  });
  return done(me, "group.alias", `${await groupLabel(groupId)}: ${alias}`);
}

/** "Ni isti kos": predlog za te izdelke se ne vrne. */
export async function dismissSuggestion(productIds: string[], target: string): Promise<ProductsState> {
  const me = await requirePermissionStrict("products");
  const selected = ids(productIds);
  const value = target === NEW_GROUP ? NEW_GROUP : target.slice(0, 60);
  const rows = await db.catalogProduct.findMany({ where: { id: { in: selected } }, select: { id: true, dismissed: true } });
  for (const row of rows) {
    const list = parseList(row.dismissed);
    if (!list.includes(value)) {
      await db.catalogProduct.update({ where: { id: row.id }, data: { dismissed: JSON.stringify([...list, value]) } });
    }
  }
  return done(me, "suggestion.dismiss", `${rows.length}×`);
}

export async function setProductLanguage(productId: string, language: string | null): Promise<ProductsState> {
  const me = await requirePermissionStrict("products");
  const code = language && /^[a-z]{2}$/.test(language) ? language : null;
  try {
    await db.catalogProduct.update({ where: { id: productId }, data: { language: code } });
  } catch {
    return { error: t(me.locale, "products.error.generic") };
  }
  return done(me, "product.language", `${await productTitle(productId)} → ${code ?? "—"}`);
}
