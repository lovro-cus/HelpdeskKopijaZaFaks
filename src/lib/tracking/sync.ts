import "server-only";

import type { Parcel } from "@prisma/client";

import { db } from "../db";
import { issueStatusForParcel, parcelHolds, parcelOutcome, parcelTimeGuard, type ParcelState } from "../domain";
import { notify } from "../notifications";
import { ensureShipgReturnForParcel } from "../shipg";
import { tracker } from "./offline";
import type { ParcelSnapshot } from "./provider";

/**
 * Uskladi stanje pošiljk s ponudnikom in po potrebi zbudi naročila.
 *
 * Kliče jo webhook (za eno številko) in cron (za vse zastarele). Vedno gre
 * skozi overjeni API — vsebini webhooka ne zaupamo, iz nje vzamemo samo
 * namig, katero številko je vredno pogledati.
 */

export type SyncOutcome = {
  checked: number;
  woken: number;
  manual: number;
  failed: number;
};

const EMPTY: SyncOutcome = { checked: 0, woken: 0, manual: 0, failed: 0 };

export async function syncParcels(
  parcels: Parcel[],
  options: { fresh?: boolean } = {},
): Promise<SyncOutcome> {
  if (parcels.length === 0) return EMPTY;

  // Brez ponudnika ne obupamo: časovna varovala morajo teči tudi takrat, ko
  // ključ poteče ali kvota poide. Sicer bi naročila obtičala na čakanju prav
  // v trenutku, ko sledenje odpove — torej takrat, ko so varovala najbolj
  // potrebna.
  let snapshots: ParcelSnapshot[] = [];
  let providerFailed = !tracker.configured();

  if (!providerFailed) {
    try {
      const unique = new Map(
        parcels.map((parcel) => [parcel.number.toUpperCase(), { number: parcel.number, carrier: parcel.carrier }]),
      );
      const targets = [...unique.values()];
      snapshots = options.fresh
        ? await tracker.fetchFresh(targets)
        : await tracker.fetch(targets);
    } catch (error) {
      console.error(options.fresh ? "Real-time tracking fetch failed" : "Tracking fetch failed", error);
      if (options.fresh) {
        try {
          const unique = new Map(
            parcels.map((parcel) => [parcel.number.toUpperCase(), { number: parcel.number, carrier: parcel.carrier }]),
          );
          snapshots = await tracker.fetch([...unique.values()]);
        } catch (fallbackError) {
          console.error("Tracking fallback fetch failed", fallbackError);
          providerFailed = true;
        }
      } else {
        providerFailed = true;
      }
    }
  }

  const byNumber = new Map(snapshots.map((s) => [s.number.toUpperCase(), s]));
  const result: SyncOutcome = { ...EMPTY };

  for (const parcel of parcels) {
    const snapshot = byNumber.get(parcel.number.toUpperCase());
    const applied = await applyToParcel(parcel, snapshot ?? null);

    result.checked++;
    if (applied === "arrived") result.woken++;
    if (applied === "manual") result.manual++;
    if (providerFailed || !snapshot) result.failed++;
  }

  return result;
}

/** Vrne novo stanje, če se je spremenilo. */
async function applyToParcel(
  parcel: Parcel,
  snapshot: ParcelSnapshot | null,
): Promise<ParcelState | null> {
  const now = new Date();

  // Ponudnik lahko občasno vrne starejši predpomnjeni dogodek. Ura zadnjega
  // premika se ne sme zavrteti nazaj, saj bi paket sicer prezgodaj označili kot
  // zastal.
  const snapshotHasLatestEvent = Boolean(
    snapshot?.lastEventAt &&
      (!parcel.lastEventAt || snapshot.lastEventAt.getTime() >= parcel.lastEventAt.getTime()),
  );
  const lastEventAt = snapshotHasLatestEvent ? snapshot!.lastEventAt : parcel.lastEventAt;
  const lastEventText = snapshotHasLatestEvent
    ? snapshot!.lastEventText ?? parcel.lastEventText
    : parcel.lastEventText;

  let state: ParcelState = parcel.state as ParcelState;
  let reason: string | null = parcel.manualReason;

  if (snapshot) {
    const outcome = parcelOutcome(snapshot.providerStatus);
    state = outcome.state;
    reason = outcome.reason ?? null;
  }

  // Časovna varovala imajo zadnjo besedo: prevoznik lahko trdi "v tranzitu"
  // še tedne po tem, ko je paket dejansko izginil.
  const guard = parcelTimeGuard(
    {
      state,
      registeredAt: parcel.registeredAt,
      lastEventAt,
      createdAt: parcel.createdAt,
    },
    now,
  );
  if (guard) {
    state = guard.state;
    reason = guard.reason;
  }

  const changed = state !== parcel.state;

  const data = {
    state,
    manualReason: state === "manual" ? reason : null,
    providerStatus: snapshot?.providerStatus ?? parcel.providerStatus,
    carrier: snapshot?.carrier ?? parcel.carrier,
    carrierName: snapshot?.carrierName ?? parcel.carrierName,
    lastEventAt,
    lastEventText,
    checkedAt: now,
  };

  if (changed) {
    // Webhook in cron lahko prispeta istočasno. Samo prvi sme zapisati prehod,
    // timeline dogodek in obvestilo.
    const won = await db.parcel.updateMany({
      where: { id: parcel.id, state: parcel.state },
      data,
    });
    if (won.count !== 1) return null;
  } else {
    await db.parcel.update({ where: { id: parcel.id }, data });
  }

  if (!changed) return null;

  await recordAndReconcile(parcel, state, reason, snapshot);
  if (state === "arrived" && parcel.direction === "return") {
    await ensureShipgReturnForParcel(parcel.id);
  }
  return state;
}

/**
 * Zapiše spremembo v nit in stanje naročila uskladi s pošiljkami.
 * Naročila nikoli ne zapremo samodejno; refund ostane človeška odločitev.
 */
async function recordAndReconcile(
  parcel: Parcel,
  state: ParcelState,
  reason: string | null,
  snapshot: ParcelSnapshot | null,
) {
  const issue = await db.issue.findUnique({
    where: { id: parcel.issueId },
    select: {
      id: true,
      key: true,
      orderNumber: true,
      status: true,
      assigneeId: true,
      parcels: { select: { id: true, state: true, direction: true } },
    },
  });
  if (!issue) return;

  await db.event.create({
    data: {
      issueId: issue.id,
      kind: "parcel",
      field: parcel.number,
      fromValue: parcel.state,
      toValue: reason ? `${state}:${reason}` : state,
      // Besedilo prevoznika pustimo, kakor je prišlo — je edini vir resnice
      // o tem, kaj se je zgodilo, in ga ne prevajamo.
      body: snapshot?.lastEventText ?? null,
      authorId: null,
    },
  });

  // Naročilo drži samo paket, ki prihaja k nam; zamenjava, ki potuje k
  // stranki, se spremlja, a zaključka ne blokira.
  const stillWaiting = issue.parcels.some(
    (p) => p.id !== parcel.id && p.direction === "return" && parcelHolds(p.state),
  );
  const isReturn = parcel.direction === "return";
  const nextIssueStatus = issueStatusForParcel({
    issueStatus: issue.status,
    direction: parcel.direction,
    parcelState: state,
    otherReturnHolds: stillWaiting,
  });

  if (nextIssueStatus) {
    await db.issue.update({
      where: { id: issue.id },
      data: { status: nextIssueStatus, waitingUntil: null },
    });
    await db.event.create({
      data: {
        issueId: issue.id,
        kind: "status",
        field: reason === "stale" ? "tracking_stale" : "tracking",
        fromValue: issue.status,
        toValue: nextIssueStatus,
        authorId: null,
      },
    });
  }

  const needsAttention = state === "manual" || (isReturn && state === "arrived");
  if (needsAttention && issue.assigneeId) {
    await notify({
      kind: "parcel",
      recipientId: issue.assigneeId,
      issueId: issue.id,
      issueKey: issue.key,
      orderNumber: issue.orderNumber,
      actorName: parcel.carrierName ?? "17TRACK",
      preview: snapshot?.lastEventText ?? null,
      parcelReason: reason,
      parcelNumber: parcel.number,
    });
  }
}

/** Pošiljke, ki jih je vredno znova vprašati. */
export async function staleParcels(olderThanHours: number, limit = 200) {
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000);
  return db.parcel.findMany({
    where: {
      state: { in: ["pending", "transit"] },
      OR: [{ checkedAt: null }, { checkedAt: { lt: cutoff } }],
    },
    orderBy: { checkedAt: "asc" },
    take: limit,
  });
}
