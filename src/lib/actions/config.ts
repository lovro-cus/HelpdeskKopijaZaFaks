"use server";

import { revalidatePath } from "next/cache";

import { requireAdminStrict } from "../auth";
import { db } from "../db";
import { parseSetting, parseTextSetting, SETTING_KEYS, TEXT_SETTING_KEYS, type SettingKey, type TextSettingKey } from "../config/defaults";
import { isCategoryColor, normalizeCategoryKey, type CategoryKind } from "../config/shared";
import { t } from "../i18n/server";

export type FormState = { error?: string; ok?: string };

/**
 * Urejanje šifranta in nastavitev. Vse spremembe so na strežniku preverjene
 * znova: obrazec je pripomoček, ne dokaz.
 */

const KINDS: CategoryKind[] = ["type", "priority"];

function kindOf(fd: FormData): CategoryKind | null {
  const kind = String(fd.get("kind") ?? "");
  return KINDS.includes(kind as CategoryKind) ? (kind as CategoryKind) : null;
}

/** Vsaka stran, ki šifrant bere, je dinamična — osvežimo le, kar je odprto. */
function refresh() {
  revalidatePath("/admin");
  revalidatePath("/orders");
}

export async function createCategory(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdminStrict();
  const kind = kindOf(fd);
  if (!kind) return { error: t(me.locale, "catalog.error.kind") };

  const label = String(fd.get("label") ?? "").trim().slice(0, 40);
  if (label.length < 2) return { error: t(me.locale, "catalog.error.label") };

  // Ključ se izpelje iz imena in ostane za vedno — preimenovanje spremeni samo
  // napis, tiketi pa se sklicujejo na ključ.
  const key = normalizeCategoryKey(label);
  if (!key) return { error: t(me.locale, "catalog.error.label") };

  const clash = await db.category.findUnique({ where: { kind_key: { kind, key } } });
  if (clash) return { error: t(me.locale, "catalog.error.exists") };

  const color = String(fd.get("color") ?? "");
  const last = await db.category.findFirst({ where: { kind }, orderBy: { position: "desc" } });

  await db.category.create({
    data: {
      kind,
      key,
      label,
      color: kind === "priority" && isCategoryColor(color) ? color : null,
      position: (last?.position ?? -1) + 1,
      requiresReturn: kind === "type" && fd.get("requiresReturn") === "on",
      watchFulfillment: kind === "type" && fd.get("watchFulfillment") === "on",
    },
  });

  refresh();
  return { ok: t(me.locale, "catalog.ok.created", { label }) };
}

export async function updateCategory(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdminStrict();
  const id = String(fd.get("id") ?? "");
  const category = await db.category.findUnique({ where: { id } });
  if (!category) return { error: t(me.locale, "catalog.error.missing") };

  const label = String(fd.get("label") ?? "").trim().slice(0, 40);
  if (label.length < 2) return { error: t(me.locale, "catalog.error.label") };

  const color = String(fd.get("color") ?? "");

  await db.category.update({
    where: { id },
    data: {
      label,
      ...(category.kind === "priority" ? { color: isCategoryColor(color) ? color : null } : {}),
      ...(category.kind === "type"
        ? {
            requiresReturn: fd.get("requiresReturn") === "on",
            watchFulfillment: fd.get("watchFulfillment") === "on",
          }
        : {}),
    },
  });

  refresh();
  return { ok: t(me.locale, "catalog.ok.saved") };
}

/**
 * Brisanje: kar nihče ne uporablja, gre zares proč; kar je na tiketih, se samo
 * skrije. Tako se stari tiketi še naprej pravilno izpišejo, izbirniki pa
 * ostanejo kratki.
 */
export async function removeCategory(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdminStrict();
  const id = String(fd.get("id") ?? "");
  const category = await db.category.findUnique({ where: { id } });
  if (!category) return { error: t(me.locale, "catalog.error.missing") };

  const remaining = await db.category.count({
    where: { kind: category.kind, hidden: false, id: { not: id } },
  });
  if (remaining === 0) return { error: t(me.locale, "catalog.error.last") };

  const used =
    category.kind === "type"
      ? await db.issue.count({ where: { type: category.key } })
      : await db.issue.count({ where: { priority: category.key } });

  if (used === 0 && !category.builtin) {
    await db.category.delete({ where: { id } });
    refresh();
    return { ok: t(me.locale, "catalog.ok.deleted") };
  }

  await db.category.update({ where: { id }, data: { hidden: true } });
  refresh();
  return { ok: t(me.locale, "catalog.ok.hidden", { count: used }) };
}

export async function restoreCategory(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdminStrict();
  const id = String(fd.get("id") ?? "");
  const category = await db.category.findUnique({ where: { id } });
  if (!category) return { error: t(me.locale, "catalog.error.missing") };

  await db.category.update({ where: { id }, data: { hidden: false } });
  refresh();
  return { ok: t(me.locale, "catalog.ok.restored") };
}

/** Premik za eno mesto. Vrstni red je viden povsod: v filtrih, izbirnikih in
 *  pri razvrščanju po vrsti — zato ga admin postavi sam. */
export async function moveCategory(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdminStrict();
  const id = String(fd.get("id") ?? "");
  const up = String(fd.get("direction") ?? "") === "up";

  const category = await db.category.findUnique({ where: { id } });
  if (!category) return { error: t(me.locale, "catalog.error.missing") };

  const neighbour = await db.category.findFirst({
    where: {
      kind: category.kind,
      position: up ? { lt: category.position } : { gt: category.position },
    },
    orderBy: { position: up ? "desc" : "asc" },
  });
  if (!neighbour) return {};

  await db.$transaction([
    db.category.update({ where: { id: category.id }, data: { position: neighbour.position } }),
    db.category.update({ where: { id: neighbour.id }, data: { position: category.position } }),
  ]);

  refresh();
  return {};
}

export async function updateAppSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdminStrict();

  const writes: { key: SettingKey | TextSettingKey; value: string }[] = [];
  for (const key of SETTING_KEYS) {
    if (!fd.has(key)) continue;
    const value = parseSetting(key, String(fd.get(key) ?? ""));
    if (value === null) return { error: t(me.locale, "catalog.error.number") };
    writes.push({ key, value: String(value) });
  }
  for (const key of TEXT_SETTING_KEYS) {
    if (!fd.has(key)) continue;
    const value = parseTextSetting(key, String(fd.get(key) ?? ""));
    if (value === null) return { error: t(me.locale, "catalog.error.emptyName") };
    writes.push({ key, value });
  }

  // Opozorilo pred plačljivostjo mora priti prej kot plačljivost sama, sicer
  // rumena barva ne pomeni ničesar.
  const free = Number(writes.find((row) => row.key === "storageFreeDays")?.value);
  const warn = Number(writes.find((row) => row.key === "storageWarnDays")?.value);
  if (Number.isFinite(free) && Number.isFinite(warn) && warn > free) {
    return { error: t(me.locale, "catalog.error.warnDays") };
  }

  await db.$transaction(
    writes.map((row) =>
      db.appSetting.upsert({
        where: { key: row.key },
        create: { key: row.key, value: row.value },
        update: { value: row.value },
      }),
    ),
  );

  refresh();
  return { ok: t(me.locale, "catalog.ok.settings") };
}
