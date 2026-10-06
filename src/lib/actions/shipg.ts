"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { requireUserStrict, type SessionUser } from "../auth";
import { canonicalKey } from "../catalog-canonical";
import { ensureCatalog } from "../catalog-server";
import { db } from "../db";
import { canAccessShipg, MATCH_QUALITIES, MAX_PARCELS, SHIPG_ITEM_CONDITIONS, shipgStatusView, type MatchQuality } from "../domain";
import { t } from "../i18n/server";
import { alertExchangeStockMatches } from "../exchange-stock";
import { checkAllRareMatches } from "../rare-match-alert";
import { normalizeNumber } from "../tracking/provider";
import { syncParcels } from "../tracking/sync";
import { tracker } from "../tracking/offline";

export type ShipgFormState = { error?: string };

const text = (fd: FormData, name: string, max = 300) => {
  const value = fd.get(name);
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, max);
  return clean || null;
};

const positiveId = (value: FormDataEntryValue | null) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const optionalQty = (value: FormDataEntryValue | null, fallback = 1) => {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 9999) : fallback;
};

const requiredQty = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 9999 ? parsed : null;
};

async function requireShipgStrict(): Promise<SessionUser> {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error(t(me.locale, "error.forbidden"));
  // Združevanje in povezovanje zaloge ujemata kose med trgi (kanonični ključ).
  await ensureCatalog();
  return me;
}

function refresh(issueKey?: string | null) {
  revalidatePath("/shipg");
  if (issueKey) revalidatePath(`/orders/${issueKey}`);
}

/** Nov paket v zalogi: redka ujemanja z odprtimi naročili javimo po mailu takoj,
 *  ne šele ob naslednjem tiku urnika. Teče po odgovoru, da preusmeritev ne čaka. */
function checkRareMatchesAfterStocking() {
  after(async () => {
    try {
      await checkAllRareMatches();
    } catch (error) {
      console.error("[RareMatch] Check after stocking crashed", error);
    }
    // Isti paket morda čaka menjava (tudi naročena pri dobavitelju).
    try {
      await alertExchangeStockMatches();
    } catch (error) {
      console.error("[ExchangeStock] Check after stocking crashed", error);
    }
  });
}

export async function createShipgReturn(
  _previous: ShipgFormState,
  fd: FormData,
): Promise<ShipgFormState> {
  const me = await requireShipgStrict();
  const issueId = positiveId(fd.get("issueId"));
  const selectedParcelId = positiveId(fd.get("parcelId"));
  const submittedOrder = text(fd, "orderNumber", 40)?.replace(/^#/, "").trim();

  const issue = issueId
    ? await db.issue.findUnique({
        where: { id: issueId },
        include: {
          items: { orderBy: { position: "asc" } },
          parcels: { where: { direction: "return" }, orderBy: { createdAt: "desc" } },
        },
      })
    : null;
  if (issueId && !issue) return { error: t(me.locale, "error.orderMissing") };

  // Pri povezanem zapisu je helpdesk naročilo edini vir identitete. Vrednost
  // iz obrazca se uporablja samo za resnično ročni, nepovezan vnos.
  const orderNumber = issue?.orderNumber ?? submittedOrder;
  if (!orderNumber) return { error: t(me.locale, "shipg.error.order") };

  let parcel = selectedParcelId && issue
    ? issue.parcels.find((candidate) => candidate.id === selectedParcelId) ?? null
    : null;
  if (selectedParcelId && !parcel) return { error: t(me.locale, "shipg.error.parcel") };

  const rawTracking = text(fd, "trackingNumber", 80);
  const normalizedTracking = rawTracking ? normalizeNumber(rawTracking) : null;
  if (rawTracking && !normalizedTracking) return { error: t(me.locale, "parcel.error.number") };
  if (issue && normalizedTracking) {
    parcel = issue.parcels.find((candidate) => candidate.number === normalizedTracking) ?? null;
  }

  let recoveryRecordId: number | null = null;
  if (parcel) {
    const duplicate = await db.shipgReturn.findUnique({
      where: { parcelId: parcel.id },
      include: { items: { select: { id: true } } },
    });
    if (duplicate?.items.length) return { error: t(me.locale, "shipg.error.duplicate") };
    recoveryRecordId = duplicate?.id ?? null;
  }

  const selectedIds = new Set(
    fd.getAll("issueItemId").map(positiveId).filter((id): id is number => id !== null),
  );
  const linkedItems = issue?.items.filter((item) => selectedIds.has(item.id)) ?? [];
  const manualName = text(fd, "manualItemName", 200);
  const manualVariant = text(fd, "manualItemVariant", 120);
  const manualQty = optionalQty(fd.get("manualItemQty"));
  if (linkedItems.length === 0 && !manualName) {
    return { error: t(me.locale, "shipg.error.items") };
  }

  // Neprepoznan paket se vpisuje takrat, ko je fizično že v ShipG. Čakalna
  // vrsta je dovoljena samo ob povezani pošiljki, ki jo lahko dejansko sledimo.
  const requestedStatus = !issue || fd.get("status") === "check" ? "check" : "expected";
  if (requestedStatus === "expected" && !parcel && !normalizedTracking) {
    return { error: t(me.locale, "shipg.error.trackingRequired") };
  }

  let parcelToCreate: {
    number: string;
    state: string;
    carrier: number | null;
    manualReason: string | null;
    registeredAt: Date | null;
  } | null = null;

  if (!parcel && issue && normalizedTracking) {
    if (issue.parcels.length >= MAX_PARCELS) return { error: t(me.locale, "parcel.error.tooMany") };
    let state = "pending";
    let carrier: number | null = null;
    let manualReason: string | null = null;

    if (tracker.configured()) {
      try {
        const [result] = await tracker.register([normalizedTracking]);
        if (result?.ok) carrier = result.carrier;
        else { state = "untracked"; manualReason = result?.error ?? "failed"; }
      } catch (error) {
        console.error("ShipG parcel registration failed", error);
        state = "untracked";
        manualReason = "failed";
      }
    } else {
      state = "untracked";
      manualReason = "not_configured";
    }

    parcelToCreate = {
      number: normalizedTracking,
      state,
      carrier,
      manualReason,
      registeredAt: state === "pending" ? new Date() : null,
    };
  }

  // Ko je paket povezan s trackingom, fazo vedno določi njegovo dejansko
  // stanje. Tako nova številka ne more podedovati "že v ShipG" od drugega,
  // dostavljenega paketa, ki je bil prej izbran v obrazcu.
  const trackedState = parcel?.state ?? parcelToCreate?.state ?? null;
  const initialStatus = trackedState ? (trackedState === "arrived" ? "check" : "expected") : requestedStatus;
  const created = await db.$transaction(async (tx) => {
    const createdParcel = parcelToCreate && issue
      ? await tx.parcel.create({
          data: { issueId: issue.id, direction: "return", exchangeRound: issue.exchangeRound, ...parcelToCreate },
        })
      : null;
    const linkedParcel = parcel ?? createdParcel;
    const trackingNumber = linkedParcel?.number ?? normalizedTracking;

    const recordData = {
        issueId: issue?.id ?? null,
        parcelId: linkedParcel?.id ?? null,
        orderNumber,
        customerName: text(fd, "customerName", 120) ?? issue?.customerName ?? null,
        trackingNumber,
        exchangeRound: linkedParcel?.exchangeRound ?? issue?.exchangeRound ?? 1,
        status: initialStatus,
        notes: text(fd, "notes", 1000),
        receivedAt: initialStatus === "check" ? new Date() : null,
        createdById: me.id,
        items: {
          create: [
            ...linkedItems.map((item, position) => ({
              issueItemId: item.id,
              name: item.name,
              variant: item.variant,
              expectedQty: item.qty,
              receivedQty: 0,
              condition: "pending",
              position,
            })),
            ...(manualName ? [{
              name: manualName,
              variant: manualVariant,
              expectedQty: manualQty,
              receivedQty: 0,
              condition: "pending",
              position: linkedItems.length,
            }] : []),
          ],
        },
      };
    const record = recoveryRecordId
      ? await tx.shipgReturn.update({
          where: { id: recoveryRecordId },
          data: {
            customerName: recordData.customerName,
            trackingNumber: recordData.trackingNumber,
            status: initialStatus,
            notes: recordData.notes,
            receivedAt: initialStatus === "check" ? new Date() : null,
            createdById: me.id,
            items: recordData.items,
          },
        })
      : await tx.shipgReturn.create({ data: recordData });

    if (issue) {
      if (createdParcel) {
        await tx.event.create({
          data: {
            issueId: issue.id,
            kind: "parcel",
            field: createdParcel.number,
            fromValue: null,
            toValue: createdParcel.state,
            authorId: me.id,
          },
        });
      }
      await tx.event.create({
        data: {
          issueId: issue.id,
          kind: "system",
          field: "shipg",
          fromValue: recoveryRecordId ? "exception" : null,
          toValue: initialStatus,
          body: trackingNumber,
          authorId: me.id,
        },
      });
    }
    return { record, createdParcel };
  });

  if (created.createdParcel?.state === "pending") {
    try {
      await syncParcels([created.createdParcel], { fresh: true });
    } catch (error) {
      console.error("Initial ShipG tracking sync failed", error);
    }
  }

  refresh(issue?.key);
  const finalStatus = await db.shipgReturn.findUnique({
    where: { id: created.record.id },
    select: { status: true },
  });
  const status = finalStatus?.status ?? created.record.status;
  if (status === "stocked") {
    checkRareMatchesAfterStocking();
    redirect(`/shipg?view=${shipgStatusView(status)}&saved=created&matches=${created.record.id}`);
  }
  redirect(`/shipg?view=${shipgStatusView(status)}&saved=created`);
}

export async function createManualShipGermanStock(
  _previous: ShipgFormState,
  fd: FormData,
): Promise<ShipgFormState> {
  const me = await requireShipgStrict();
  const shipgermanParcelId = text(fd, "shipgermanParcelId", 100);
  const orderNumber = text(fd, "orderNumber", 40)?.replace(/^#/, "").trim();
  if (!shipgermanParcelId || !orderNumber) return { error: t(me.locale, "shipg.manualStock.error.required") };

  const names = fd.getAll("itemName");
  const variants = fd.getAll("itemVariant");
  const quantities = fd.getAll("itemQty");
  if (names.length > 20) return { error: t(me.locale, "shipg.manualStock.error.tooManyItems") };
  let invalidItem = false;
  const items = names.flatMap((value, index) => {
    const name = typeof value === "string" ? value.trim().slice(0, 200) : "";
    const variantValue = variants[index];
    const variant = typeof variantValue === "string" ? variantValue.trim().slice(0, 120) || null : null;
    const quantityValue = quantities[index];
    const quantity = typeof quantityValue === "string" && /^\d+$/.test(quantityValue.trim())
      ? Number.parseInt(quantityValue, 10)
      : 0;
    const rowHasContent = Boolean(name || variant);
    if (!rowHasContent) return [];
    if (!name || quantity < 1 || quantity > 9999) {
      invalidItem = true;
      return [];
    }
    return [{ name, variant, quantity }];
  });
  if (invalidItem || items.length === 0) return { error: t(me.locale, "shipg.manualStock.error.items") };

  const parcel = await db.shipGermanCachedParcel.findUnique({
    where: { id: shipgermanParcelId },
    select: { active: true, sender: true, trackingNumber: true },
  });
  const occupied = await db.shipgReturn.findUnique({ where: { shipgermanParcelId }, select: { id: true } });
  if (!parcel?.active || occupied) return { error: t(me.locale, "shipg.manualStock.error.stale") };

  const now = new Date();
  let stockedId = 0;
  try {
    const record = await db.shipgReturn.create({
      data: {
        issueId: null,
        parcelId: null,
        orderNumber,
        customerName: text(fd, "customerName", 120) ?? parcel.sender ?? null,
        trackingNumber: parcel.trackingNumber,
        shipgermanParcelId,
        shipgermanMatchSource: "manual",
        shipgermanLinkedAt: now,
        matchQuality: MATCH_QUALITIES.includes(text(fd, "matchQuality", 10) as MatchQuality)
          ? (text(fd, "matchQuality", 10) as MatchQuality)
          : "high",
        status: "stocked",
        notes: text(fd, "notes", 1000),
        receivedAt: now,
        stockedAt: now,
        createdById: me.id,
        verifiedById: me.id,
        items: {
          create: items.map((item, position) => ({
            name: item.name,
            variant: item.variant,
            expectedQty: item.quantity,
            receivedQty: item.quantity,
            condition: "good",
            position,
          })),
        },
      },
    });
    stockedId = record.id;
    // Vpisan paket je identificiran, zato počistimo morebitno oznako neznane vsebine.
    await db.shipGermanCachedParcel.updateMany({ where: { id: shipgermanParcelId }, data: { unidentifiable: false } });
  } catch (error) {
    console.error("Manual ShipGerman stock creation failed", error);
    return { error: t(me.locale, "shipg.manualStock.error.stale") };
  }

  refresh();
  checkRareMatchesAfterStocking();
  redirect(`/shipg?view=stock&saved=manualStockCreated&matches=${stockedId}`);
}

/** Poveže obstoječo (ročno vpisano) ShipGerman zalogo z naročilom/issue-jem,
 *  namesto da bi za isti fizični paket nastal podvojen zapis. Merge je urejljiv:
 *  za vsak kanonični kos se vpiše dejanska količina v paketu (privzeto trenutna
 *  vsebina). Tako se popravi nepopoln vnos — manjkajoč kos, ki fizično je v
 *  paketu, se doda; napačna količina se posodobi; kos, nastavljen na 0, odstrani.
 *  Ujemajoče postavke se povežejo z naročilom po kanoničnem ključu. */
export async function mergeShipgStockIntoIssue(fd: FormData): Promise<void> {
  const me = await requireShipgStrict();
  const recordId = positiveId(fd.get("shipgReturnId"));
  const issueId = positiveId(fd.get("issueId"));
  if (!recordId || !issueId) redirect("/shipg?view=stock&error=mergeInvalid");

  const [record, issue] = await Promise.all([
    db.shipgReturn.findUnique({
      where: { id: recordId },
      include: { items: { orderBy: { position: "asc" } }, allocation: { select: { id: true } } },
    }),
    db.issue.findUnique({
      where: { id: issueId },
      include: { items: { orderBy: { position: "asc" } } },
    }),
  ]);

  // Merge je dovoljen le za nepovezano zalogo brez rezervacije, ki pripada
  // istemu naročilu kot issue (varovalo pred napačno povezavo).
  if (!record || !issue || record.issueId || record.allocation || record.orderNumber !== issue.orderNumber) {
    redirect("/shipg?view=stock&error=mergeStale");
  }
  // Paket mora biti še v skladišču — sicer bi vračilo stranke potrdili kot zalogo
  // na paketu, ki je že odšel.
  const parcel = record.shipgermanParcelId
    ? await db.shipGermanCachedParcel.findUnique({ where: { id: record.shipgermanParcelId }, select: { active: true } })
    : null;
  if (record.shipgermanParcelId && !parcel?.active) {
    redirect("/shipg?view=stock&error=mergeStale");
  }

  // Uniji kanoničnih slotov: postavke paketa (najprej — določijo ime/varianto)
  // in postavke naročila (dodajo issueItemId za povezavo).
  type Slot = {
    name: string;
    variant: string | null;
    packageItemIds: number[];
    packageQty: number;
    issueItemId: number | null;
  };
  const slots = new Map<string, Slot>();
  const ensure = (name: string, variant: string | null) => {
    const key = canonicalKey(name, variant);
    let slot = slots.get(key);
    if (!slot) {
      slot = { name, variant, packageItemIds: [], packageQty: 0, issueItemId: null };
      slots.set(key, slot);
    }
    return { key, slot };
  };
  for (const item of record.items) {
    const { slot } = ensure(item.name, item.variant);
    // Več vrstic istega kanoničnega kosa v paketu združimo v en slot.
    slot.packageItemIds.push(item.id);
    slot.packageQty += item.receivedQty > 0 ? item.receivedQty : item.expectedQty;
  }
  for (const item of issue.items) {
    const { slot } = ensure(item.name, item.variant);
    if (slot.issueItemId === null) slot.issueItemId = item.id;
  }

  // Končna količina v paketu na slot: iz obrazca, sicer trenutna vsebina.
  const finalQty = (key: string, fallback: number) => {
    const raw = fd.get(`qty.${key}`);
    if (typeof raw !== "string" || !/^\d+$/.test(raw.trim())) return fallback;
    return Math.min(Number.parseInt(raw, 10), 9999);
  };

  try {
    await db.$transaction(async (tx) => {
      const linked = await tx.shipgReturn.updateMany({
        where: { id: recordId, issueId: null, updatedAt: record.updatedAt },
        data: { issueId: issue.id },
      });
      if (linked.count !== 1) throw new Error("stale");

      let nextPosition = record.items.length;
      for (const [key, slot] of slots) {
        const qty = finalQty(key, slot.packageQty);
        if (slot.packageItemIds.length > 0) {
          const [keepId, ...extraIds] = slot.packageItemIds;
          // Podvojene vrstice istega kosa konsolidiramo v eno.
          if (extraIds.length) await tx.shipgReturnItem.deleteMany({ where: { id: { in: extraIds } } });
          if (qty <= 0) {
            // Kos, nastavljen na 0, ni v paketu — odstranimo ga iz zaloge.
            await tx.shipgReturnItem.delete({ where: { id: keepId } });
          } else {
            await tx.shipgReturnItem.update({
              where: { id: keepId },
              data: { expectedQty: qty, receivedQty: qty, ...(slot.issueItemId !== null ? { issueItemId: slot.issueItemId } : {}) },
            });
          }
        } else if (qty > 0) {
          // Manjkajoč kos, ki fizično je v paketu — dodamo ga v zalogo.
          await tx.shipgReturnItem.create({
            data: {
              shipgReturnId: recordId,
              issueItemId: slot.issueItemId,
              name: slot.name,
              variant: slot.variant,
              expectedQty: qty,
              receivedQty: qty,
              condition: "good",
              position: nextPosition++,
            },
          });
        }
      }

      await tx.event.create({
        data: {
          issueId: issue.id,
          kind: "system",
          field: "shipg",
          fromValue: null,
          toValue: "stocked",
          body: record.shipgermanParcelId ? `ShipGerman ${record.shipgermanParcelId}` : record.trackingNumber,
          authorId: me.id,
        },
      });
    });
  } catch (error) {
    console.error("ShipG merge failed", error);
    redirect("/shipg?view=stock&error=mergeStale");
  }

  refresh(issue.key);
  redirect(`/orders/${issue.key}`);
}

/** Poveže odprt ticket (Za preverit / pričakovan) z že obstoječo ShipGerman
 *  zalogo istega naročila, ki je bila vpisana ročno prek "Dodaj staro naročilo".
 *  Fizični paket je vir resnice: zaloga postane vpisana zaloga naročila, njene
 *  postavke se povežejo z naročilom po kanoničnem ključu, odvečni ticket pa se
 *  umakne — tako za isti fizični paket ne ostaneta dva zapisa. */
export async function reconcileTicketWithStock(fd: FormData): Promise<void> {
  const me = await requireShipgStrict();
  const ticketId = positiveId(fd.get("ticketId"));
  const stockId = positiveId(fd.get("stockId"));
  if (!ticketId || !stockId) redirect("/shipg?view=check&error=reconcileInvalid");

  const [ticket, stock] = await Promise.all([
    db.shipgReturn.findUnique({
      where: { id: ticketId },
      include: {
        issue: { select: { id: true, key: true, items: { orderBy: { position: "asc" }, select: { id: true, name: true, variant: true } } } },
        allocation: { select: { id: true } },
      },
    }),
    db.shipgReturn.findUnique({
      where: { id: stockId },
      include: { items: { orderBy: { position: "asc" } }, allocation: { select: { id: true } } },
    }),
  ]);

  // Ticket mora biti odprt, vezan na naročilo in brez lastne ShipGerman povezave.
  // Zaloga mora biti vpisana, nerezervirana, brez naročila in za isto številko
  // naročila (varovalo pred napačno povezavo).
  if (
    !ticket || !ticket.issue || ticket.allocation || ticket.shipgermanParcelId ||
    !["check", "expected"].includes(ticket.status) ||
    !stock || stock.status !== "stocked" || stock.issueId || stock.allocation ||
    !stock.shipgermanParcelId || stock.orderNumber !== ticket.orderNumber ||
    // Paket poznejšega kroga menjave je drug fizični paket, ne ta zaloga.
    stock.exchangeRound !== ticket.exchangeRound
  ) {
    redirect("/shipg?view=check&error=reconcileStale");
  }
  // Paket mora biti še v skladišču — sicer bi ticket zaprli na paketu, ki je že odšel.
  const stockParcel = await db.shipGermanCachedParcel.findUnique({ where: { id: stock.shipgermanParcelId }, select: { active: true } });
  if (!stockParcel?.active) redirect("/shipg?view=check&error=reconcileStale");

  const issue = ticket.issue;
  const issueByKey = new Map<string, number>();
  for (const item of issue.items) {
    const key = canonicalKey(item.name, item.variant);
    if (!issueByKey.has(key)) issueByKey.set(key, item.id);
  }

  try {
    await db.$transaction(async (tx) => {
      // Zalogo pripnemo naročilu (optimistični zaklep).
      const linked = await tx.shipgReturn.updateMany({
        where: { id: stock.id, issueId: null, updatedAt: stock.updatedAt },
        data: { issueId: issue.id },
      });
      if (linked.count !== 1) throw new Error("stale");

      // Ujemajoče postavke povežemo z naročilom (vsak issue item porabimo enkrat).
      for (const item of stock.items) {
        const key = canonicalKey(item.name, item.variant);
        const issueItemId = issueByKey.get(key);
        if (issueItemId) {
          issueByKey.delete(key);
          await tx.shipgReturnItem.update({ where: { id: item.id }, data: { issueItemId } });
        }
      }

      // Odvečni ticket umaknemo (postavke se izbrišejo kaskadno).
      const removed = await tx.shipgReturn.deleteMany({
        where: { id: ticket.id, status: ticket.status, updatedAt: ticket.updatedAt },
      });
      if (removed.count !== 1) throw new Error("stale");

      await tx.event.create({
        data: {
          issueId: issue.id,
          kind: "system",
          field: "shipg",
          fromValue: ticket.status,
          toValue: "stocked",
          body: stock.shipgermanParcelId ? `ShipGerman ${stock.shipgermanParcelId}` : stock.trackingNumber,
          authorId: me.id,
        },
      });
    });
  } catch (error) {
    console.error("ShipG reconcile failed", error);
    redirect("/shipg?view=check&error=reconcileStale");
  }

  refresh(issue.key);
  redirect("/shipg?view=check&saved=reconciled");
}

/**
 * Pripne ticketu zapis zaloge istega naročila, katerega paket je medtem že
 * odšel (rezerviran ali odposlan drugi stranki). Zapis je nastal pred ticketom,
 * zato je ostal brez njega. Zaloge to ne spremeni — paketa ni več — ticket pa
 * dobi zgodovino: vračilo je prispelo in kam je šel kos.
 */
export async function linkShippedStockToIssue(fd: FormData): Promise<void> {
  const me = await requireShipgStrict();
  const recordId = positiveId(fd.get("shipgReturnId"));
  const issueId = positiveId(fd.get("issueId"));
  if (!recordId || !issueId) redirect("/shipg");

  const [record, issue] = await Promise.all([
    db.shipgReturn.findUnique({
      where: { id: recordId },
      include: { items: true, allocation: { select: { status: true } } },
    }),
    db.issue.findUnique({ where: { id: issueId }, include: { items: true } }),
  ]);
  const left = record?.status === "shipped" || Boolean(record?.allocation);
  if (!record || !issue || record.issueId || !left || record.orderNumber !== issue.orderNumber) {
    redirect(issue ? `/orders/${issue.key}` : "/shipg");
  }

  // Postavke paketa povežemo s postavkami ticketa po kanoničnem ključu, kakor
  // pri združitvi zaloge.
  const byKey = new Map(issue.items.map((item) => [canonicalKey(item.name, item.variant), item.id] as const));

  await db.$transaction(async (tx) => {
    const linked = await tx.shipgReturn.updateMany({
      where: { id: record.id, issueId: null, updatedAt: record.updatedAt },
      data: { issueId: issue.id, customerName: record.customerName ?? issue.customerName },
    });
    if (linked.count !== 1) return;
    for (const item of record.items) {
      const issueItemId = byKey.get(canonicalKey(item.name, item.variant));
      if (issueItemId && !item.issueItemId) {
        await tx.shipgReturnItem.update({ where: { id: item.id }, data: { issueItemId } });
      }
    }
    await tx.event.create({
      data: {
        issueId: issue.id,
        kind: "system",
        field: "shipg",
        fromValue: record.status,
        toValue: "linked",
        body: record.shipgermanParcelId ? `ShipGerman ${record.shipgermanParcelId}` : null,
        authorId: me.id,
      },
    });
    await tx.issue.update({ where: { id: issue.id }, data: { updatedAt: new Date() } });
  });

  refresh(issue.key);
  redirect(`/orders/${issue.key}`);
}

/** Poveže odprt ticket (Za preverit / pričakovan) z ŽE ODPOSLANO pošiljko iz
 *  ShipGermana. Nastane pri integraciji v obstoječi workflow: paket je fizično
 *  že zapustil skladišče (pred sistemom), zato ga register ne more "preveriti".
 *  Ticket dobi terminalni status "shipped" (izgine iz registra), povezava na
 *  paket pa v zavihku Odposlano obogati izvor naročila. */
export async function linkTicketToShipment(fd: FormData): Promise<void> {
  const me = await requireShipgStrict();
  const ticketId = positiveId(fd.get("ticketId"));
  const parcelId = text(fd, "parcelId", 100);
  if (!ticketId || !parcelId) redirect("/shipg?view=check&error=linkShipmentInvalid");

  const [ticket, shipment, occupied] = await Promise.all([
    db.shipgReturn.findUnique({
      where: { id: ticketId },
      include: { issue: { select: { key: true } }, allocation: { select: { id: true } } },
    }),
    db.shipGermanCachedShipment.findFirst({ where: { parcelId, status: "Shipped" }, select: { id: true } }),
    db.shipgReturn.findUnique({ where: { shipgermanParcelId: parcelId }, select: { id: true } }),
  ]);

  // Ticket mora biti odprt, nerezerviran in brez lastne povezave; pošiljka mora
  // biti dejansko odposlana.
  if (
    !ticket || !["check", "expected"].includes(ticket.status) || ticket.allocation || ticket.shipgermanParcelId || !shipment
  ) {
    redirect("/shipg?view=check&error=linkShipmentStale");
  }

  // En fizični paket pripada enemu zapisu. Kadar je že vezan, to ni "zastarel
  // podatek", ampak nekaj drugega: paket smo že prevzeli pod drugim zapisom —
  // in prav to je treba povedati, ne pošiljati človeka osveževat strani.
  if (occupied && occupied.id !== ticket.id) {
    redirect("/shipg?view=check&error=linkShipmentTaken");
  }

  try {
    await db.$transaction(async (tx) => {
      const changed = await tx.shipgReturn.updateMany({
        where: { id: ticketId, status: ticket.status, updatedAt: ticket.updatedAt, shipgermanParcelId: null },
        data: {
          shipgermanParcelId: parcelId,
          shipgermanMatchSource: "manual",
          shipgermanLinkedAt: new Date(),
          status: "shipped",
          receivedAt: ticket.receivedAt ?? new Date(),
        },
      });
      if (changed.count !== 1) throw new Error("stale");
      if (ticket.issueId) {
        await tx.event.create({
          data: {
            issueId: ticket.issueId,
            kind: "system",
            field: "shipg",
            fromValue: ticket.status,
            toValue: "shipped",
            body: `ShipGerman ${parcelId}`,
            authorId: me.id,
          },
        });
      }
    });
  } catch (error) {
    console.error("ShipG link-to-shipment failed", error);
    redirect("/shipg?view=check&error=linkShipmentStale");
  }

  refresh(ticket.issue?.key);
  redirect("/shipg?view=check&saved=linkedShipment");
}

/**
 * Zapre zapis, katerega paket smo pod ISTIM naročilom že prevzeli in odposlali
 * pod drugim zapisom. Fizičnega paketa mu ne moremo pripisati — en paket pripada
 * enemu zapisu — zato zapis samo dobi terminalni status in v niti ticketa pusti
 * sled, kam je paket šel. Brez tega bi tak zapis večno visel v "Za preverit" in
 * čakal paket, ki je že odšel.
 */
export async function resolveAlreadyShipped(fd: FormData): Promise<void> {
  const me = await requireShipgStrict();
  const ticketId = positiveId(fd.get("ticketId"));
  const siblingId = positiveId(fd.get("siblingId"));
  if (!ticketId || !siblingId || ticketId === siblingId) {
    redirect("/shipg?view=check&error=linkShipmentInvalid");
  }

  const [ticket, sibling] = await Promise.all([
    db.shipgReturn.findUnique({
      where: { id: ticketId },
      include: { issue: { select: { key: true } }, allocation: { select: { id: true } } },
    }),
    db.shipgReturn.findUnique({
      where: { id: siblingId },
      select: { orderNumber: true, shipgermanParcelId: true, exchangeRound: true, allocation: { select: { status: true } } },
    }),
  ]);
  // Sosednji paket mora res oditi — enako kot oznaka "Paket je že odšel" v registru.
  const siblingShipment = sibling?.shipgermanParcelId
    ? await db.shipGermanCachedShipment.findFirst({
        where: { parcelId: sibling.shipgermanParcelId, status: { in: ["Shipped", "ReadyForProcessing"] } },
        select: { id: true },
      })
    : null;
  const siblingLeft = Boolean(siblingShipment) || ["shipped", "dispatching"].includes(sibling?.allocation?.status ?? "");

  // Sosednji zapis mora res nositi paket in biti od istega naročila in istega
  // kroga menjave; sicer bi s tem gumbom lahko zaprli karkoli — tudi paket, ki ga
  // stranka vrača v drugem krogu in je fizično v skladišču.
  // Tudi zapis "v zalogi" brez paketa: vpisan je bil na paket, ki je medtem odšel
  // pod sosednjim zapisom, in zalogo le napačno povečuje.
  if (
    !ticket || !["check", "expected", "exception", "stocked"].includes(ticket.status) || ticket.allocation || ticket.shipgermanParcelId ||
    !sibling || !sibling.shipgermanParcelId || !siblingLeft || sibling.orderNumber !== ticket.orderNumber ||
    sibling.exchangeRound !== ticket.exchangeRound
  ) {
    redirect("/shipg?view=check&error=linkShipmentStale");
  }

  try {
    await db.$transaction(async (tx) => {
      const changed = await tx.shipgReturn.updateMany({
        where: { id: ticketId, status: ticket.status, updatedAt: ticket.updatedAt, shipgermanParcelId: null },
        data: { status: "shipped", receivedAt: ticket.receivedAt ?? new Date() },
      });
      if (changed.count !== 1) throw new Error("stale");
      if (ticket.issueId) {
        await tx.event.create({
          data: {
            issueId: ticket.issueId,
            kind: "system",
            field: "shipg",
            fromValue: ticket.status,
            toValue: "shipped",
            body: `ShipGerman ${sibling.shipgermanParcelId}`,
            authorId: me.id,
          },
        });
      }
    });
  } catch (error) {
    console.error("ShipG resolve-already-shipped failed", error);
    redirect("/shipg?view=check&error=linkShipmentStale");
  }

  refresh(ticket.issue?.key);
  redirect(`/shipg?view=${shipgStatusView(ticket.status)}&saved=resolvedShipped`);
}

export async function deleteShipgReturn(fd: FormData): Promise<void> {
  const me = await requireShipgStrict();
  const id = positiveId(fd.get("shipgReturnId"));
  if (!id) redirect("/shipg?view=stock&error=deleteInvalid");

  const record = await db.shipgReturn.findUnique({
    where: { id },
    include: { allocation: { select: { id: true } }, issue: { select: { key: true } } },
  });
  if (!record) redirect("/shipg?view=stock&error=deleteInvalid");

  // Izbris je dovoljen samo za zalogo, ki ni vezana na fizičen ShipGerman paket.
  // Rezervacija menjave prav tako zaklene zapis.
  if (record.shipgermanParcelId || record.allocation) {
    redirect(`/shipg?view=${shipgStatusView(record.status)}&error=deleteLinked`);
  }

  try {
    await db.$transaction(async (tx) => {
      // Optimistični zaklep: če je paket medtem povezan, izbris ne sme uspeti.
      const deleted = await tx.shipgReturn.deleteMany({ where: { id, shipgermanParcelId: null } });
      if (deleted.count !== 1) throw new Error("stale");
      if (record.issueId) {
        await tx.event.create({
          data: {
            issueId: record.issueId,
            kind: "system",
            field: "shipg",
            fromValue: record.status,
            toValue: "deleted",
            body: record.trackingNumber,
            authorId: me.id,
          },
        });
      }
    });
  } catch (error) {
    console.error("ShipG delete failed", error);
    redirect(`/shipg?view=${shipgStatusView(record.status)}&error=deleteStale`);
  }

  refresh(record.issue?.key);
  // Vrni v pogled registra, iz katerega je bil zapis odstranjen (ZA PREVERIT
  // ostane ZA PREVERIT, zaloga ostane zaloga) — ne vedno na zalogo.
  redirect(`/shipg?view=${shipgStatusView(record.status)}&saved=deleted`);
}

export async function moveShipgToCheck(fd: FormData): Promise<void> {
  const me = await requireShipgStrict();
  const id = positiveId(fd.get("shipgReturnId"));
  if (!id) redirect("/shipg?view=check&error=invalidCheck");

  const record = await db.shipgReturn.findUnique({
    where: { id },
    include: { issue: { select: { key: true } } },
  });
  if (!record) redirect("/shipg?view=check&error=invalidCheck");

  try {
    await db.$transaction(async (tx) => {
      const changed = await tx.shipgReturn.updateMany({
        where: { id, status: record.status, updatedAt: record.updatedAt },
        data: { status: "check", receivedAt: record.receivedAt ?? new Date(), stockedAt: null, verifiedById: null },
      });
      if (changed.count !== 1) throw new Error("stale");
      if (record.issueId) {
        await tx.event.create({
          data: {
            issueId: record.issueId,
            kind: "system",
            field: "shipg",
            fromValue: record.status,
            toValue: "check",
            authorId: me.id,
          },
        });
      }
    });
  } catch (error) {
    console.error("ShipG move to check failed", error);
    redirect(`/shipg?view=${shipgStatusView(record.status)}&error=staleCheck`);
  }
  refresh(record.issue?.key);
  redirect("/shipg?view=check&saved=check");
}

export async function confirmShipgReturn(fd: FormData): Promise<void> {
  const me = await requireShipgStrict();
  const id = positiveId(fd.get("shipgReturnId"));
  if (!id) redirect("/shipg?view=check&error=invalidCheck");

  const record = await db.shipgReturn.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } }, issue: { select: { key: true } } },
  });
  if (!record || !["check", "exception"].includes(record.status) || record.items.length === 0) {
    redirect("/shipg?view=check&error=invalidCheck");
  }

  const updates = record.items.map((item) => {
    const conditionRaw = fd.get(`condition.${item.id}`);
    const condition = typeof conditionRaw === "string"
      && conditionRaw !== "pending"
      && SHIPG_ITEM_CONDITIONS.includes(conditionRaw as never)
      ? conditionRaw
      : null;
    return {
      id: item.id,
      receivedQty: requiredQty(fd.get(`receivedQty.${item.id}`)),
      condition,
      note: text(fd, `note.${item.id}`, 300),
    };
  });

  if (updates.some((item) => item.receivedQty === null || item.condition === null)) {
    redirect(`/shipg?view=${shipgStatusView(record.status)}&error=invalidCheck`);
  }
  const validUpdates = updates as { id: number; receivedQty: number; condition: string; note: string | null }[];
  const hasException = validUpdates.some((item, index) =>
    item.condition !== "good" || item.receivedQty !== record.items[index].expectedQty,
  );
  const nextStatus = hasException ? "exception" : "stocked";
  const now = new Date();

  try {
    await db.$transaction(async (tx) => {
      // Optimistični zaklep: dva odprta zavihka ne moreta dvakrat potrditi istega
      // fizičnega paketa ali prepisati novejšega pregleda.
      const claimed = await tx.shipgReturn.updateMany({
        where: { id, status: record.status, updatedAt: record.updatedAt },
        data: {
          status: nextStatus,
          notes: text(fd, "notes", 1000),
          receivedAt: record.receivedAt ?? now,
          stockedAt: nextStatus === "stocked" ? now : null,
          verifiedById: me.id,
        },
      });
      if (claimed.count !== 1) throw new Error("stale");

      for (const item of validUpdates) {
        await tx.shipgReturnItem.update({
          where: { id: item.id },
          data: { receivedQty: item.receivedQty, condition: item.condition, note: item.note },
        });
      }
      if (record.issueId) {
        const summary = record.items
          .map((item, index) => `${validUpdates[index].receivedQty}× ${item.name}${item.variant ? ` (${item.variant})` : ""}`)
          .join(", ");
        await tx.event.create({
          data: {
            issueId: record.issueId,
            kind: "system",
            field: "shipg",
            fromValue: record.status,
            toValue: nextStatus,
            body: summary,
            authorId: me.id,
          },
        });
      }
    });
  } catch (error) {
    console.error("ShipG confirmation failed", error);
    redirect(`/shipg?view=${shipgStatusView(record.status)}&error=staleCheck`);
  }

  refresh(record.issue?.key);
  if (nextStatus === "stocked") {
    checkRareMatchesAfterStocking();
    redirect(`/shipg?view=${shipgStatusView(nextStatus)}&saved=${nextStatus}&matches=${id}`);
  }
  redirect(`/shipg?view=${shipgStatusView(nextStatus)}&saved=${nextStatus}`);
}

/**
 * Masovni pregled: izbrani paketi so prišli celi in v pričakovani količini.
 * Vsak zapis gre skozi isti optimistični zaklep kot posamična potrditev, zato
 * spremenjen ali že potrjen zapis preskočimo, ostale pa vseeno vpišemo.
 */
export async function confirmShipgReturnsBulk(fd: FormData): Promise<void> {
  const me = await requireShipgStrict();
  const ids = [...new Set(fd.getAll("ids").map(positiveId).filter((id): id is number => id !== null))].slice(0, 200);
  if (ids.length === 0) redirect("/shipg?view=check&error=bulkEmpty");

  const records = await db.shipgReturn.findMany({
    where: { id: { in: ids }, status: { in: ["check", "expected"] } },
    include: { items: { orderBy: { position: "asc" } }, issue: { select: { key: true } } },
  });
  const now = new Date();
  let stocked = 0;

  for (const record of records) {
    if (record.items.length === 0) continue;
    try {
      await db.$transaction(async (tx) => {
        const claimed = await tx.shipgReturn.updateMany({
          where: { id: record.id, status: record.status, updatedAt: record.updatedAt },
          data: { status: "stocked", receivedAt: record.receivedAt ?? now, stockedAt: now, verifiedById: me.id },
        });
        if (claimed.count !== 1) throw new Error("stale");
        for (const item of record.items) {
          await tx.shipgReturnItem.update({
            where: { id: item.id },
            data: { receivedQty: item.expectedQty, condition: "good" },
          });
        }
        if (record.issueId) {
          await tx.event.create({
            data: {
              issueId: record.issueId,
              kind: "system",
              field: "shipg",
              fromValue: record.status,
              toValue: "stocked",
              body: record.items.map((item) => `${item.expectedQty}× ${item.name}${item.variant ? ` (${item.variant})` : ""}`).join(", "),
              authorId: me.id,
            },
          });
        }
      });
      stocked += 1;
      if (record.issue?.key) revalidatePath(`/orders/${record.issue.key}`);
    } catch (error) {
      console.error(`ShipG bulk confirmation failed for #${record.id}`, error);
    }
  }

  refresh();
  if (stocked > 0) checkRareMatchesAfterStocking();
  redirect(`/shipg?view=check&saved=bulkStocked&count=${stocked}&skipped=${ids.length - stocked}`);
}
