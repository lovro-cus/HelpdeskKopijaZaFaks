"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserStrict } from "../auth";
import { db } from "../db";
import { canAccessShipg, MATCH_QUALITIES, type MatchQuality } from "../domain";
import { expectedReturnLines } from "../exchange-round";
import { t } from "../i18n/server";

async function requireShipg() {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  return me;
}

function positiveId(value: FormDataEntryValue | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parcelId(fd: FormData) {
  const value = fd.get("shipgermanParcelId");
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

function returnPath(fd: FormData) {
  const value = fd.get("returnTo");
  if (typeof value !== "string" || value.length > 300) return "/shipg?view=stock";
  try {
    const url = new URL(value, "http://local");
    return url.origin === "http://local" && url.pathname === "/shipg"
      ? `${url.pathname}${url.search}`
      : "/shipg?view=stock";
  } catch {
    return "/shipg?view=stock";
  }
}

function back(fd: FormData, kind: "saved" | "error", result: string): never {
  revalidatePath("/shipg");
  const url = new URL(returnPath(fd), "http://local");
  url.searchParams.delete("saved");
  url.searchParams.delete("error");
  url.searchParams.set(kind, result);
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

/** Gotovost, izbrana ob povezavi. Privzeto najvišja: ročna povezava je človekova
 *  odločitev, ne ugibanje — kdor dvomi, jo ob povezavi zniža. */
function linkQuality(fd: FormData): MatchQuality {
  const raw = fd.get("matchQuality");
  return typeof raw === "string" && MATCH_QUALITIES.includes(raw as MatchQuality) ? (raw as MatchQuality) : "high";
}

type LinkResult = "linked" | "linkInvalid" | "linkStale" | "linkLocked";

/** Poveže zapis registra s fizičnim paketom. Skupno registru in ticketu. */
async function linkParcelToRecord(me: { id: string }, shipgReturnId: number | null, externalId: string, quality: MatchQuality): Promise<{ result: LinkResult; issueKey: string | null }> {
  if (!shipgReturnId || !externalId) return { result: "linkInvalid", issueKey: null };

  const [record, occupied, live] = await Promise.all([
    db.shipgReturn.findUnique({ where: { id: shipgReturnId }, include: { allocation: true, issue: { select: { key: true } } } }),
    db.shipgReturn.findUnique({ where: { shipgermanParcelId: externalId } }),
    db.shipGermanCachedParcel.findUnique({ where: { id: externalId }, select: { active: true } }),
  ]);
  const issueKey = record?.issue?.key ?? null;
  if (!record || occupied || record.shipgermanParcelId || !live?.active) return { result: "linkStale", issueKey };
  if (record.allocation) return { result: "linkLocked", issueKey };

  try {
    await db.$transaction(async (tx) => {
      const linked = await tx.shipgReturn.updateMany({
        where: { id: record.id, shipgermanParcelId: null },
        data: {
          shipgermanParcelId: externalId,
          shipgermanMatchSource: "manual",
          shipgermanLinkedAt: new Date(),
          matchQuality: quality,
        },
      });
      if (linked.count !== 1) throw new Error("stale");
      // Povezan paket je identificiran, zato morebitno oznako neznane vsebine počistimo.
      await tx.shipGermanCachedParcel.updateMany({ where: { id: externalId }, data: { unidentifiable: false } });
      if (record.issueId) await tx.event.create({
        data: { issueId: record.issueId, kind: "system", field: "shipgerman_link", fromValue: null, toValue: externalId, authorId: me.id },
      });
    });
  } catch (error) {
    console.error("Manual ShipGerman link failed", error);
    return { result: "linkStale", issueKey };
  }
  return { result: "linked", issueKey };
}

export async function linkShipGermanParcel(fd: FormData): Promise<void> {
  const me = await requireShipg();
  const { result } = await linkParcelToRecord(me, positiveId(fd.get("shipgReturnId")), parcelId(fd), linkQuality(fd));
  back(fd, result === "linked" ? "saved" : "error", result);
}

export type IssueLinkState = { ok?: boolean; error?: string };

/** Povezava paketa neposredno iz ticketa — brez obiska registra. */
export async function linkShipGermanParcelFromIssue(_previous: IssueLinkState, fd: FormData): Promise<IssueLinkState> {
  const me = await requireShipg();
  const issueId = positiveId(fd.get("issueId"));
  // "0": vračilo še ni vpisano — paket je že v ShipGermanu, zato ga vpišemo
  // zdaj iz artiklov, ki se vračajo, in takoj povežemo.
  if (fd.get("shipgReturnId") === "0" && issueId) return linkNewReturn(me, issueId, parcelId(fd), linkQuality(fd));
  const shipgReturnId = positiveId(fd.get("shipgReturnId"));
  // Zapis mora pripadati temu ticketu in biti še odprt (Za preverit / pričakovan / odstopanje).
  const record = shipgReturnId
    ? await db.shipgReturn.findUnique({ where: { id: shipgReturnId }, select: { issueId: true, status: true } })
    : null;
  if (!record || !issueId || record.issueId !== issueId || !["check", "expected", "exception"].includes(record.status)) {
    return { error: t(me.locale, "shipg.feedback.linkStale") };
  }
  const { result, issueKey } = await linkParcelToRecord(me, shipgReturnId, parcelId(fd), linkQuality(fd));
  revalidatePath("/shipg");
  if (issueKey) revalidatePath(`/orders/${issueKey}`);
  return result === "linked" ? { ok: true } : { error: t(me.locale, `shipg.feedback.${result}`) };
}

/** Vpiše vračilo ticketa (kot "Paket je pri nas") in ga poveže s paketom. */
async function linkNewReturn(
  me: { id: string; locale: Parameters<typeof t>[0] },
  issueId: number,
  externalId: string,
  quality: MatchQuality,
): Promise<IssueLinkState> {
  const [issue, parcel, occupied, open] = await Promise.all([
    db.issue.findUnique({
      where: { id: issueId },
      select: {
        id: true, key: true, orderNumber: true, customerName: true, exchangeRound: true,
        items: { select: { id: true, name: true, variant: true, replacementVariant: true, replacementName: true, qty: true, resolution: true } },
      },
    }),
    externalId ? db.shipGermanCachedParcel.findUnique({ where: { id: externalId }, select: { active: true, trackingNumber: true } }) : null,
    externalId ? db.shipgReturn.findUnique({ where: { shipgermanParcelId: externalId }, select: { id: true } }) : null,
    db.issue.findUnique({ where: { id: issueId }, select: { exchangeRound: true } }).then((row) =>
      row ? db.shipgReturn.count({ where: { issueId, exchangeRound: row.exchangeRound } }) : 0,
    ),
  ]);
  // Vračilo tega kroga že obstaja (drug zavihek ali že povezano): drug paket
  // istega kroga gre skozi "Še eno vračilo", ne kot novo vračilo.
  if (!issue || !parcel?.active || occupied || open > 0) return { error: t(me.locale, "shipg.feedback.linkStale") };
  const lines = expectedReturnLines(issue.exchangeRound, issue.exchangeRound, issue.items, []);
  if (lines.length === 0) return { error: t(me.locale, "issueLink.needsReturnItem") };

  const now = new Date();
  try {
    await db.$transaction(async (tx) => {
      await tx.shipgReturn.create({
        data: {
          issueId: issue.id,
          orderNumber: issue.orderNumber,
          customerName: issue.customerName,
          trackingNumber: parcel.trackingNumber,
          exchangeRound: issue.exchangeRound,
          status: "check",
          receivedAt: now,
          createdById: me.id,
          shipgermanParcelId: externalId,
          shipgermanMatchSource: "manual",
          shipgermanLinkedAt: now,
          matchQuality: quality,
          items: {
            create: lines.map((line, position) => ({
              issueItemId: line.issueItemId,
              name: line.name,
              variant: line.variant,
              expectedQty: line.qty,
              receivedQty: 0,
              condition: "pending",
              position,
            })),
          },
        },
      });
      await tx.shipGermanCachedParcel.updateMany({ where: { id: externalId }, data: { unidentifiable: false } });
      await tx.event.create({ data: { issueId: issue.id, kind: "system", field: "shipg", fromValue: null, toValue: "check", body: `ShipGerman ${externalId}`, authorId: me.id } });
      await tx.event.create({ data: { issueId: issue.id, kind: "system", field: "shipgerman_link", fromValue: null, toValue: externalId, authorId: me.id } });
    });
  } catch (error) {
    console.error("ShipGerman link with new return failed", error);
    return { error: t(me.locale, "shipg.feedback.linkStale") };
  }
  revalidatePath("/shipg");
  revalidatePath(`/orders/${issue.key}`);
  return { ok: true };
}

export async function unlinkShipGermanParcel(fd: FormData): Promise<void> {
  const me = await requireShipg();
  const externalId = parcelId(fd);
  if (!externalId) back(fd, "error", "linkInvalid");
  const record = await db.shipgReturn.findUnique({
    where: { shipgermanParcelId: externalId },
    include: { allocation: true },
  });
  if (!record) back(fd, "error", "linkStale");
  if (record.allocation) back(fd, "error", "linkLocked");

  await db.$transaction(async (tx) => {
    const unlinked = await tx.shipgReturn.updateMany({
      where: { id: record.id, shipgermanParcelId: externalId },
      data: { shipgermanParcelId: null, shipgermanMatchSource: null, shipgermanLinkedAt: null },
    });
    if (unlinked.count !== 1) throw new Error("stale");
    if (record.issueId) await tx.event.create({
      data: { issueId: record.issueId, kind: "system", field: "shipgerman_link", fromValue: externalId, toValue: null, authorId: me.id },
    });
  }).catch((error) => {
    console.error("ShipGerman unlink failed", error);
    back(fd, "error", "linkStale");
  });
  back(fd, "saved", "unlinked");
}

/**
 * Spremeni gotovost ujemanja med naročilom in fizičnim paketom. Znižanje je
 * dovoljeno tudi pri rezerviranem paketu — dvom se najpogosteje pojavi prav
 * takrat, tik pred odpremo, in takrat mora ustaviti odpremo, ne obratno.
 */
export async function setShipgMatchQuality(fd: FormData): Promise<void> {
  const me = await requireShipg();
  const shipgReturnId = positiveId(fd.get("shipgReturnId"));
  const raw = fd.get("matchQuality");
  const quality = typeof raw === "string" && MATCH_QUALITIES.includes(raw as MatchQuality) ? raw : null;
  if (!shipgReturnId || !quality) back(fd, "error", "qualityInvalid");

  const record = await db.shipgReturn.findUnique({
    where: { id: shipgReturnId },
    select: { id: true, issueId: true, matchQuality: true, shipgermanParcelId: true },
  });
  if (!record) back(fd, "error", "qualityInvalid");
  if (record.matchQuality === quality) back(fd, "saved", "matchQuality");

  await db.$transaction(async (tx) => {
    await tx.shipgReturn.update({ where: { id: record.id }, data: { matchQuality: quality } });
    if (record.issueId) await tx.event.create({
      data: {
        issueId: record.issueId,
        kind: "system",
        field: "match_quality",
        fromValue: record.matchQuality,
        toValue: quality,
        body: record.shipgermanParcelId ? `ShipGerman ${record.shipgermanParcelId}` : null,
        authorId: me.id,
      },
    });
  });
  back(fd, "saved", "matchQuality");
}
