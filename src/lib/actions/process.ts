"use server";

import { revalidatePath } from "next/cache";

import { requireUserStrict } from "../auth";
import { db } from "../db";
import { t } from "../i18n/server";
import { isProcessKind, moved, reindex } from "../process";

/**
 * Urejanje zapisanega poteka. Sme ga vsak prijavljen — potek hodi vsa ekipa in
 * kdor opazi, da je zapisan narobe, ga mora smeti popraviti takoj, sicer zapis
 * zastara in nihče ga več ne bere.
 */

export type ProcessState = { error?: string; ok?: boolean };

const ok: ProcessState = { ok: true };

function text(fd: FormData, name: string, max: number): string | null {
  const value = fd.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed === "" ? null : trimmed;
}

const id = (fd: FormData, name: string) => {
  const value = fd.get(name);
  return typeof value === "string" && value.length > 0 && value.length < 60 ? value : null;
};

function refresh() {
  revalidatePath("/process");
}

// --- veje -------------------------------------------------------------------

export async function saveBranch(_prev: ProcessState, fd: FormData): Promise<ProcessState> {
  const me = await requireUserStrict();
  const title = text(fd, "title", 120);
  if (!title) return { error: t(me.locale, "process.error.title") };

  const data = {
    key: text(fd, "key", 4) ?? "·",
    title,
    subtitle: text(fd, "subtitle", 160),
    updatedById: me.id,
  };

  const branchId = id(fd, "branchId");
  if (branchId) {
    await db.processBranch.update({ where: { id: branchId }, data });
  } else {
    const last = await db.processBranch.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
    await db.processBranch.create({ data: { ...data, position: (last?.position ?? -1) + 1 } });
  }
  refresh();
  return ok;
}

export async function removeBranch(_prev: ProcessState, fd: FormData): Promise<ProcessState> {
  await requireUserStrict();
  const branchId = id(fd, "branchId");
  if (!branchId) return { ok: true };
  // Koraki veje odpadejo z njo (onDelete: Cascade) — veja brez korakov ni zapis.
  await db.processBranch.delete({ where: { id: branchId } }).catch(() => {});
  refresh();
  return ok;
}

export async function moveBranch(_prev: ProcessState, fd: FormData): Promise<ProcessState> {
  await requireUserStrict();
  const branchId = id(fd, "branchId");
  const direction = fd.get("direction") === "up" ? -1 : 1;
  if (!branchId) return { ok: true };

  const branches = await db.processBranch.findMany({ orderBy: { position: "asc" }, select: { id: true } });
  const next = moved(branches, branchId, direction);
  if (!next) return { ok: true };
  await db.$transaction(reindex(next).map((row) => db.processBranch.update({ where: { id: row.id }, data: { position: row.position } })));
  refresh();
  return ok;
}

// --- koraki -----------------------------------------------------------------

export async function saveStep(_prev: ProcessState, fd: FormData): Promise<ProcessState> {
  const me = await requireUserStrict();
  const title = text(fd, "title", 160);
  if (!title) return { error: t(me.locale, "process.error.title") };

  const kindRaw = fd.get("kind");
  const kind = isProcessKind(typeof kindRaw === "string" ? kindRaw : null) ? String(kindRaw) : "act";
  const data = {
    kind,
    title,
    body: text(fd, "body", 400),
    edgeLabel: text(fd, "edgeLabel", 40),
    // Vprašanja hranimo, kot jih je človek natipkal — eno na vrstico.
    open: text(fd, "open", 1200),
    updatedById: me.id,
  };

  const stepId = id(fd, "stepId");
  if (stepId) {
    await db.processStep.update({ where: { id: stepId }, data });
    refresh();
    return ok;
  }

  const branchId = id(fd, "branchId");
  if (!branchId) return { error: t(me.locale, "process.error.branch") };
  const parentId = id(fd, "parentId");
  if (parentId) {
    // Korak se lahko pripne samo pod korak iste veje.
    const parent = await db.processStep.findUnique({ where: { id: parentId }, select: { branchId: true } });
    if (!parent || parent.branchId !== branchId) return { error: t(me.locale, "process.error.branch") };
  }

  const last = await db.processStep.findFirst({
    where: { branchId, parentId: parentId ?? null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  await db.processStep.create({
    data: { ...data, branchId, parentId: parentId ?? null, position: (last?.position ?? -1) + 1 },
  });
  refresh();
  return ok;
}

export async function removeStep(_prev: ProcessState, fd: FormData): Promise<ProcessState> {
  await requireUserStrict();
  const stepId = id(fd, "stepId");
  if (!stepId) return { ok: true };
  // Poti pod korakom gredo z njim: obvisele bi brez vprašanja, ki jih loči.
  await db.processStep.delete({ where: { id: stepId } }).catch(() => {});
  refresh();
  return ok;
}

export async function moveStep(_prev: ProcessState, fd: FormData): Promise<ProcessState> {
  await requireUserStrict();
  const stepId = id(fd, "stepId");
  const direction = fd.get("direction") === "up" ? -1 : 1;
  if (!stepId) return { ok: true };

  const step = await db.processStep.findUnique({ where: { id: stepId }, select: { branchId: true, parentId: true } });
  if (!step) return { ok: true };

  const siblings = await db.processStep.findMany({
    where: { branchId: step.branchId, parentId: step.parentId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const next = moved(siblings, stepId, direction);
  if (!next) return { ok: true };
  await db.$transaction(reindex(next).map((row) => db.processStep.update({ where: { id: row.id }, data: { position: row.position } })));
  refresh();
  return ok;
}
