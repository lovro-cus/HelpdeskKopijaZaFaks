import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Link2, MailWarning, Truck, Warehouse } from "lucide-react";

import { ActionBar } from "@/components/ActionBar";
import { DeliveryCheck } from "@/components/DeliveryCheck";
import { BackButton } from "@/components/BackButton";
import { Composer } from "@/components/Composer";
import { CustomerEmailDraftCard } from "@/components/CustomerEmailDraft";
import { DetailsCard } from "@/components/DetailsCard";
import { ItemsCard } from "@/components/ItemsCard";
import { AnotherReturn } from "@/components/AnotherReturn";
import { ExchangeRoundsCard } from "@/components/ExchangeRoundsCard";
import { ensureCatalog } from "@/lib/catalog-server";
import { ShipGermanExchangeCard } from "@/components/ShipGermanExchangeCard";
import { ShipgMergePanel } from "@/components/ShipgMergePanel";
import { linkShippedStockToIssue } from "@/lib/actions/shipg";
import { canonicalLabel } from "@/lib/catalog-canonical";
import { IssueParcelLink } from "@/components/IssueParcelLink";
import { ParcelsCard } from "@/components/ParcelsCard";
import { Thread } from "@/components/Thread";
import { TitleEditor } from "@/components/TitleEditor";
import { MarkIssueRead } from "@/components/MarkIssueRead";
import { EmailConversation } from "@/components/EmailConversation";
import { SatisfactionCard } from "@/components/SatisfactionCard";
import { SatisfactionPending } from "@/components/SatisfactionPending";
import { canThankCustomer, satisfactionCloseKey } from "@/lib/satisfaction-mail";
import { can } from "@/lib/permissions";
import { TypeEditor } from "@/components/TypeEditor";
import { LevelPill, PriorityDot, StatusPill } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

import { loadConfig, loadSettings } from "@/lib/config/server";
import { emailCountOf, issueFilterParams, issueWhere, readIssueFilter, sortIssues } from "@/lib/issue-filter";
import { RAIL_COOKIE, TicketRail } from "@/components/TicketRail";
import { labelOf } from "@/lib/config/shared";
import { canAccessShipg, canClose, entryStance } from "@/lib/domain";
import { replyCue } from "@/lib/reply-cue";
import { StarButton } from "@/components/StarButton";
import { aiConfigured } from "@/lib/groq";
import { translationConfigured } from "@/lib/translation";
import { shopifyConfigured } from "@/lib/shopify";
import { daysOpen, formatDateTime, formatWeightKg } from "@/lib/format";
import { t } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Koliko naročil iz kupa gre v trak. Dovolj za dan dela, premalo za seznam. */
const RAIL_LIMIT = 60;

function one(sp: Record<string, string | string[] | undefined>, key: string) {
  const value = sp[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: SP }) {
  const me = await requireUser();
  const { key } = await params;
  const sp = await searchParams;
  const shipgAllocation = one(sp, "shipgAllocation");
  const draft = one(sp, "draft");

  // Izbira jezika pisma in kartice zaloge berejo šifrant jezikov in katalog.
  await ensureCatalog();
  const issue = await db.issue.findUnique({
    where: { key: decodeURIComponent(key).slice(0, 40) },
    include: {
      assignee: { select: { id: true, name: true, color: true, level: true } },
      reporter: { select: { name: true } },
      items: { orderBy: { position: "asc" } },
      parcels: { orderBy: { createdAt: "asc" } },
      shipgReturns: { select: { id: true }, take: 1 },
      satisfaction: { include: { reviewedBy: { select: { name: true } } } },
      events: {
        // Dva zapisa v isti milisekundi (prevzem + opomba) mora ločiti id,
        // sicer se lahko v niti obrneta.
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          author: { select: { name: true, color: true, level: true, isAdmin: true } },
          attachments: { select: { id: true, filename: true, mime: true, size: true } },
          revisions: { orderBy: { id: "asc" }, select: { id: true, body: true, writtenAt: true } },
        },
      },
    },
  });

  if (!issue) notFound();
  const thankYou = issue.closedAt && can(me, "satisfaction")
    ? await db.customerEmailDraft.findUnique({ where: { satisfactionCloseKey: satisfactionCloseKey(issue.id, issue.closedAt) }, select: { status: true } })
    : null;
  const shopifyHref = shopifyConfigured() ? `/api/shopify/order/${encodeURIComponent(issue.orderNumber)}` : null;

  // Kup, iz katerega je ticket odprt: isti pogled, filter in vrstni red kot v
  // seznamu (filter potuje v naslovu). Trak ob strani in puščici zgoraj berejo
  // isti seznam — dve navigaciji, ki bi vsaka kazala svoj vrstni red, bi bili
  // hujši od nobene.
  const filter = readIssueFilter(sp);
  const [{ types, priorities }, settings] = await Promise.all([loadConfig(me.locale), loadSettings()]);
  // Ticket, ki ga je znova odprl mail po zaključku in ga od takrat nihče ni
  // spremenil: pri tem dogodku ponudimo »OK, ponovno zapri«.
  const lastStatusEvent = issue.events.findLast((event) => event.kind === "status");
  const recloseEventId = issue.status === "open" && canClose(me) && lastStatusEvent?.field === "reply_after_close" ? lastStatusEvent.id : null;
  // Ikona v glavi: isto pravilo kot na seznamu (reply-cue) — do prvega človeškega dejanja.
  const lastReopen = issue.events.findLast((event) => event.field === "reply_after_close");
  const lastHuman = issue.events.findLast((event) => event.author);
  const reopenCue = replyCue(issue.status, lastReopen?.createdAt, lastHuman?.createdAt);
  const starred = Boolean(await db.issueStar.findUnique({ where: { userId_issueId: { userId: me.id, issueId: issue.id } }, select: { userId: true } }));

  const [users, pile, railOpen] = await Promise.all([
    db.user.findMany({
      where: { active: true },
      orderBy: [{ level: "asc" }, { name: "asc" }],
      select: { id: true, name: true, level: true, color: true },
    }),
    db.issue.findMany({
      where: issueWhere(filter, me, types, priorities),
      orderBy: { createdAt: "desc" },
      take: RAIL_LIMIT,
      select: {
        key: true,
        orderNumber: true,
        type: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        assignee: { select: { name: true, color: true } },
        inboxConversations: { select: { messageCount: true } },
      },
    }),
    cookies().then((jar) => jar.get(RAIL_COOKIE)?.value !== "0"),
  ]);

  // Trak mora biti v istem vrstnem redu kot seznam, tudi pri razvrščanju po mailih.
  const countedPile = pile.map(({ inboxConversations, ...row }) => ({ ...row, emailCount: emailCountOf(inboxConversations) }));
  const sortedPile = sortIssues(countedPile, filter.sort, types, priorities);
  const at = sortedPile.findIndex((row) => row.key === issue.key);
  // "Prejšnje" (‹) je tisto nad trenutnim v seznamu, "naslednje" (›) pod njim.
  const previousIssue = at > 0 ? sortedPile[at - 1] : null;
  const nextIssue = at >= 0 && at < sortedPile.length - 1 ? sortedPile[at + 1] : null;
  const pileQuery = issueFilterParams(filter).toString();
  const pileHref = (target: string) => `/orders/${target}${pileQuery ? `?${pileQuery}` : ""}`;

  // Že ročno vpisana ShipGerman zaloga za to naročilo (prek "Dodaj staro
  // naročilo"), ki še ni vezana na noben issue in ni rezervirana — kandidat, da
  // jo že ob odprtju ticketa povežemo, namesto da nastane podvojen zapis.
  const shipgStock = canAccessShipg(me)
    ? await db.shipgReturn.findMany({
        where: { issueId: null, orderNumber: issue.orderNumber, shipgermanParcelId: { not: null }, allocation: { is: null } },
        orderBy: { stockedAt: "desc" },
        select: {
          id: true,
          shipgermanParcelId: true,
          trackingNumber: true,
          customerName: true,
          stockedAt: true,
          items: { orderBy: { position: "asc" }, select: { name: true, variant: true, expectedQty: true, receivedQty: true } },
        },
      })
    : [];
  // Zapisi istega naročila brez ticketa, katerih paket je že odšel (rezerviran
  // ali odposlan drugi stranki). Združiti jih ni mogoče, pripeti kot zgodovino pa.
  const shippedStock = canAccessShipg(me)
    ? await db.shipgReturn.findMany({
        where: { issueId: null, orderNumber: issue.orderNumber, OR: [{ status: "shipped" }, { allocation: { isNot: null } }] },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          shipgermanParcelId: true,
          customerName: true,
          items: { orderBy: { position: "asc" }, select: { name: true, variant: true, expectedQty: true, receivedQty: true } },
          allocation: {
            select: {
              exchangeIssue: { select: { orderNumber: true } },
              outboundOrder: { select: { orderNumber: true } },
            },
          },
        },
      })
    : [];

  // Teža fizičnih paketov (na ShipGermanCachedParcel, vezano po shipgermanParcelId).
  const shipgWeights = shipgStock.length
    ? new Map((await db.shipGermanCachedParcel.findMany({
        where: { id: { in: shipgStock.flatMap((r) => (r.shipgermanParcelId ? [r.shipgermanParcelId] : [])) } },
        select: { id: true, weightGrams: true },
      })).map((p) => [p.id, p.weightGrams] as const))
    : new Map<string, number>();
  const shipgStockRecords = shipgStock.map((record) => ({
    id: record.id,
    shipgermanParcelId: record.shipgermanParcelId,
    trackingNumber: record.trackingNumber,
    customerName: record.customerName,
    stockedAtLabel: record.stockedAt ? formatDateTime(record.stockedAt, me.locale) : null,
    weightLabel: record.shipgermanParcelId ? formatWeightKg(shipgWeights.get(record.shipgermanParcelId), me.locale) : null,
    items: record.items,
  }));

  const fallbackTitle = `${labelOf(types, issue.type)} — ${t(me.locale, "issue.order")} #${issue.orderNumber}`;
  const isMine = issue.assignee?.id === me.id;
  const stance = entryStance(issue, me);
  const itemsKey = issue.items
    .map((i) => `${i.id}:${i.name}:${i.variant}:${i.replacementVariant}:${i.replacementName}:${i.priceDiffSettled}:${i.wrongItemSent}:${i.orderedName}:${i.orderedVariant}:${i.qty}:${i.amount}:${i.resolution}`)
    .join("|");

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 xl:max-w-[1540px]">
      <MarkIssueRead issueId={issue.id} />
      <div className="mb-3 flex items-center justify-between gap-3">
        <BackButton fallback="/orders" label={t(me.locale, "issue.back")} />
        <nav className="flex items-center gap-1" aria-label={t(me.locale, "issue.orderNavigation")}>
          {previousIssue ? (
            <Link
              href={pileHref(previousIssue.key)}
              className="btn btn-sm px-2"
              title={t(me.locale, "issue.previousOrderTitle", { order: previousIssue.orderNumber })}
              aria-label={t(me.locale, "issue.previousOrder")}
            >
              <ChevronLeft size={15} />
            </Link>
          ) : (
            <span className="btn btn-sm px-2 opacity-40" aria-disabled="true" aria-label={t(me.locale, "issue.previousOrder")}>
              <ChevronLeft size={15} />
            </span>
          )}
          {nextIssue ? (
            <Link
              href={pileHref(nextIssue.key)}
              className="btn btn-sm px-2"
              title={t(me.locale, "issue.nextOrderTitle", { order: nextIssue.orderNumber })}
              aria-label={t(me.locale, "issue.nextOrder")}
            >
              <ChevronRight size={15} />
            </Link>
          ) : (
            <span className="btn btn-sm px-2 opacity-40" aria-disabled="true" aria-label={t(me.locale, "issue.nextOrder")}>
              <ChevronRight size={15} />
            </span>
          )}
        </nav>
      </div>

      {/* Glava zapisa: številka naročila je naslov dokumenta, ne postavka v njem. */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <h2 className="mono text-[26px] font-semibold leading-none tracking-[-0.025em]">
          {issue.orderNumber}
        </h2>
        <StarButton issueId={issue.id} starred={starred} size={18} className="h-[28px] w-[28px]" />
        {reopenCue && (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: "var(--stamp)" }}>
            <MailWarning size={16} strokeWidth={2.25} aria-hidden />{t(me.locale, "issue.reopenCue")}
          </span>
        )}
        <span className="mono text-[12px] text-label-2">{issue.key}</span>
        <TypeEditor issueId={issue.id} type={issue.type} />
        <StatusPill status={issue.status} waitingUntil={issue.waitingUntil} waitingReply={Boolean(issue.waitingReplySince)} />
        <LevelPill level={issue.level} muted={issue.status === "closed"} />
        <PriorityDot priority={issue.priority} withLabel />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12px] text-label-2">
            {issue.closedAt ? t(me.locale, "issue.archived") : t(me.locale, "issue.openDays", { days: daysOpen(issue.createdAt) })}
          </span>
        </div>
      </div>

      <div className="mt-2">
        <TitleEditor issueId={issue.id} title={issue.title} fallback={fallbackTitle} />
      </div>

      {/* Dejanja glave v dveh imenovanih skupinah: kar se tiče stranke in kar
          se tiče skladišča. Brez imena sta bili dve vrstici enakih gumbov, ki
          se nista brali kot nič. */}
      {(issue.customerEmail || canAccessShipg(me)) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2.5">
          {issue.customerEmail && (
            <div role="group" aria-label={t(me.locale, "issue.head.customer")} className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="caption" style={{ color: "var(--ink-2)" }}>{t(me.locale, "issue.head.customer")}</span>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <a
                  href={`mailto:${issue.customerEmail}`}
                  className="mono mr-1.5 min-w-0 truncate text-[12px] underline-offset-2 hover:underline"
                  style={{ color: "var(--ink-2)" }}
                >
                  {issue.customerEmail}
                </a>
                {/* Pošta: nit in pisanje odgovora v enem oknu, da se med pisanjem
                    vidi, kaj je stranka napisala. Pisati sme, kdor sme pošiljati. */}
                <EmailConversation
                  issueKey={issue.key}
                  customerEmail={issue.customerEmail}
                  label={t(me.locale, "email.mail")}
                  compose={canAccessShipg(me) ? {
                    issueId: issue.id,
                    hasExchange: issue.items.some((item) => item.resolution === "exchange"),
                    aiEnabled: aiConfigured(),
                    translateEnabled: translationConfigured(),
                    account: "podpora@kroj.example",
                  } : undefined}
                />
              </div>
            </div>
          )}

          {canAccessShipg(me) && (
            <div
              role="group"
              aria-label={t(me.locale, "issue.head.warehouse")}
              className={`flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 ${issue.customerEmail ? "lg:border-l lg:pl-5" : ""}`}
              style={{ borderColor: "var(--rule-strong)" }}
            >
              <span className="caption" style={{ color: "var(--ink-2)" }}>{t(me.locale, "issue.head.warehouse")}</span>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {issue.shipgReturns.length > 0 && (
                  <Link href={`/shipg?q=${encodeURIComponent(issue.orderNumber)}`} className="btn btn-sm">
                    <Warehouse size={14} />
                    {t(me.locale, "shipg.viewOrderReturns")}
                  </Link>
                )}
                {/* Paket je že v ShipGermanu: povezava sama vpiše vračilo, če ga še ni. */}
                <IssueParcelLink issue={issue} locale={me.locale} label={t(me.locale, "issueLink.button")} />
                {issue.shipgReturns.length > 0 && (
                  <AnotherReturn issue={issue} locale={me.locale} label={t(me.locale, "round.returnShort")} />
                )}
                {shipgStockRecords.length === 0 && shippedStock.length === 0 && issue.shipgReturns.length === 0 &&
                  !issue.items.some((item) => item.resolution === "refund" || item.resolution === "exchange") && (
                  <span className="ml-1 text-[12px]" style={{ color: "var(--ink-2)" }}>{t(me.locale, "issueLink.needsReturnItem")}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Črta pod glavo: od tu naprej je zapis. */}
      <div className="mt-3.5 h-px w-full" style={{ background: "var(--rule-ink)" }} />

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_312px] xl:grid-cols-[minmax(0,1fr)_312px_auto]">
        <div className="min-w-0">
          {/* Ocena zadovoljstva je interna in pride šele po zaključku. */}
          {/* Pravkar zaprt ticket: ocena je v teku, stran počaka nanjo. */}
          {issue.status === "closed" && issue.closedAt && aiConfigured() &&
            Date.now() - issue.closedAt.getTime() < 5 * 60_000 &&
            issue.satisfaction?.forClosedAt.getTime() !== issue.closedAt.getTime() && <SatisfactionPending />}
          {issue.satisfaction?.status === "scored" && issue.satisfaction.score !== null && (
            <SatisfactionCard
              issueId={issue.id}
              below={settings.satisfactionReviewBelow}
              canReview={can(me, "satisfaction")}
              canThank={canThankCustomer(issue)}
              thankYouStatus={thankYou?.status ?? null}
              value={{
                score: issue.satisfaction.score,
                reason: issue.satisfaction.reason,
                reviewedAt: issue.satisfaction.reviewedAt,
                reviewer: issue.satisfaction.reviewedBy?.name ?? null,
              }}
            />
          )}
          <DeliveryCheck issueId={issue.id} />
          {issue.deliveryFailedAt && (
            <div role="alert" className="mb-4 border px-4 py-3" style={{ borderColor: "var(--stamp)", background: "var(--stamp-wash)" }}>
              <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--stamp)" }}>
                <AlertTriangle size={15} aria-hidden />{t(me.locale, "delivery.failedTitle")}
              </p>
              <p className="mt-1 text-[12.5px]">
                {t(me.locale, "delivery.failedOn", { date: formatDateTime(issue.deliveryFailedAt, me.locale === "sl" ? "sl-SI" : "en-GB") })}
                {issue.deliveryFailedTracking && <> · <span className="mono">{issue.deliveryFailedTracking}</span></>}
              </p>
              <p className="mt-0.5 text-[12px] text-label-2">{t(me.locale, "delivery.hint")}</p>
            </div>
          )}
          <ActionBar issue={issue} me={me} users={users} />

          {shippedStock.length > 0 && (
            <section className="card mt-4 overflow-hidden">
              <div className="border-b px-4 py-3" style={{ borderColor: "var(--separator)" }}>
                <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                  <Truck size={15} className="text-accent" strokeWidth={1.8} aria-hidden />
                  {t(me.locale, "shipg.shippedStock.title")}
                </h2>
                <p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed text-label-2">{t(me.locale, "shipg.shippedStock.subtitle")}</p>
              </div>
              {shippedStock.map((record) => {
                const target = record.allocation?.exchangeIssue?.orderNumber ?? record.allocation?.outboundOrder?.orderNumber;
                return (
                  <form key={record.id} action={linkShippedStockToIssue} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 [&+form]:border-t" style={{ borderColor: "var(--separator)" }}>
                    <input type="hidden" name="shipgReturnId" value={record.id} />
                    <input type="hidden" name="issueId" value={issue.id} />
                    <div className="min-w-0 text-[12.5px]">
                      <p className="font-medium">
                        {record.shipgermanParcelId ? `ShipGerman ${record.shipgermanParcelId}` : `#${record.id}`}
                        {record.customerName && <span className="text-label-2"> · {record.customerName}</span>}
                        {target && (
                          <span className="text-label-2">
                            {" · "}{t(me.locale, "shipg.shippedStock.sentTo", { order: target })}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-label-2">
                        {record.items.map((item) => `${item.receivedQty || item.expectedQty}× ${canonicalLabel(item.name, item.variant)}`).join(", ")}
                      </p>
                    </div>
                    <button type="submit" className="btn btn-sm">
                      <Link2 size={13} aria-hidden />
                      {t(me.locale, "shipg.shippedStock.action")}
                    </button>
                  </form>
                );
              })}
            </section>
          )}

          {canAccessShipg(me) && shipgStockRecords.length > 0 && (
            <div className="mt-4">
              <ShipgMergePanel
                issue={{ id: issue.id, orderNumber: issue.orderNumber, items: issue.items }}
                records={shipgStockRecords}
                locale={me.locale}
              />
            </div>
          )}

          <div className="mt-4">
            {/* Ključ poskrbi, da urejevalnik dobi sveže vrstice, kadar postavke
                spremeni nekdo drug — med tipkanjem pa ostane pri miru. */}
            <ItemsCard
              key={itemsKey}
              issueId={issue.id}
              items={issue.items}
              currency={issue.currency}
            />
          </div>

          {(issue.exchangeRound > 1 || issue.items.some((item) => item.resolution === "exchange")) && (
            <div className="mt-4">
              <ExchangeRoundsCard issue={issue} locale={me.locale} canShipg={canAccessShipg(me)} />
            </div>
          )}

          {canAccessShipg(me) && issue.items.some((item) => item.resolution === "exchange") && (
            <div className="mt-4">
              <ShipGermanExchangeCard issue={issue} locale={me.locale} feedback={shipgAllocation} />
            </div>
          )}

          {/* Pismo stranki stoji takoj za odpremo menjave — nastane iz nje in
              je naslednji korak istega opravila. */}
          {canAccessShipg(me) && (
            <div className="mt-4">
              <CustomerEmailDraftCard
                issueId={issue.id}
                customerEmail={issue.customerEmail}
                hasExchange={issue.items.some((item) => item.resolution === "exchange")}
                locale={me.locale}
                feedback={draft}
              />
            </div>
          )}

          <div className="mt-4">
            <ParcelsCard issueId={issue.id} parcels={issue.parcels} />
          </div>

          <div className="mt-5">
            <Thread events={issue.events} issueId={issue.id} recloseEventId={recloseEventId} meId={me.id} />
          </div>

          <div className="mt-2">
            <Composer issueId={issue.id} me={me} stance={stance} />
          </div>
        </div>

        <div className="lg:sticky lg:top-[64px] lg:self-start">
          <DetailsCard issue={issue} shopifyHref={shopifyHref} />
        </div>

        {/* Trak ima smisel šele, kadar je zanj prostor: pod xl bi vzel širino
            zapisu, ki je pomembnejši. */}
        <div className="hidden xl:block xl:sticky xl:top-[64px] xl:self-start">
          <TicketRail
            issues={sortedPile.map((row) => ({
              key: row.key,
              orderNumber: row.orderNumber,
              priority: row.priority,
              assignee: row.assignee,
            }))}
            currentKey={issue.key}
            query={pileQuery ? `?${pileQuery}` : ""}
            defaultOpen={railOpen}
          />
        </div>
      </div>
    </div>
  );
}
