"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";

import { requireUserStrict } from "../auth";
import { db } from "../db";
import { MAX_PARCELS } from "../domain";
import { t } from "../i18n/server";
import { ensureShipgReturnForParcel } from "../shipg";
import { normalizeNumber } from "../tracking/provider";
import { syncParcels } from "../tracking/sync";
import { tracker } from "../tracking/offline";

export type FormState = { error?: string; ok?: boolean };

const intId = (fd: FormData, name: string) => {
  const n = Number(fd.get(name));
  return Number.isInteger(n) && n > 0 ? n : null;
};

function refresh(key: string) {
  revalidatePath("/orders");
  revalidatePath(`/orders/${key}`);
}

/**
 * Doda pošiljko, nato pa pred odločitvijo o čakanju najprej prebere njeno
 * dejansko stanje. Samo povratna pošiljka v tranzitu sme zadržati naročilo;
 * že dostavljena, neznana ali nesledena številka ostane v aktivni obravnavi.
 */
export async function addParcel(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();

  const issueId = intId(fd, "issueId");
  if (!issueId) return { error: t(me.locale, "error.invalidOrder") };

  const raw = fd.get("number");
  const number = typeof raw === "string" ? normalizeNumber(raw) : null;
  if (!number) return { error: t(me.locale, "parcel.error.number") };

  const direction = fd.get("direction") === "replacement" ? "replacement" : "return";

  const issue = await db.issue.findUnique({
    where: { id: issueId },
    select: { id: true, key: true, status: true, assigneeId: true, exchangeRound: true, _count: { select: { parcels: true } } },
  });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };
  if (issue._count.parcels >= MAX_PARCELS) return { error: t(me.locale, "parcel.error.tooMany") };

  const existing = await db.parcel.findUnique({
    where: { issueId_number: { issueId, number } },
  });
  if (existing) return { error: t(me.locale, "parcel.error.duplicate") };

  // Registracija stane eno kvoto; naredimo jo pred zapisom, da ne ustvarimo
  // pošiljke, za katero se pozneje izkaže, da je kvota potekla.
  let state = "pending";
  let carrier: number | null = null;
  let manualReason: string | null = null;

  if (tracker.configured()) {
    try {
      const [result] = await tracker.register([number]);
      if (result?.ok) {
        carrier = result.carrier;
      } else {
        state = "untracked";
        manualReason = result?.error ?? "failed";
      }
    } catch (error) {
      console.error("Parcel registration failed", error);
      state = "untracked";
      manualReason = "failed";
    }
  } else {
    state = "untracked";
    manualReason = "not_configured";
  }

  const parcel = await db.parcel.create({
    data: {
      issueId,
      number,
      direction,
      exchangeRound: issue.exchangeRound,
      carrier,
      state,
      manualReason,
      registeredAt: state === "pending" ? new Date() : null,
    },
  });

  await db.event.create({
    data: {
      issueId,
      kind: "parcel",
      field: number,
      fromValue: null,
      toValue: state,
      authorId: me.id,
    },
  });

  // Prvo stanje poberemo pred kakršnimkoli holdom — številka je lahko že
  // dostavljena. syncParcels nato centralno odloči, ali je potreben hold.
  if (state === "pending") {
    try {
      await syncParcels([parcel], { fresh: true });
    } catch (error) {
      console.error("Initial parcel sync failed", error);
    }
  }

  refresh(issue.key);
  return { ok: true };
}

/**
 * Ročno potrdi, da je povratni paket pri nas, brez tracking številke. Ustvari
 * pošiljko že v stanju "arrived" in sproži isto ShipG logiko kot markParcelArrived
 * (vrsta za pregled, sprostitev čakanja). Za stranke, ki vrnejo brez sledilke.
 */
export async function markReturnHere(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const issueId = intId(fd, "issueId");
  if (!issueId) return { error: t(me.locale, "error.invalidOrder") };

  const issue = await db.issue.findUnique({
    where: { id: issueId },
    select: { id: true, key: true, status: true, exchangeRound: true, _count: { select: { parcels: true } } },
  });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };
  if (issue._count.parcels >= MAX_PARCELS) return { error: t(me.locale, "parcel.error.tooMany") };

  const now = new Date();
  // Številke ne prikazujemo (vrstica pokaže oznako "brez sledenja"); "—" je le
  // notranji, enolični zaznamek znotraj naročila.
  let parcel;
  for (let attempt = 0; ; attempt++) {
    try {
      parcel = await db.parcel.create({
        data: {
          issueId,
          number: attempt === 0 ? "—" : `— ${attempt + 1}`,
          direction: "return",
          exchangeRound: issue.exchangeRound,
          state: "arrived",
          manualReason: "here",
          registeredAt: now,
          lastEventAt: now,
          checkedAt: now,
        },
      });
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 10) continue;
      throw error;
    }
  }

  await db.event.create({
    data: { issueId, kind: "parcel", field: parcel.number, fromValue: null, toValue: "arrived", authorId: me.id },
  });

  await ensureShipgReturnForParcel(parcel.id);

  if (issue.status === "waiting") {
    const holding = await db.parcel.count({ where: { issueId, direction: "return", state: "transit" } });
    if (holding === 0) {
      await db.issue.update({ where: { id: issueId }, data: { status: "open", waitingUntil: null } });
    }
  }

  refresh(issue.key);
  return { ok: true };
}

export async function removeParcel(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const id = intId(fd, "parcelId");
  if (!id) return { error: t(me.locale, "error.invalidOrder") };

  const parcel = await db.parcel.findUnique({
    where: { id },
    include: { issue: { select: { key: true } } },
  });
  if (!parcel) return { ok: true };

  await db.parcel.delete({ where: { id } });
  await db.event.create({
    data: {
      issueId: parcel.issueId,
      kind: "parcel",
      field: parcel.number,
      fromValue: parcel.state,
      toValue: "removed",
      authorId: me.id,
    },
  });

  refresh(parcel.issue.key);
  return { ok: true };
}

/** Ročna osvežitev — za nestrpne in za primere, ko webhook ni prišel. */
export async function refreshParcel(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const id = intId(fd, "parcelId");
  if (!id) return { error: t(me.locale, "error.invalidOrder") };

  const parcel = await db.parcel.findUnique({
    where: { id },
    include: { issue: { select: { key: true } } },
  });
  if (!parcel) return { error: t(me.locale, "error.orderMissing") };

  const outcome = await syncParcels([parcel], { fresh: true });
  refresh(parcel.issue.key);

  return outcome.failed > 0 ? { error: t(me.locale, "parcel.error.unreachable") } : { ok: true };
}

/**
 * Ročna potrditev, da je paket pri nas. Nujna varovalka: brez nje bi bila
 * naročila z nesledeno pošiljko odvisna od ponudnika, ki jih ne pozna.
 */
export async function markParcelArrived(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const id = intId(fd, "parcelId");
  if (!id) return { error: t(me.locale, "error.invalidOrder") };

  const parcel = await db.parcel.findUnique({
    where: { id },
    include: { issue: { select: { id: true, key: true, status: true } } },
  });
  if (!parcel) return { error: t(me.locale, "error.orderMissing") };
  if (parcel.state === "arrived") return { ok: true };

  const now = new Date();
  await db.parcel.update({
    where: { id },
    data: { state: "arrived", manualReason: null, lastEventAt: now, checkedAt: now },
  });

  await db.event.create({
    data: {
      issueId: parcel.issueId,
      kind: "parcel",
      field: parcel.number,
      fromValue: parcel.state,
      toValue: "arrived",
      authorId: me.id,
    },
  });

  if (parcel.direction === "return") {
    await ensureShipgReturnForParcel(parcel.id);
  }

  const holding = await db.parcel.count({
    where: {
      issueId: parcel.issueId,
      direction: "return",
      state: "transit",
    },
  });
  if (holding === 0 && parcel.issue.status === "waiting") {
    await db.issue.update({
      where: { id: parcel.issueId },
      data: { status: "open", waitingUntil: null },
    });
  }

  refresh(parcel.issue.key);
  return { ok: true };
}
