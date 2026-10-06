import "server-only";

import { Prisma } from "@prisma/client";

import { db } from "./db";
import { expectedReturnLines } from "./exchange-round";

/**
 * Dostavljeno povratno pošiljko enkrat uvrsti v čakalno vrsto ShipG.
 * Parcel je enolična povezava, zato hkratna webhook in cron zahteva ne moreta
 * ustvariti dveh skladiščnih zapisov.
 *
 * Kaj register pričakuje v paketu, pove krog menjave, v katerem je pošiljka
 * nastala — pri drugi menjavi stranka vrača nadomestek, ne prvotnega kosa.
 */
export async function ensureShipgReturnForParcel(parcelId: number): Promise<number | null> {
  const parcel = await db.parcel.findUnique({
    where: { id: parcelId },
    include: {
      issue: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          exchangeRound: true,
          items: { orderBy: { position: "asc" } },
          exchangeRounds: { select: { number: true, previous: true } },
        },
      },
    },
  });

  if (!parcel || parcel.direction !== "return" || parcel.state !== "arrived") return null;

  const existing = await db.shipgReturn.findUnique({ where: { parcelId } });
  if (existing) {
    if (existing.status === "expected") {
      await db.$transaction(async (tx) => {
        await tx.shipgReturn.update({
          where: { id: existing.id },
          data: { status: "check", receivedAt: existing.receivedAt ?? parcel.lastEventAt ?? new Date() },
        });
        await tx.event.create({
          data: {
            issueId: parcel.issue.id,
            kind: "system",
            field: "shipg",
            fromValue: "expected",
            toValue: "check",
            body: parcel.number,
            authorId: null,
          },
        });
      });
    }
    return existing.id;
  }

  try {
    const expected = expectedReturnLines(
      parcel.exchangeRound,
      parcel.issue.exchangeRound,
      parcel.issue.items,
      parcel.issue.exchangeRounds,
    );
    const created = await db.$transaction(async (tx) => {
      const hasExpectedItems = expected.length > 0;
      const record = await tx.shipgReturn.create({
        data: {
          issueId: parcel.issue.id,
          parcelId: parcel.id,
          orderNumber: parcel.issue.orderNumber,
          customerName: parcel.issue.customerName,
          trackingNumber: parcel.number,
          exchangeRound: parcel.exchangeRound,
          status: hasExpectedItems ? "check" : "exception",
          receivedAt: parcel.lastEventAt ?? new Date(),
          items: {
            create: expected.map((item, position) => ({
              issueItemId: item.issueItemId,
              name: item.name,
              variant: item.variant,
              expectedQty: item.qty,
              receivedQty: 0,
              condition: "pending",
              position,
            })),
          },
        },
      });

      await tx.event.create({
        data: {
          issueId: parcel.issue.id,
          kind: "system",
          field: "shipg",
          fromValue: null,
          toValue: hasExpectedItems ? "check" : "exception",
          body: parcel.number,
          authorId: null,
        },
      });

      return record;
    });
    return created.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return (await db.shipgReturn.findUnique({ where: { parcelId } }))?.id ?? null;
    }
    throw error;
  }
}
