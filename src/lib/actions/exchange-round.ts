"use server";

import { revalidatePath } from "next/cache";
import type { Parcel } from "@prisma/client";

import { requireUserStrict } from "../auth";
import { canonicalKey } from "../catalog-canonical";
import { ensureCatalog } from "../catalog-server";
import { db } from "../db";
import { canAccessShipg, MAX_PARCELS } from "../domain";
import {
  isRoundFault,
  nextRoundItems,
  parseReturnRows,
  roundBlocker,
  roundSummary,
  snapshotLines,
  suggestedReturnRows,
} from "../exchange-round";
import { t } from "../i18n/server";
import { normalizeNumber } from "../tracking/provider";
import { syncParcels } from "../tracking/sync";
import { tracker } from "../tracking/offline";

export type RoundState = { error?: string; ok?: boolean };

/**
 * Začne nov krog menjave pri istem naročilu: stranka je dobila nadomestek in
 * želi menjati znova. Prejšnji krog se zapiše, postavke pa se prestavijo na kos,
 * ki ga ima stranka zdaj — tako register pri vračilu pričakuje pravi kos, nova
 * rezervacija pa ni zaklenjena z odposlanim paketom prejšnjega kroga.
 *
 * Zaključen ticket se odpre: nov krog je delo, ki še ni opravljeno.
 */
export async function startExchangeRound(_prev: RoundState, fd: FormData): Promise<RoundState> {
  const me = await requireUserStrict();
  const issueId = Number(fd.get("issueId"));
  if (!Number.isInteger(issueId) || issueId <= 0) return { error: t(me.locale, "error.invalidOrder") };

  const fault = fd.get("fault");
  if (!isRoundFault(fault)) return { error: t(me.locale, "round.error.fault") };
  const rawNote = fd.get("note");
  const note = typeof rawNote === "string" ? rawNote.trim().slice(0, 1000) || null : null;

  const issue = await db.issue.findUnique({
    where: { id: issueId },
    include: {
      items: { orderBy: { position: "asc" } },
      shipgAllocations: { select: { status: true, exchangeRound: true } },
    },
  });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };

  const active = issue.shipgAllocations
    .filter((allocation) => allocation.exchangeRound === issue.exchangeRound && allocation.status !== "shipped")
    .length;
  const blocker = roundBlocker(issue.items, active);
  if (blocker) return { error: t(me.locale, `round.blocked.${blocker}`) };

  const next = issue.exchangeRound + 1;
  const reopen = issue.status === "closed";

  try {
    await db.$transaction(async (tx) => {
      // Optimistični zaklep: dva hkratna klika ne smeta preskočiti dveh krogov,
      // urejanje postavk vmes pa ne sme ostati mimo posnetka.
      const moved = await tx.issue.updateMany({
        where: { id: issue.id, exchangeRound: issue.exchangeRound, updatedAt: issue.updatedAt },
        data: {
          exchangeRound: next,
          exchangeFault: fault,
          ...(reopen ? { status: "open", closedAt: null, archivedAt: null, waitingUntil: null, waitingReplySince: null } : {}),
        },
      });
      if (moved.count !== 1) throw new Error("stale");

      await tx.exchangeRound.create({
        data: {
          issueId: issue.id,
          number: next,
          fault,
          previous: JSON.stringify(snapshotLines(issue.items)),
          note,
          startedById: me.id,
        },
      });

      // Postavke posodobimo po id-ju: povezave zapisov v registru nanje ostanejo.
      for (const item of nextRoundItems(issue.items)) {
        await tx.issueItem.update({
          where: { id: item.id },
          // `name` je prisoten samo pri menjavi v drug izdelek: takrat postavka
          // z novim krogom postane tisti izdelek, ki ga ima stranka zdaj.
          data: {
            ...(item.name ? { name: item.name } : {}),
            variant: item.variant,
            replacementVariant: item.replacementVariant,
            replacementName: item.replacementName,
            priceDiffSettled: false,
            // Kar je stranka imela napačnega, je šlo s tem krogom; nov krog
            // začne s kosom, ki smo ga poslali kot nadomestek.
            wrongItemSent: false,
            orderedName: null,
            orderedVariant: null,
            resolution: item.resolution,
          },
        });
      }

      await tx.event.create({
        data: {
          issueId: issue.id,
          kind: "system",
          field: "exchange_round",
          fromValue: String(issue.exchangeRound),
          toValue: `${next}:${fault}`,
          body: [roundSummary(issue.items), note].filter(Boolean).join(" · ") || null,
          authorId: me.id,
        },
      });
      if (reopen) {
        await tx.event.create({
          data: { issueId: issue.id, kind: "status", fromValue: "closed", toValue: "open", authorId: me.id },
        });
      }
    });
  } catch (error) {
    console.error("Exchange round start failed", error);
    return { error: t(me.locale, "round.error.stale") };
  }

  revalidatePath(`/orders/${issue.key}`);
  revalidatePath("/orders");
  revalidatePath("/shipg");
  return { ok: true };
}

/**
 * Stranka je poslala še eno vračilo. Nastane nov zapis v registru — drug fizični
 * paket istega ticketa — izpolnjen s tem, kar smo ji poslali kot menjavo, a z
 * vsebino, kakor jo je človek potrdil. Paket se lahko takoj poveže s paketom v
 * ShipGermanu, ki ga v istem ticketu prej ni bilo mogoče pripeti.
 *
 * Kadar je menjava tekočega kroga odšla, vračilo začne nov krog (stranka vrača
 * nadomestek); sicer je to še en paket istega kroga.
 */
export async function recordAnotherReturn(_prev: RoundState, fd: FormData): Promise<RoundState> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) return { error: t(me.locale, "error.forbidden") };
  await ensureCatalog();
  const issueId = Number(fd.get("issueId"));
  if (!Number.isInteger(issueId) || issueId <= 0) return { error: t(me.locale, "error.invalidOrder") };

  const rows = parseReturnRows(fd.getAll("returnItem.name"), fd.getAll("returnItem.variant"), fd.getAll("returnItem.qty"));
  if (!rows) return { error: t(me.locale, "round.error.items") };

  const rawNote = fd.get("note");
  const note = typeof rawNote === "string" ? rawNote.trim().slice(0, 1000) || null : null;
  const rawTracking = fd.get("trackingNumber");
  const typedTracking = typeof rawTracking === "string" ? rawTracking.trim() : "";
  const tracking = typedTracking ? normalizeNumber(typedTracking) : null;
  if (typedTracking && !tracking) return { error: t(me.locale, "parcel.error.number") };
  const rawPackage = fd.get("shipgermanParcelId");
  const packageId = typeof rawPackage === "string" && rawPackage.trim() ? rawPackage.trim().slice(0, 100) : null;

  const issue = await db.issue.findUnique({
    where: { id: issueId },
    include: {
      items: { orderBy: { position: "asc" } },
      shipgAllocations: { select: { status: true, exchangeRound: true } },
      _count: { select: { parcels: true } },
    },
  });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };

  const active = issue.shipgAllocations
    .filter((allocation) => allocation.exchangeRound === issue.exchangeRound && allocation.status !== "shipped")
    .length;
  if (active > 0) return { error: t(me.locale, "round.blocked.active") };

  const cached = packageId
    ? await db.shipGermanCachedParcel.findUnique({ where: { id: packageId }, select: { active: true, trackingNumber: true } })
    : null;
  if (packageId) {
    const occupied = await db.shipgReturn.findUnique({ where: { shipgermanParcelId: packageId }, select: { id: true } });
    if (!cached?.active || occupied) return { error: t(me.locale, "round.error.package") };
  }
  if (tracking) {
    if (issue._count.parcels >= MAX_PARCELS) return { error: t(me.locale, "parcel.error.tooMany") };
    const existing = await db.parcel.findUnique({ where: { issueId_number: { issueId, number: tracking } }, select: { id: true } });
    if (existing) return { error: t(me.locale, "parcel.error.duplicate") };
  }

  const { newRound } = suggestedReturnRows(issue.items);
  const round = newRound ? issue.exchangeRound + 1 : issue.exchangeRound;
  const nextItems = newRound ? nextRoundItems(issue.items) : issue.items;

  // Vrstice paketa povežemo s postavkami naročila (tekočega kroga) po
  // kanoničnem ključu; vsako postavko porabimo enkrat.
  const free = issue.items.map((item) => {
    const next = nextItems.find((candidate) => candidate.id === item.id);
    return { id: item.id, key: canonicalKey(item.name, next?.variant ?? item.variant) };
  });
  const issueItemIds = rows.map((row) => {
    const key = canonicalKey(row.name, row.variant);
    const index = free.findIndex((item) => item.key === key);
    return index < 0 ? null : free.splice(index, 1)[0]!.id;
  });

  const parcelData = tracking ? await registerTracking(tracking) : null;
  const status = packageId ? "check" : parcelData ? "expected" : "check";
  const reopen = issue.status === "closed";
  const now = new Date();

  let createdParcel: Parcel | null = null;
  try {
    createdParcel = await db.$transaction(async (tx) => {
      if (newRound) {
        const moved = await tx.issue.updateMany({
          where: { id: issue.id, exchangeRound: issue.exchangeRound, updatedAt: issue.updatedAt },
          data: {
            exchangeRound: round,
            exchangeFault: "customer",
            ...(reopen ? { status: "open", closedAt: null, archivedAt: null, waitingUntil: null, waitingReplySince: null } : {}),
          },
        });
        if (moved.count !== 1) throw new Error("stale");
        await tx.exchangeRound.create({
          data: { issueId: issue.id, number: round, fault: "customer", previous: JSON.stringify(snapshotLines(issue.items)), note, startedById: me.id },
        });
        for (const item of nextRoundItems(issue.items)) {
          await tx.issueItem.update({
            where: { id: item.id },
            // `name` je prisoten samo pri menjavi v drug izdelek: takrat postavka
          // z novim krogom postane tisti izdelek, ki ga ima stranka zdaj.
          data: {
            ...(item.name ? { name: item.name } : {}),
            variant: item.variant,
            replacementVariant: item.replacementVariant,
            replacementName: item.replacementName,
            priceDiffSettled: false,
            // Kar je stranka imela napačnega, je šlo s tem krogom; nov krog
            // začne s kosom, ki smo ga poslali kot nadomestek.
            wrongItemSent: false,
            orderedName: null,
            orderedVariant: null,
            resolution: item.resolution,
          },
          });
        }
        await tx.event.create({
          data: {
            issueId: issue.id,
            kind: "system",
            field: "exchange_round",
            fromValue: String(issue.exchangeRound),
            toValue: `${round}:customer`,
            body: [roundSummary(issue.items), note].filter(Boolean).join(" · ") || null,
            authorId: me.id,
          },
        });
      } else if (reopen) {
        await tx.issue.update({
          where: { id: issue.id },
          data: { status: "open", closedAt: null, archivedAt: null, waitingUntil: null, waitingReplySince: null },
        });
      }
      if (reopen) {
        await tx.event.create({ data: { issueId: issue.id, kind: "status", fromValue: "closed", toValue: "open", authorId: me.id } });
      }

      const parcel = parcelData && tracking
        ? await tx.parcel.create({ data: { issueId: issue.id, number: tracking, direction: "return", exchangeRound: round, ...parcelData } })
        : null;
      if (parcel) {
        await tx.event.create({
          data: { issueId: issue.id, kind: "parcel", field: parcel.number, fromValue: null, toValue: parcel.state, authorId: me.id },
        });
      }

      await tx.shipgReturn.create({
        data: {
          issueId: issue.id,
          parcelId: parcel?.id ?? null,
          orderNumber: issue.orderNumber,
          customerName: issue.customerName,
          trackingNumber: parcel?.number ?? cached?.trackingNumber ?? null,
          exchangeRound: round,
          status,
          notes: note,
          receivedAt: status === "check" ? now : null,
          createdById: me.id,
          ...(packageId ? { shipgermanParcelId: packageId, shipgermanMatchSource: "manual", shipgermanLinkedAt: now, matchQuality: "high" } : {}),
          items: {
            create: rows.map((row, position) => ({
              issueItemId: issueItemIds[position],
              name: row.name,
              variant: row.variant,
              expectedQty: row.qty,
              receivedQty: 0,
              condition: "pending",
              position,
            })),
          },
        },
      });
      if (packageId) {
        // Povezan paket je identificiran; oznako neznane vsebine počistimo.
        await tx.shipGermanCachedParcel.updateMany({ where: { id: packageId }, data: { unidentifiable: false } });
      }
      await tx.event.create({
        data: {
          issueId: issue.id,
          kind: "system",
          field: "shipg",
          fromValue: null,
          toValue: status,
          body: packageId ? `ShipGerman ${packageId}` : parcel?.number ?? null,
          authorId: me.id,
        },
      });
      return parcel;
    });
  } catch (error) {
    console.error("Another return failed", error);
    // Enolični paket je medtem vzel drug zapis.
    const taken = typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
    return { error: t(me.locale, taken ? "round.error.package" : "round.error.stale") };
  }

  if (createdParcel?.state === "pending") {
    try {
      await syncParcels([createdParcel], { fresh: true });
    } catch (error) {
      console.error("Initial return tracking sync failed", error);
    }
  }

  revalidatePath(`/orders/${issue.key}`);
  revalidatePath("/orders");
  revalidatePath("/shipg");
  return { ok: true };
}

/** Registracija pri 17TRACK pred zapisom, kot pri vsaki novi pošiljki. */
async function registerTracking(number: string) {
  if (!tracker.configured()) {
    return { state: "untracked", carrier: null, manualReason: "not_configured", registeredAt: null };
  }
  try {
    const [result] = await tracker.register([number]);
    if (result?.ok) return { state: "pending", carrier: result.carrier, manualReason: null, registeredAt: new Date() };
    return { state: "untracked", carrier: null, manualReason: result?.error ?? "failed", registeredAt: null };
  } catch (error) {
    console.error("Return parcel registration failed", error);
    return { state: "untracked", carrier: null, manualReason: "failed", registeredAt: null };
  }
}
