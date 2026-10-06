"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Prisma } from "@prisma/client";

import { requireAdminStrict, requireUserStrict, type SessionUser } from "../auth";
import { canonicalKey } from "../catalog-canonical";
import { db } from "../db";
import {
  DEFAULT_CURRENCY,
  MIN_CLOSE_LEVEL,
  SYSTEM_TYPE,
  canClose,
  entryStance,
  handoffLevelOf,
  hasPendingResolution,
  unresolvedMessage,
  UNDECIDED_RESOLUTION,
  levelCode,
  isShipgermanMarket,
  normalizeCurrency,
  requiresReturnProof,
} from "../domain";
import { hasItemsSection, itemsFingerprint, parseItems, summarizeItems } from "../items";
import { loadConfig } from "../config/server";
import { isKnownFinancial, isKnownFulfillment } from "../order-status";
import { assignableTypes, visible } from "../config/shared";
import { returnTypeSet } from "../config/return-types";
import { deleteStoredAttachments, saveAttachments } from "../uploads";
import { notify } from "../notifications";
import { t } from "../i18n/server";
import type { Locale } from "../i18n/shared";
import type { TranslationKey } from "../i18n/dictionaries";
import { orderNumberKey } from "../order-number";
import { exchangeChanged } from "../exchange-round";
import { isPaymentBrand, priorityForPayment } from "../payment";

export type DuplicateIssue = {
  id: number;
  key: string;
  orderNumber: string;
  status: string;
  assigneeName: string | null;
};

export type FormState = { error?: string; ok?: boolean; count?: number; duplicate?: DuplicateIssue };

// --- pomožno ---------------------------------------------------------------

function str(fd: FormData, name: string, max = 500): string | null {
  const v = fd.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t === "" ? null : t;
}

/** ISO 3166-1 alpha-2 ali nič: pol vpisane kode ne shranimo, ker od države visi,
 *  ali sme naročilo skozi ShipGerman. */
function countryCode(fd: FormData, name = "customerCountryCode"): string | null {
  const code = str(fd, name, 2)?.toUpperCase() ?? null;
  return code && /^[A-Z]{2}$/.test(code) ? code : null;
}

function num(fd: FormData, name: string): number | null {
  const v = str(fd, name);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function date(fd: FormData, name: string): Date | null {
  const v = str(fd, name);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function files(fd: FormData): File[] {
  return fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
}

const intId = (fd: FormData, name = "issueId") => {
  const n = Number(fd.get(name));
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Vnos velja za "zunanjega", če ga naredi nekdo, ki naročila nima prevzetega
 * in tudi ne dela na nivoju, ki naročilo trenutno obravnava — entryStance().
 */
function isOutsider(issue: { assigneeId: string | null; level: number }, me: SessionUser) {
  return entryStance(issue, me) === "outsider";
}

/**
 * Prevzem, ki je posledica dejanja, ne svoj klik.
 *
 * Naročilo brez prevzemnika je v vrsti nivoja ali v sistemski vrsti — ničje.
 * Kdor se z njim začne ukvarjati (zapiše vanj s svojega nivoja, postavi ga na
 * čakanje), ga s tem vzame nase; sicer bi čakajoče naročilo ob zbujenju spet
 * nikomur ne padlo v roke. Nivo gre z osebo, enako kot pri gumbu "Prevzemi
 * nase" — tudi iz sistemske vrste, ki ni nivo nikogar.
 *
 * Zapiše dogodek in vrne true; pri naročilu, ki prevzemnika že ima, ne naredi nič.
 */
async function claimUnowned(
  issue: { id: number; assigneeId: string | null; level: number },
  me: SessionUser,
): Promise<boolean> {
  if (issue.assigneeId !== null) return false;
  await db.issue.update({
    where: { id: issue.id },
    data: { assigneeId: me.id, level: me.level },
  });
  await db.event.create({
    data: {
      issueId: issue.id,
      kind: "assign",
      fromValue: levelCode(issue.level),
      toValue: `${me.name} · L${me.level}`,
      body: null,
      authorId: me.id,
      outsider: false,
    },
  });
  return true;
}

/** Oznaka rešitve postavke v jeziku tistega, ki je spremembo naredil. */
const resolutionLabel = (locale: Locale) => (resolution: string) =>
  t(locale, `res.${resolution}` as TranslationKey);

async function touch(issueId: number) {
  await db.issue.update({ where: { id: issueId }, data: { updatedAt: new Date() } });
}

function refreshAll(key?: string) {
  revalidatePath("/orders");
  if (key) revalidatePath(`/orders/${key}`);
}

const DUPLICATE_SELECT = {
  id: true,
  key: true,
  orderNumber: true,
  status: true,
  assignee: { select: { name: true } },
} as const;

function duplicateState(issue: {
  id: number;
  key: string;
  orderNumber: string;
  status: string;
  assignee: { name: string } | null;
}): FormState {
  return {
    duplicate: {
      id: issue.id,
      key: issue.key,
      orderNumber: issue.orderNumber,
      status: issue.status,
      assigneeName: issue.assignee?.name ?? null,
    },
  };
}

// --- ustvarjanje -----------------------------------------------------------

export async function createIssue(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();

  const rawOrder = str(fd, "orderNumber", 40);
  if (!rawOrder) return { error: t(me.locale, "error.orderRequired") };
  const orderNumber = rawOrder.replace(/^#/, "").trim();
  if (!/^[A-Za-z0-9#\-_. ]{1,40}$/.test(orderNumber)) {
    return { error: t(me.locale, "error.orderCharacters") };
  }
  const normalizedOrder = orderNumberKey(orderNumber);

  const duplicate = await db.issue.findFirst({
    where: {
      OR: [
        { orderNumberKey: normalizedOrder },
        // Stare vrstice so lahko še brez backfilla; s tem ostanejo varne takoj po deployu.
        { orderNumberKey: null, orderNumber: { equals: orderNumber } },
      ],
    },
    select: DUPLICATE_SELECT,
  });
  if (duplicate) return duplicateState(duplicate);

  const typeId = str(fd, "type");
  if (!typeId) return { error: t(me.locale, "error.typeRequired") };
  // Šifrant je v bazi: vrsta, ki je admin ne ponuja več, se ne sme na novo
  // vpisati, obstoječi tiketi pa jo obdržijo.
  const { types, priorities } = await loadConfig(me.locale);
  if (!assignableTypes(types).some((type) => type.key === typeId)) return { error: t(me.locale, "error.unknownType") };

  const requestedPriority = str(fd, "priority") ?? "medium";
  if (!visible(priorities).some((p) => p.key === requestedPriority)) return { error: t(me.locale, "error.unknownPriority") };

  const paymentMethod = str(fd, "paymentMethod", 80);
  const rawPaymentBrand = str(fd, "paymentBrand", 20);
  const paymentBrand = isPaymentBrand(rawPaymentBrand) ? rawPaymentBrand : null;
  const rawPaymentLast4 = str(fd, "paymentLast4", 4);
  const paymentLast4 = rawPaymentLast4 && /^\d{4}$/.test(rawPaymentLast4) ? rawPaymentLast4 : null;
  // Klarna primeri zahtevajo hitrejšo obravnavo; ročno izbrane nujne prioritete ne znižamo.
  const priority = priorityForPayment(requestedPriority, paymentBrand);

  const assigneeId = str(fd, "assigneeId") ?? me.id;
  const assignee = await db.user.findFirst({ where: { id: assigneeId, active: true } });
  if (!assignee) return { error: t(me.locale, "error.userMissing") };

  const items = parseItems(fd);

  let createdIssue: { id: number; key: string };
  try {
    createdIssue = await db.$transaction(async (tx) => {
      const created = await tx.issue.create({
        data: {
          // Začasni ključ omogoči, da končni KRJ ključ izpeljemo iz dejansko
          // dodeljenega ID-ja. Tako se ključ po trajnem izbrisu ne more ponoviti.
          key: `PENDING-${randomUUID()}`,
          orderNumber,
          orderNumberKey: normalizedOrder,
          type: typeId,
          priority,
          status: "open",
          level: assignee.level,
          title: str(fd, "title", 200),
          customerName: str(fd, "customerName", 120),
          customerEmail: str(fd, "customerEmail", 200),
          customerPhone: str(fd, "customerPhone", 40),
          customerAddress: str(fd, "customerAddress", 300),
          customerCountryCode: countryCode(fd),
          // Naročilo obdrži valuto, v kateri je bilo plačano — ne pretvarjamo.
          currency: normalizeCurrency(str(fd, "currency", 3)) ?? DEFAULT_CURRENCY,
          amount: num(fd, "amount"),
          paymentMethod,
          paymentBrand,
          paymentLast4,
          returnTracking: str(fd, "returnTracking", 80),
          orderPlacedAt: date(fd, "orderPlacedAt"),
          // Stanje pri Shopifyju, če ga je auto-fill videl; sicer ga vpiše
          // nočno preverjanje.
          ...shopifyStatusFrom(fd),
          assigneeId: assignee.id,
          reporterId: me.id,
          items: { create: items },
        },
      });

      const key = `KRJ-${created.id}`;
      await tx.issue.update({ where: { id: created.id }, data: { key } });

      await tx.event.create({
        data: {
          issueId: created.id,
          kind: "created",
          body: null,
          authorId: me.id,
        },
      });

      return { id: created.id, key };
    });
  } catch (error) {
    // Enolični indeks zapre tudi tekmo dveh sočasnih oddaj iste številke.
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) {
      throw error;
    }
    const concurrent = await db.issue.findUnique({
      where: { orderNumberKey: normalizedOrder },
      select: DUPLICATE_SELECT,
    });
    if (!concurrent) throw error;
    return duplicateState(concurrent);
  }
  const { id: issueId, key: issueKey } = createdIssue;

  const description = str(fd, "description", 5000);
  const attachments = files(fd);
  if (description || attachments.length > 0) {
    const event = await db.event.create({
      data: { issueId, kind: "comment", body: description ?? "", authorId: me.id },
    });
    await saveAttachments(attachments, issueId, event.id, me.locale);
  }

  if (assignee.id !== me.id) {
    await notify({ kind: "handoff", recipientId: assignee.id, issueId, issueKey, orderNumber, actorName: me.name, preview: description });
  }

  refreshAll(issueKey);
  redirect(`/orders/${issueKey}`);
}

export type ReopenDuplicateResult =
  | { ok: true; key: string }
  | { ok: false; error: string };

/** Ponovno odpre obstoječe arhivirano naročilo namesto ustvarjanja dvojnika. */
export async function reopenDuplicateIssue(id: number): Promise<ReopenDuplicateResult> {
  const me = await requireUserStrict();
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: t(me.locale, "error.invalidOrder") };
  }

  const issue = await db.issue.findUnique({ where: { id } });
  if (!issue) return { ok: false, error: t(me.locale, "error.orderMissing") };
  if (issue.status !== "closed") return { ok: true, key: issue.key };

  await db.$transaction(async (tx) => {
    const reopened = await tx.issue.updateMany({
      where: { id, status: "closed" },
      data: { status: "open", waitingUntil: null, waitingReplySince: null, closedAt: null, archivedAt: null },
    });
    if (reopened.count !== 1) return;
    await tx.event.create({
      data: {
        issueId: id,
        kind: "status",
        fromValue: "closed",
        toValue: "open",
        body: null,
        authorId: me.id,
        outsider: isOutsider(issue, me),
      },
    });
  });

  refreshAll(issue.key);
  return { ok: true, key: issue.key };
}

// --- opombe ----------------------------------------------------------------

export async function addComment(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const id = intId(fd);
  if (!id) return { error: t(me.locale, "error.invalidOrder") };

  const body = str(fd, "body", 10000);
  const attachments = files(fd);
  if (!body && attachments.length === 0) return { error: t(me.locale, "error.emptyEntry") };

  const issue = await db.issue.findUnique({
    where: { id },
    select: { key: true, orderNumber: true, assigneeId: true, level: true, status: true },
  });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };

  const stance = entryStance(issue, me);
  const outsider = stance === "outsider";

  // Vnos s svojega nivoja v naročilo, ki v vrsti tega nivoja čaka na prevzem,
  // JE prevzem: kdor se nanj odzove, ga s tem vzame nase in vrsta ne ostane
  // videti prosta. Zaprtega naročila ni treba komu dodeliti.
  if (stance === "claim" && issue.status !== "closed") {
    await claimUnowned({ id, assigneeId: issue.assigneeId, level: issue.level }, me);
  }

  const event = await db.event.create({
    data: {
      issueId: id,
      kind: "comment",
      body: body ?? "",
      authorId: me.id,
      outsider,
    },
  });

  const errors = await saveAttachments(attachments, id, event.id, me.locale);
  await touch(id);
  // Zunanji vnos je treba javiti tistemu, ki naročilo obravnava: prevzemniku,
  // pri naročilu v vrsti pa vsem na nivoju, ki ga ima v svoji vrsti.
  if (outsider) {
    const recipients = issue.assigneeId
      ? [issue.assigneeId]
      : (
          await db.user.findMany({
            where: { active: true, level: issue.level, id: { not: me.id } },
            select: { id: true },
          })
        ).map((user) => user.id);
    await Promise.all(
      recipients.map((recipientId) =>
        notify({ kind: "outsider", recipientId, issueId: id, issueKey: issue.key, orderNumber: issue.orderNumber, actorName: me.name, preview: body }),
      ),
    );
  }
  refreshAll(issue.key);
  return errors.length ? { error: errors.join(" ") } : { ok: true };
}

/** Zamenja pričakovani kos v odprtih (še ne vpisanih) vračilih ticketa. */
async function swapExpectedReturnItems(
  issueId: number,
  round: number,
  swaps: { from: readonly [string, string | null]; to: readonly [string, string | null] }[],
) {
  const open = await db.shipgReturn.findMany({
    where: { issueId, exchangeRound: round, status: { in: ["expected", "check", "exception"] } },
    select: { items: { where: { condition: "pending" }, select: { id: true, name: true, variant: true } } },
  });
  const pool = open.flatMap((record) => record.items);
  for (const swap of swaps) {
    const key = canonicalKey(swap.from[0], swap.from[1]);
    const target = pool.find((item) => canonicalKey(item.name, item.variant) === key);
    if (!target) continue;
    // Naslednja zamenjava vidi že zamenjan kos.
    target.name = swap.to[0];
    target.variant = swap.to[1];
    await db.shipgReturnItem.update({ where: { id: target.id }, data: { name: swap.to[0], variant: swap.to[1] } });
  }
}

/**
 * Popravi lasten komentar. Prejšnje besedilo se shrani v zgodovino, komentar
 * pa v niti dobi oznako "urejeno" — tuji komentarji se ne urejajo.
 */
export async function editComment(fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const eventId = intId(fd, "eventId");
  if (!eventId) return { error: t(me.locale, "error.invalidOrder") };
  const body = str(fd, "body", 10000) ?? "";

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, kind: true, body: true, authorId: true, createdAt: true, editedAt: true,
      issue: { select: { key: true } },
      _count: { select: { attachments: true } },
    },
  });
  if (!event || event.kind !== "comment" || event.authorId !== me.id) {
    return { error: t(me.locale, "thread.comment.notYours") };
  }
  if (!body && event._count.attachments === 0) return { error: t(me.locale, "error.emptyEntry") };
  if (body === (event.body ?? "")) return { ok: true };

  const now = new Date();
  await db.$transaction([
    db.eventRevision.create({
      data: { eventId, body: event.body ?? "", writtenAt: event.editedAt ?? event.createdAt, editedById: me.id },
    }),
    db.event.update({ where: { id: eventId }, data: { body, editedAt: now } }),
  ]);

  refreshAll(event.issue.key);
  return { ok: true };
}

// --- predaja naprej --------------------------------------------------------

export async function handoff(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const id = intId(fd);
  if (!id) return { error: t(me.locale, "error.invalidOrder") };

  const handoffTarget = str(fd, "handoffTarget") ?? str(fd, "toUserId");
  if (!handoffTarget) return { error: t(me.locale, "error.chooseHandoff") };

  const issue = await db.issue.findUnique({
    where: { id },
    include: { assignee: { select: { id: true, name: true } }, items: { select: { resolution: true } } },
  });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };
  if (hasPendingResolution(issue.items)) return { error: t(me.locale, unresolvedMessage(issue.items)) };

  const note = str(fd, "note", 5000);
  const attachments = files(fd);

  if (handoffTarget.startsWith("level:")) {
    const targetLevel = handoffLevelOf(handoffTarget);
    if (targetLevel === null) {
      return { error: t(me.locale, "error.invalidLevel") };
    }
    if (issue.assigneeId === null && issue.level === targetLevel) {
      return { error: t(me.locale, "error.alreadyAtLevel") };
    }

    const recipients = await db.user.findMany({
      where: { active: true, level: targetLevel, id: { not: me.id } },
      select: { id: true },
    });
    const activeAtLevel = recipients.length > 0 || me.level === targetLevel;
    if (!activeAtLevel) return { error: t(me.locale, "error.levelUnavailable") };

    await db.issue.update({
      where: { id },
      data: {
        assigneeId: null,
        level: targetLevel,
        status: "open",
        waitingUntil: null,
        waitingReplySince: null,
        closedAt: null,
        archivedAt: null,
      },
    });

    const event = await db.event.create({
      data: {
        issueId: id,
        kind: "assign",
        fromValue: issue.assignee?.name ?? levelCode(issue.level),
        toValue: levelCode(targetLevel),
        body: note,
        authorId: me.id,
        outsider: isOutsider(issue, me),
      },
    });

    const errors = await saveAttachments(attachments, id, event.id, me.locale);
    await Promise.all(
      recipients.map(({ id: recipientId }) =>
        notify({
          kind: "handoff",
          recipientId,
          issueId: id,
          issueKey: issue.key,
          orderNumber: issue.orderNumber,
          actorName: me.name,
          preview: note ?? t(me.locale, "notification.levelPreview", { level: targetLevel }),
        }),
      ),
    );
    refreshAll(issue.key);
    return errors.length ? { error: errors.join(" ") } : { ok: true };
  }

  const target = await db.user.findFirst({ where: { id: handoffTarget, active: true } });
  if (!target) return { error: t(me.locale, "error.userUnavailable") };
  if (target.id === issue.assigneeId) return { error: t(me.locale, "error.alreadyAssigned") };

  await db.issue.update({
    where: { id },
    data: {
      assigneeId: target.id,
      level: target.level,
      status: "open",
      waitingUntil: null,
      waitingReplySince: null,
      closedAt: null,
      archivedAt: null,
    },
  });

  const event = await db.event.create({
    data: {
      issueId: id,
      kind: "assign",
      fromValue: issue.assignee?.name ?? null,
      toValue: `${target.name} · L${target.level}`,
      body: note,
      authorId: me.id,
      outsider: isOutsider(issue, me),
    },
  });

  const errors = await saveAttachments(attachments, id, event.id, me.locale);
  await notify({ kind: "handoff", recipientId: target.id, issueId: id, issueKey: issue.key, orderNumber: issue.orderNumber, actorName: me.name, preview: note });
  refreshAll(issue.key);
  return errors.length ? { error: errors.join(" ") } : { ok: true };
}

/** Prevzem nase — kadar naročilo visi nedodeljeno ali ga je treba potegniti k sebi. */
export async function claim(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const id = intId(fd);
  if (!id) return { error: t(me.locale, "error.invalidOrder") };

  const issue = await db.issue.findUnique({
    where: { id },
    include: { assignee: { select: { name: true } } },
  });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };
  if (issue.assigneeId === me.id) return { ok: true };

  await db.issue.update({
    where: { id },
    data: { assigneeId: me.id, level: me.level, status: "open", waitingUntil: null, waitingReplySince: null },
  });
  await db.event.create({
    data: {
      issueId: id,
      kind: "assign",
      fromValue: issue.assignee?.name ?? null,
      toValue: `${me.name} · L${me.level}`,
      body: null,
      authorId: me.id,
      outsider: isOutsider(issue, me),
    },
  });

  refreshAll(issue.key);
  return { ok: true };
}

// --- status ----------------------------------------------------------------

export async function setWaiting(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const id = intId(fd);
  if (!id) return { error: t(me.locale, "error.invalidOrder") };

  const issue = await db.issue.findUnique({ where: { id } });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };

  const until = date(fd, "waitingUntil");
  const note = str(fd, "note", 2000);
  // Čakanje na odgovor stranke: šteje pošta, ki prispe od zdaj naprej — starejša
  // sporočila ticketa ne smejo takoj zbuditi. Brez e-naslova ni česa čakati.
  const waitForReply = fd.get("waitForReply") !== null;
  if (waitForReply && !issue.customerEmail) return { error: t(me.locale, "error.noCustomerEmail") };

  // Čakanje je odločitev o poteku dela, ne mimogrede vržena opomba: kdor
  // naročilo uspava, ga prevzame. Brez tega bi ob zbujenju spet stalo v vrsti
  // in nihče ne bi vedel, na kaj je sploh čakalo.
  const claimed = await claimUnowned(issue, me);

  await db.issue.update({
    where: { id },
    data: {
      status: "waiting",
      waitingUntil: until,
      waitingReplySince: waitForReply ? new Date() : null,
      closedAt: null,
      archivedAt: null,
    },
  });
  await db.event.create({
    data: {
      issueId: id,
      kind: "status",
      fromValue: issue.status,
      toValue: "waiting",
      body: note,
      authorId: me.id,
      // Po prevzemu naročilo ni več tuje; oznaka bi bila v isti sapi zanikana.
      outsider: claimed ? false : isOutsider(issue, me),
    },
  });

  refreshAll(issue.key);
  return { ok: true };
}

export async function resume(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const id = intId(fd);
  if (!id) return { error: t(me.locale, "error.invalidOrder") };

  const issue = await db.issue.findUnique({ where: { id } });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };

  await db.issue.update({
    where: { id },
    data: { status: "open", waitingUntil: null, waitingReplySince: null, closedAt: null, archivedAt: null },
  });
  await db.event.create({
    data: {
      issueId: id,
      kind: "status",
      fromValue: issue.status,
      toValue: "open",
      body: null,
      authorId: me.id,
      outsider: isOutsider(issue, me),
    },
  });

  refreshAll(issue.key);
  return { ok: true };
}

export async function closeIssue(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const id = intId(fd);
  if (!id) return { error: t(me.locale, "error.invalidOrder") };

  if (!canClose(me)) {
    return {
      error: t(me.locale, "error.closeLevel", { level: MIN_CLOSE_LEVEL }),
    };
  }

  const issue = await db.issue.findUnique({
    where: { id },
    include: { items: { select: { resolution: true } } },
  });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };
  if (issue.status === "closed") return { ok: true };
  // Sistemski ticket se ne zapre nerazvrščen: vrsto izbere človek.
  if (issue.type === SYSTEM_TYPE) return { error: t(me.locale, "error.unsortedClose") };
  if (hasPendingResolution(issue.items)) return { error: t(me.locale, unresolvedMessage(issue.items)) };

  // Varovalka: pri vračilih se ne zapira, dokler paket ni prišel nazaj.
  // Kadar so postavke vpisane, odločajo one — dovolj je en artikel v vračilu.
  if (requiresReturnProof(issue.type, issue.items, await returnTypeSet(), issue.exchangeFault) && fd.get("returnConfirmed") !== "on") {
    return {
      error: t(me.locale, "error.confirmReturn"),
    };
  }

  const note = str(fd, "note", 5000);
  const attachments = files(fd);
  const now = new Date();

  await db.issue.update({
    where: { id },
    data: { status: "closed", closedAt: now, archivedAt: now, waitingUntil: null, waitingReplySince: null },
  });

  const event = await db.event.create({
    data: {
      issueId: id,
      kind: "status",
      fromValue: issue.status,
      toValue: "closed",
      body: note,
      authorId: me.id,
      outsider: isOutsider(issue, me),
    },
  });

  const errors = await saveAttachments(attachments, id, event.id, me.locale);
  refreshAll(issue.key);
  // Oceno zadovoljstva naredi AI po odgovoru — zaključek ne čaka na pošto in model.
  return errors.length ? { error: errors.join(" ") } : { ok: true };
}

/**
 * Stranka je pisala po zaključku in Desk je ticket znova odprl, mail pa ne
 * zahteva ničesar (npr. »hvala«). Ticket se zapre nazaj brez ponovnega
 * preverjanja vračila — to je veljalo že ob prvem zaprtju. Dovoljeno samo,
 * dokler od ponovnega odprtja nihče ni spremenil statusa.
 */
export async function recloseAfterReply(issueId: number): Promise<FormState> {
  const me = await requireUserStrict();
  if (!Number.isSafeInteger(issueId) || issueId <= 0) return { error: t(me.locale, "error.invalidOrder") };
  if (!canClose(me)) return { error: t(me.locale, "error.closeLevel", { level: MIN_CLOSE_LEVEL }) };

  const issue = await db.issue.findUnique({ where: { id: issueId }, select: { id: true, key: true, status: true } });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };
  if (issue.status === "closed") return { ok: true };
  const lastStatus = await db.event.findFirst({
    where: { issueId, kind: "status" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { field: true },
  });
  if (issue.status !== "open" || lastStatus?.field !== "reply_after_close") return { error: t(me.locale, "thread.recloseStale") };

  const now = new Date();
  await db.$transaction([
    db.issue.update({
      where: { id: issueId },
      data: { status: "closed", closedAt: now, archivedAt: now, waitingUntil: null, waitingReplySince: null },
    }),
    db.event.create({
      data: { issueId, kind: "status", field: "reply_acknowledged", fromValue: "open", toValue: "closed", authorId: me.id },
    }),
    // Mail je pregledan: pogovor v Prejetem ne čaka več.
    db.inboxConversation.updateMany({ where: { issueId, status: "open" }, data: { status: "done" } }),
  ]);
  refreshAll(issue.key);
  revalidatePath("/inbox");
  return { ok: true };
}

/**
 * Skupinski zaključek uporablja enaka dovoljenja in enako varovalo za vračila
 * kot zaključek posameznega naročila. Celotna izbira se obdela v eni
 * transakciji, da ob napaki ne ostane napol zaključena.
 */
export async function bulkCloseIssues(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();

  if (!canClose(me)) {
    return { error: t(me.locale, "error.closeLevel", { level: MIN_CLOSE_LEVEL }) };
  }

  const ids = [...new Set(fd.getAll("issueId").map(Number))].filter(
    (id) => Number.isInteger(id) && id > 0,
  );
  if (ids.length === 0 || ids.length > 300) {
    return { error: t(me.locale, "error.bulkSelection") };
  }

  const result = await db.$transaction(async (tx) => {
    const issues = await tx.issue.findMany({
      where: { id: { in: ids } },
      include: { items: { select: { resolution: true } } },
    });

    if (issues.length !== ids.length) {
      return { error: t(me.locale, "error.orderMissing") } as const;
    }

    const openIssues = issues.filter((issue) => issue.status !== "closed");
    if (openIssues.some((issue) => issue.type === SYSTEM_TYPE)) {
      return { error: t(me.locale, "error.unsortedClose") } as const;
    }
    if (openIssues.some((issue) => hasPendingResolution(issue.items))) {
      return { error: t(me.locale, unresolvedMessage(openIssues.flatMap((issue) => issue.items))) } as const;
    }
    const returnTypes = await returnTypeSet();
    const needsReturn = openIssues.some((issue) => requiresReturnProof(issue.type, issue.items, returnTypes, issue.exchangeFault));
    if (needsReturn && fd.get("returnConfirmed") !== "on") {
      return { error: t(me.locale, "error.confirmReturn") } as const;
    }

    if (openIssues.length === 0) return { ok: true, count: 0 } as const;

    const now = new Date();
    await tx.issue.updateMany({
      where: { id: { in: openIssues.map((issue) => issue.id) }, status: { not: "closed" } },
      data: { status: "closed", closedAt: now, archivedAt: now, waitingUntil: null, waitingReplySince: null },
    });
    await tx.event.createMany({
      data: openIssues.map((issue) => ({
        issueId: issue.id,
        kind: "status",
        fromValue: issue.status,
        toValue: "closed",
        body: null,
        authorId: me.id,
        outsider: isOutsider(issue, me),
      })),
    });

    return { ok: true, count: openIssues.length } as const;
  });

  if ("error" in result) return result;
  revalidatePath("/orders");
  // Skupinski zaključek oceni urnik po nekaj naenkrat (Groq ima omejitev na minuto).
  return result;
}

// Brez export: datoteka z "use server" sme izvažati samo funkcije.
const BULK_OPS = ["wait", "resume", "claim", "assign", "priority", "type"] as const;
type BulkOp = (typeof BULK_OPS)[number];

const bulkIds = (fd: FormData) =>
  [...new Set(fd.getAll("issueId").map(Number))].filter((id) => Number.isInteger(id) && id > 0);

/**
 * Skupinsko dejanje nad izbranimi naročili — ena poteza namesto šestnajstih.
 *
 * Zaprta naročila izbor tiho izpusti: arhiv se odpira po enem, ne po pomoti v
 * kupu. Vsako naročilo dobi svoj vpis v dnevnik, ker se zgodovina bere s
 * ticketa in ne sme biti odvisna od tega, ali je bila poteza skupinska.
 */
export async function bulkUpdateIssues(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();

  const op = String(fd.get("op") ?? "") as BulkOp;
  if (!BULK_OPS.includes(op)) return { error: t(me.locale, "error.bulkOperation") };

  const ids = bulkIds(fd);
  if (ids.length === 0 || ids.length > 300) return { error: t(me.locale, "error.bulkSelection") };

  const issues = await db.issue.findMany({
    where: { id: { in: ids }, status: { not: "closed" } },
    select: {
      id: true, key: true, status: true, type: true, priority: true, level: true,
      orderNumber: true, customerEmail: true, assigneeId: true,
      assignee: { select: { name: true } },
      items: { select: { resolution: true } },
    },
  });
  if (issues.length === 0) return { ok: true, count: 0 };
  // Predaja kupa je predaja vsakega ticketa posebej — pravilo ostane isto.
  if (op === "assign" && issues.some((issue) => hasPendingResolution(issue.items))) {
    return { error: t(me.locale, unresolvedMessage(issues.flatMap((issue) => issue.items))) };
  }

  const note = str(fd, "note", 2000);
  const now = new Date();
  type Row = (typeof issues)[number];
  /** Naročila, ki jih je to dejanje pravkar prevzelo nase (glej op === "wait"). */
  const claimedIds = new Set<number>();
  const event = (
    issue: Row,
    data: { kind: string; field?: string; fromValue: string | null; toValue: string },
  ): Prisma.EventCreateManyInput => ({
    issueId: issue.id,
    authorId: me.id,
    // Naročilo, ki ga je to isto dejanje pravkar prevzelo, ni tuje.
    outsider: claimedIds.has(issue.id) ? false : isOutsider(issue, me),
    body: note,
    ...data,
  });

  let touched: Row[] = [];
  let events: Prisma.EventCreateManyInput[] = [];

  if (op === "wait") {
    // Isto pravilo kot pri posameznem naročilu: kdor uspava naročilo brez
    // prevzemnika, ga prevzame. Kup ne sme biti luknja v pravilu.
    const unowned = issues.filter((issue) => issue.assigneeId === null);
    for (const issue of unowned) claimedIds.add(issue.id);
    if (unowned.length) {
      await db.issue.updateMany({
        where: { id: { in: unowned.map((issue) => issue.id) } },
        data: { assigneeId: me.id, level: me.level },
      });
      await db.event.createMany({
        data: unowned.map((issue) => ({
          issueId: issue.id,
          kind: "assign",
          fromValue: levelCode(issue.level),
          toValue: `${me.name} · L${me.level}`,
          authorId: me.id,
          outsider: false,
        })),
      });
    }

    const until = date(fd, "waitingUntil");
    // Čakanje na odgovor velja samo tam, kjer je e-naslov — ostala naročila iz
    // istega izbora gredo na čakanje z datumom, ne v tiho luknjo brez budilke.
    const wantsReply = fd.get("waitForReply") !== null;
    const byReply = issues.filter((issue) => wantsReply && issue.customerEmail);
    const byDate = issues.filter((issue) => !(wantsReply && issue.customerEmail));

    for (const [group, replySince] of [[byReply, now], [byDate, null]] as const) {
      if (group.length === 0) continue;
      await db.issue.updateMany({
        where: { id: { in: group.map((issue) => issue.id) } },
        data: {
          status: "waiting",
          waitingUntil: until,
          waitingReplySince: replySince,
          closedAt: null,
          archivedAt: null,
        },
      });
    }
    touched = issues;
    events = issues.map((issue) =>
      event(issue, { kind: "status", fromValue: issue.status, toValue: "waiting" }),
    );
  } else if (op === "resume") {
    touched = issues.filter((issue) => issue.status === "waiting" || issue.status === "manual");
    if (touched.length) {
      await db.issue.updateMany({
        where: { id: { in: touched.map((issue) => issue.id) } },
        data: { status: "open", waitingUntil: null, waitingReplySince: null },
      });
    }
    events = touched.map((issue) =>
      event(issue, { kind: "status", fromValue: issue.status, toValue: "open" }),
    );
  } else if (op === "claim" || op === "assign") {
    const target =
      op === "claim"
        ? { id: me.id, name: me.name, level: me.level }
        : await db.user.findFirst({
            where: { id: str(fd, "toUserId") ?? "", active: true },
            select: { id: true, name: true, level: true },
          });
    if (!target) return { error: t(me.locale, "error.userUnavailable") };

    touched = issues.filter((issue) => issue.assigneeId !== target.id);
    if (touched.length) {
      // Status ostane, kakršen je: prevzem kupa ne sme na tihem zbuditi
      // naročil, ki nekaj čakajo — za to je svoj gumb.
      await db.issue.updateMany({
        where: { id: { in: touched.map((issue) => issue.id) } },
        data: { assigneeId: target.id, level: target.level },
      });
    }
    events = touched.map((issue) =>
      event(issue, {
        kind: "assign",
        fromValue: issue.assignee?.name ?? null,
        toValue: `${target.name} · L${target.level}`,
      }),
    );
    // Pošta bi bila za kup šestnajstih naročil šestnajst mailov, zato ostane
    // obvestilo samo v aplikaciji — tam je vsako naročilo svoja vrstica.
    if (op === "assign") {
      for (const issue of touched) {
        await notify({
          kind: "handoff",
          recipientId: target.id,
          issueId: issue.id,
          issueKey: issue.key,
          orderNumber: issue.orderNumber,
          actorName: me.name,
          preview: note,
          inAppOnly: true,
        });
      }
    }
  } else {
    const catalog = await loadConfig(me.locale);
    const value = str(fd, "value", 40);
    const options = op === "type" ? assignableTypes(catalog.types) : visible(catalog.priorities);
    if (!value || !options.some((option) => option.key === value)) {
      return { error: t(me.locale, "error.bulkValue") };
    }

    touched = issues.filter((issue) => issue[op] !== value);
    if (touched.length) {
      await db.issue.updateMany({
        where: { id: { in: touched.map((issue) => issue.id) } },
        data: op === "type" ? { type: value } : { priority: value },
      });
    }
    events = touched.map((issue) =>
      event(issue, { kind: "field", field: op, fromValue: issue[op], toValue: value }),
    );
  }

  if (events.length) await db.event.createMany({ data: events });

  revalidatePath("/orders");
  for (const issue of touched) revalidatePath(`/orders/${issue.key}`);
  return { ok: true, count: touched.length };
}

/** Trajni izbris je dovoljen samo administratorju in samo iz arhiva. */
export async function deleteIssue(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdminStrict();
  const id = intId(fd);
  if (!id) return { error: t(me.locale, "error.invalidOrder") };

  const result = await db.$transaction(async (tx) => {
    const issue = await tx.issue.findUnique({
      where: { id },
      select: {
        status: true,
        attachments: { select: { storedName: true } },
      },
    });

    if (!issue) return { error: t(me.locale, "error.orderMissing") } as const;
    if (issue.status !== "closed") {
      return { error: t(me.locale, "error.deleteArchivedOnly") } as const;
    }

    // Pogoj ponovimo v samem DELETE, da sočasno ponovno odprtje naročila
    // prepreči izbris tudi po začetnem preverjanju.
    const deleted = await tx.issue.deleteMany({ where: { id, status: "closed" } });
    if (deleted.count !== 1) {
      return { error: t(me.locale, "error.deleteArchivedOnly") } as const;
    }

    return { storedNames: issue.attachments.map((attachment) => attachment.storedName) } as const;
  });

  if ("error" in result) return result;

  const failed = await deleteStoredAttachments(result.storedNames);
  if (failed.length > 0) {
    console.error("Failed to remove attachment files for deleted order", { issueId: id, failed });
  }

  revalidatePath("/orders");
  redirect("/orders?view=archive");
}

// --- urejanje polj ---------------------------------------------------------

const EDITABLE = [
  "orderNumber",
  "title",
  "type",
  "priority",
  "customerName",
  "customerEmail",
  "customerPhone",
  "customerAddress",
  "customerCountryCode",
  "amount",
  "currency",
  "returnTracking",
  "replacementTracking",
  "orderPlacedAt",
] as const;

export async function updateIssue(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const id = intId(fd);
  if (!id) return { error: t(me.locale, "error.invalidOrder") };

  const issue = await db.issue.findUnique({
    where: { id },
    include: { shipgAllocations: { where: { status: { in: ["reserved", "dispatching"] } }, select: { id: true } } },
  });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };

  const catalog = await loadConfig(me.locale);
  const data: Record<string, unknown> = {};
  const changes: { field: string; from: string | null; to: string | null }[] = [];

  for (const field of EDITABLE) {
    if (!fd.has(field)) continue;

    let value: unknown;
    if (field === "amount") value = num(fd, field);
    // Prazna ali pokvarjena valuta ne sme izbrisati tiste, ki je že vpisana.
    else if (field === "currency") {
      const code = normalizeCurrency(str(fd, "currency", 3));
      if (!code) continue;
      value = code;
    }
    else if (field === "orderPlacedAt") value = date(fd, field);
    else if (field === "customerCountryCode") value = countryCode(fd, field);
    else value = str(fd, field, field === "customerAddress" ? 300 : 200);

    if (field === "type" && (!value || !assignableTypes(catalog.types).some((it) => it.key === value))) continue;
    if (field === "priority" && value && !visible(catalog.priorities).some((p) => p.key === value)) continue;
    if (field === "orderNumber") {
      if (!value) return { error: t(me.locale, "error.orderRequired") };
      if (!/^[A-Za-z0-9#\-_. ]{1,40}$/.test(String(value))) {
        return { error: t(me.locale, "error.orderCharacters") };
      }
      const display = String(value).replace(/^#/, "").trim();
      const normalized = orderNumberKey(display);
      const duplicate = await db.issue.findFirst({
        where: { id: { not: id }, orderNumberKey: normalized },
        select: { key: true },
      });
      if (duplicate) return { error: t(me.locale, "error.orderDuplicateEdit") };
      value = display;
      data.orderNumberKey = normalized;
    }

    const current = (issue as Record<string, unknown>)[field] ?? null;
    const currentStr =
      current instanceof Date ? current.toISOString() : current == null ? null : String(current);
    const nextStr = value instanceof Date ? value.toISOString() : value == null ? null : String(value);
    if (currentStr === nextStr) continue;

    data[field] = value;
    changes.push({ field, from: currentStr, to: nextStr });
  }

  if (changes.length === 0) return { ok: true };
  if (data.customerCountryCode && !isShipgermanMarket(String(data.customerCountryCode)) && issue.shipgAllocations.length) {
    return { error: t(me.locale, "shipg.exchange.feedback.lockedCountry") };
  }

  try {
    await db.issue.update({ where: { id }, data });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: t(me.locale, "error.orderDuplicateEdit") };
    }
    throw error;
  }

  if (data.replacementTracking) {
    await db.shipgAllocation.updateMany({
      where: { exchangeIssueId: id, status: { in: ["reserved", "dispatching"] } },
      data: { status: "shipped" },
    });
  }

  const outsider = isOutsider(issue, me);
  for (const c of changes) {
    await db.event.create({
      data: {
        issueId: id,
        kind: "field",
        field: c.field,
        fromValue: c.from,
        toValue: c.to,
        authorId: me.id,
        outsider,
      },
    });
  }

  refreshAll(issue.key);
  return { ok: true };
}

/**
 * Shrani SAMO kodo države iz Shopify auto-filla — ločeno od updateIssue in brez
 * oddaje celega obrazca. Oddaja celega obrazca po fillu je motila vpis drugih
 * polj (npr. e-maila), tu pa gre za neposreden, ciljni zapis, da se ShipGerman
 * kartica za menjavo takoj osveži.
 */
/**
 * Stanje naročila pri Shopifyju iz obrazca. Sprejmemo samo vrednosti, ki jih
 * poznamo — polje je skrito in ga zato ni mogoče "vpisati", lahko pa se
 * Shopifyjev šifrant kdaj razširi in tega ne bomo shranili kot smeti.
 */
function shopifyStatusFrom(fd: FormData) {
  const financial = str(fd, "shopifyFinancial", 40);
  const fulfillment = str(fd, "shopifyFulfillment", 40);
  if (!isKnownFinancial(financial) && !isKnownFulfillment(fulfillment)) return {};
  return {
    shopifyFinancial: isKnownFinancial(financial) ? financial : null,
    shopifyFulfillment: isKnownFulfillment(fulfillment) ? fulfillment : null,
    shopifyStatusAt: new Date(),
  };
}

/** Isto, a s ticketa: auto-fill pove, kaj je pri Shopifyju prav zdaj. */
export async function saveOrderStatus(
  issueId: number,
  financial: string | null,
  fulfillment: string | null,
): Promise<void> {
  await requireUserStrict();
  if (!isKnownFinancial(financial) && !isKnownFulfillment(fulfillment)) return;

  const issue = await db.issue.findUnique({ where: { id: issueId }, select: { key: true } });
  if (!issue) return;

  await db.issue.update({
    where: { id: issueId },
    data: {
      shopifyFinancial: isKnownFinancial(financial) ? financial : null,
      shopifyFulfillment: isKnownFulfillment(fulfillment) ? fulfillment : null,
      shopifyStatusAt: new Date(),
    },
  });
  refreshAll(issue.key);
}

export async function saveOrderCountry(issueId: number, countryCodeRaw: string): Promise<void> {
  await requireUserStrict();
  const code = countryCodeRaw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return;

  const issue = await db.issue.findUnique({
    where: { id: issueId },
    select: {
      key: true,
      customerCountryCode: true,
      shipgAllocations: { where: { status: { in: ["reserved", "dispatching"] } }, select: { id: true } },
    },
  });
  if (!issue || issue.customerCountryCode === code) return;
  // Rezervirane menjave ne prestavimo v državo, kamor ShipGerman ne dostavlja.
  if (!isShipgermanMarket(code) && issue.shipgAllocations.length) return;

  await db.issue.update({ where: { id: issueId }, data: { customerCountryCode: code } });
  refreshAll(issue.key);
}

// --- artikli ---------------------------------------------------------------

/**
 * Shrani celoten seznam postavk naročila. Urejevalnik vedno pošlje vse
 * vrstice, zato jih zamenjamo v celoti — s tem odpade usklajevanje po id-jih,
 * ki bi ga bilo treba varovati pred podtaknjenimi tujimi id-ji.
 */
export async function saveItems(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUserStrict();
  const id = intId(fd);
  if (!id) return { error: t(me.locale, "error.invalidOrder") };
  if (!hasItemsSection(fd)) return { ok: true };

  const issue = await db.issue.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: "asc" } },
      shipgAllocations: { select: { status: true, exchangeRound: true } },
    },
  });
  if (!issue) return { error: t(me.locale, "error.orderMissing") };

  const next = parseItems(fd);
  const label = resolutionLabel(me.locale);
  const before = summarizeItems(issue.items, label);
  const after = summarizeItems(next, label);
  // Primerjamo po odtisu, ne po povzetku: povzetek je za branje in ne nosi
  // vsega, kar se shrani.
  if (itemsFingerprint(issue.items) === itemsFingerprint(next)) return { ok: true };
  const round = issue.shipgAllocations.filter((allocation) => allocation.exchangeRound === issue.exchangeRound);
  if (round.some((allocation) => allocation.status !== "shipped")) {
    return { error: t(me.locale, "shipg.exchange.feedback.lockedItems") };
  }
  // Nadomestek tega kroga je odšel: kaj je stranka dobila, je zgodovina. Nova
  // želja stranke je nov krog, ne popravek starega.
  if (round.length > 0 && exchangeChanged(issue.items, next)) {
    return { error: t(me.locale, "round.error.itemsShipped") };
  }

  // Napačno poslan kos je dejstvo o skladišču, ne le urejanje seznama: zapiše
  // se kot lasten dogodek, da je v niti razvidno, kdo ga je označil.
  const wrongKey = (item: { orderedName: string | null; orderedVariant: string | null; name: string; variant: string | null }) =>
    [item.orderedName, item.orderedVariant, item.name, item.variant].join("");
  const lineLabel = (name: string | null, variant: string | null) => [name, variant].filter(Boolean).join(" ");
  const wasWrong = new Set(issue.items.filter((item) => item.wrongItemSent).map(wrongKey));
  const isWrong = new Set(next.filter((item) => item.wrongItemSent).map(wrongKey));
  const wrongEvents = [
    ...next
      .filter((item) => item.wrongItemSent && !wasWrong.has(wrongKey(item)))
      .map((item) => ({ fromValue: lineLabel(item.orderedName, item.orderedVariant), toValue: lineLabel(item.name, item.variant) })),
    ...issue.items
      .filter((item) => item.wrongItemSent && !isWrong.has(wrongKey(item)))
      .map((item) => ({ fromValue: lineLabel(item.orderedName, item.orderedVariant), toValue: null })),
  ];

  await db.$transaction([
    db.issueItem.deleteMany({ where: { issueId: id } }),
    ...(next.length > 0
      ? [db.issueItem.createMany({ data: next.map((item) => ({ ...item, issueId: id })) })]
      : []),
    db.event.create({
      data: {
        issueId: id,
        kind: "field",
        field: "items",
        fromValue: before,
        toValue: after,
        authorId: me.id,
        outsider: isOutsider(issue, me),
      },
    }),
    ...wrongEvents.map((event) =>
      db.event.create({
        data: { issueId: id, kind: "field", field: "wrongItem", ...event, authorId: me.id, outsider: isOutsider(issue, me) },
      }),
    ),
    db.issue.update({ where: { id }, data: { updatedAt: new Date() } }),
  ]);

  // Vračilo, ki je že vpisano, a še ni preverjeno, pričakuje kos iz postavke.
  // Ko se izkaže, da je stranka dobila drug kos, mora ShipG pričakovati tega —
  // sicer bi v zalogo vpisali velikost, ki je v paketu ni.
  // Najprej razveljavimo odstranjene oznake, nato uveljavimo nove — popravek
  // prejetega kosa (3XL ženske → 3XL moške) je oboje v enem shranjevanju.
  const swaps = [
    ...issue.items
      .filter((item) => item.wrongItemSent && !isWrong.has(wrongKey(item)))
      .map((item) => ({ from: [item.name, item.variant] as const, to: [item.orderedName!, item.orderedVariant] as const })),
    ...next
      .filter((item) => item.wrongItemSent && !wasWrong.has(wrongKey(item)))
      .map((item) => ({ from: [item.orderedName!, item.orderedVariant] as const, to: [item.name, item.variant] as const })),
  ];
  if (swaps.length) await swapExpectedReturnItems(id, issue.exchangeRound, swaps);

  // "Še ne vemo" na ticketu, ki ga nihče nima (sistemska vrsta ali vrsta
  // nivoja): kdor se je odločil počakati stranko, ga vzame nase — sicer bi
  // obvisel v vrsti, ne da bi kdo čakal na odgovor.
  const newlyUndecided = next.filter((item) => item.resolution === UNDECIDED_RESOLUTION).length >
    issue.items.filter((item) => item.resolution === UNDECIDED_RESOLUTION).length;
  if (newlyUndecided && issue.status !== "closed") {
    await claimUnowned({ id, assigneeId: issue.assigneeId, level: issue.level }, me);
  }

  refreshAll(issue.key);
  return { ok: true };
}
