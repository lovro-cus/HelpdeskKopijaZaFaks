import { Suspense } from "react";

import { OrderFilters } from "@/components/OrderFilters";
import { OrderTypeFilter } from "@/components/OrderTypeFilter";
import { BulkOrderGrid } from "@/components/BulkOrderGrid";
import { EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canClose, SYSTEM_LEVEL } from "@/lib/domain";
import { loadConfig } from "@/lib/config/server";
import { emailCountOf, issueWhere, readIssueFilter, sortIssues } from "@/lib/issue-filter";
import type { Prisma } from "@prisma/client";
import { t } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { pluralSuffix } from "@/lib/i18n/shared";
import { REOPEN_FIELD, replyCueIds } from "@/lib/reply-cue";
import { wakeDueWaitingIssues } from "@/lib/waiting";

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  key: true,
  orderNumber: true,
  type: true,
  status: true,
  priority: true,
  level: true,
  title: true,
  customerName: true,
  waitingUntil: true,
  waitingReplySince: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, name: true, color: true } },
  items: {
    orderBy: { position: "asc" },
    select: { name: true, variant: true, resolution: true },
  },
  _count: { select: { events: true, attachments: true, items: true } },
  inboxConversations: { select: { messageCount: true } },
  // Vračilo na poti k nam je tisto, kar naročilo drži na čakanju (parcelHolds).
  // Za list je dovolj, ali tak paket obstaja.
  parcels: { where: { direction: "return", state: "transit" }, select: { id: true }, take: 1 },
} satisfies Prisma.IssueSelect;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const sp = await searchParams;

  const { types, priorities } = await loadConfig(me.locale);

  const filter = readIssueFilter(sp);
  const view = filter.view;
  const q = filter.q;

  // Filtri gredo skozi Prisma (parametrizirano) — nič ročnega sestavljanja SQL.
  const where = issueWhere(filter, me, types, priorities);

  // Naročila, ki jim je poteklo čakanje, vrni v delo, preden preštejemo in
  // izpišemo seznam — da se zbudijo takoj, ko kdo pogleda, ne šele ob urniku.
  await wakeDueWaitingIssues();

  // Števci pri vrstah gledajo isti pogled, a brez izbrane vrste — sicer bi ob
  // kliku vse ostale padle na nič in bi se dalo filtrirati samo enkrat.
  const typeCountWhere: Prisma.IssueWhereInput = { ...where };
  delete typeCountWhere.type;

  const [issues, users, cMine, cLevel, cAll, cSystem, cWaiting, cManual, cArchive, byType, cStarred] = await Promise.all([
    db.issue.findMany({
      where,
      // Vrstni red določi izbrano razvrščanje spodaj; tu le deterministična
      // osnova (najnovejši prvi), da je izbor pri omejitvi ponovljiv.
      orderBy: { createdAt: "desc" },
      select: { ...SELECT, stars: { where: { userId: me.id }, select: { userId: true }, take: 1 } },
      take: 300,
    }),
    // Za skupinsko predajo kupa naročil.
    db.user.findMany({
      where: { active: true },
      orderBy: [{ level: "asc" }, { name: "asc" }],
      select: { id: true, name: true, level: true },
    }),
    db.issue.count({ where: { assigneeId: me.id, status: "open" } }),
    db.issue.count({ where: { level: me.level, status: "open" } }),
    db.issue.count({ where: { status: "open", level: { not: SYSTEM_LEVEL } } }),
    db.issue.count({ where: { status: "open", level: SYSTEM_LEVEL } }),
    db.issue.count({ where: { status: "waiting" } }),
    db.issue.count({ where: { status: "manual" } }),
    db.issue.count({ where: { status: "closed" } }),
    db.issue.groupBy({ by: ["type"], where: typeCountWhere, _count: { _all: true } }),
    db.issueStar.count({ where: { userId: me.id } }),
  ]);

  const typeCounts: Record<string, number> = {};
  for (const row of byType) typeCounts[row.type] = row._count._all;

  // Klicaj "stranka je odgovorila": zadnji odgovor proti zadnjemu človeškemu dogodku.
  const ids = issues.map((issue) => issue.id);
  const [replies, reopens, human] = ids.length === 0 ? [[], [], []] : await Promise.all([
    db.event.groupBy({ by: ["issueId"], where: { issueId: { in: ids }, field: "reply_received" }, _max: { createdAt: true } }),
    db.event.groupBy({ by: ["issueId"], where: { issueId: { in: ids }, field: REOPEN_FIELD }, _max: { createdAt: true } }),
    db.event.groupBy({ by: ["issueId"], where: { issueId: { in: ids }, authorId: { not: null } }, _max: { createdAt: true } }),
  ]);
  const cues = replyCueIds(issues, replies, human);
  const reopenCues = replyCueIds(issues, reopens, human);

  const counted = issues.map(({ inboxConversations, parcels, stars, ...issue }) => ({
    ...issue,
    starred: stars.length > 0,
    emailCount: emailCountOf(inboxConversations),
    replyCue: cues.has(issue.id) && !reopenCues.has(issue.id),
    reopenCue: reopenCues.has(issue.id),
    awaitingParcel: parcels.length > 0,
  }));
  // »Znova odprti«: ticketi, ki jih je odprl mail po zaključku in se nanje še
  // nihče ni odzval — isti nabor kot ikona ovojnice na listih.
  const reopenedOnly = sp.reopened === "1";
  const reopenedCount = counted.filter((issue) => issue.reopenCue).length;
  const sortedIssues = sortIssues(reopenedOnly ? counted.filter((issue) => issue.reopenCue) : counted, filter.sort, types, priorities);

  const titles: Record<string, string> = {
    mine: t(me.locale, "orders.mineTitle"), level: t(me.locale, "orders.levelTitle"),
    all: t(me.locale, "orders.allTitle"), system: t(me.locale, "orders.systemTitle"), waiting: t(me.locale, "orders.waitingTitle"), manual: t(me.locale, "orders.manualTitle"), archive: t(me.locale, "orders.archive"), starred: t(me.locale, "orders.starredTitle"),
  };
  const title = q ? t(me.locale, "orders.searchTitle", { query: q }) : (titles[view] ?? t(me.locale, "orders.title"));

  // Vrsta stoji v isti vrstici kot gumb za izbiranje, torej tik nad listi.
  const typeChips = (
    <Suspense fallback={<div className="h-[26px]" />}>
      <OrderTypeFilter counts={typeCounts} reopened={reopenedCount} />
    </Suspense>
  );

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.015em]">{title}</h1>
        <p className="caption">
          {sortedIssues.length === 0
            ? t(me.locale, "orders.noResults")
            : t(me.locale, `orders.count.${pluralSuffix(me.locale, sortedIssues.length)}` as TranslationKey, { count: sortedIssues.length })}
        </p>
      </div>

      <div className="mb-5">
        <Suspense fallback={<div className="h-8" />}>
          <OrderFilters counts={{ mine: cMine, level: cLevel, all: cAll, system: cSystem, waiting: cWaiting, manual: cManual, archive: cArchive, starred: cStarred }} />
        </Suspense>
      </div>

      {/* Skupinska dejanja niso vezana na nivo — zaključevanje je edino, kar je,
          in ta gumb sam pogleda, ali ga sme videti. */}
      <BulkOrderGrid
        issues={sortedIssues}
        meId={me.id}
        users={users}
        mayClose={canClose(me)}
        showMineCue={view === "level" || view === "all" || view === "waiting" || view === "manual"}
        filters={typeChips}
        empty={
          <EmptyState
            title={q ? t(me.locale, "orders.noneSearch") : t(me.locale, "orders.empty")}
            hint={
              view === "mine"
                ? t(me.locale, "orders.emptyMine")
                : view === "system"
                  ? t(me.locale, "orders.emptySystem")
                  : t(me.locale, "orders.emptyOther")
            }
          />
        }
      />
    </div>
  );
}
