import type { Prisma } from "@prisma/client";

import { rankOf, type Category } from "./config/shared";
import { SYSTEM_LEVEL } from "./domain";

/**
 * Kateri tiketi so "ta kup". Seznam naročil in stranski trak na ticketu morata
 * brati isti nabor: če ju sestavljata vsak po svoje, se prej ali slej razideta
 * in trak pokaže naročila, ki jih v seznamu ni bilo.
 *
 * Filter potuje v naslovu (?view=…&type=…), zato je z odprtega ticketa razvidno,
 * iz katerega kupa je prišel, in povezava ostane deljiva.
 */

export const ISSUE_SORTS = ["priority", "created", "updated", "type", "emails", "emailsFew"] as const;
export type IssueSort = (typeof ISSUE_SORTS)[number];

export type IssueFilter = {
  view: string;
  q?: string;
  type?: string;
  priority?: string;
  assignee?: string;
  sort: IssueSort;
};

type RawParams = Record<string, string | string[] | undefined>;

export function readIssueFilter(sp: RawParams): IssueFilter {
  const one = (key: string) => {
    const value = sp[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const sort = one("sort");
  return {
    view: one("view") ?? "mine",
    q: one("q"),
    type: one("type"),
    priority: one("priority"),
    assignee: one("assignee"),
    sort: ISSUE_SORTS.includes(sort as IssueSort) ? (sort as IssueSort) : "priority",
  };
}

/** Filter nazaj v naslov — za povezave s seznama na ticket in obratno. */
export function issueFilterParams(filter: IssueFilter): URLSearchParams {
  const params = new URLSearchParams();
  // Privzeti pogled in razvrščanje v naslovu ne pustita sledi.
  if (filter.view && filter.view !== "mine") params.set("view", filter.view);
  if (filter.q) params.set("q", filter.q);
  if (filter.type) params.set("type", filter.type);
  if (filter.priority) params.set("priority", filter.priority);
  if (filter.assignee) params.set("assignee", filter.assignee);
  if (filter.sort !== "priority") params.set("sort", filter.sort);
  return params;
}

/**
 * Pogoj za bazo. Vrste in prioritete pridejo iz šifranta: filter po vrednosti,
 * ki je ni več, se tiho izpusti, sicer bi seznam ostal prazen brez pojasnila.
 */
export function issueWhere(
  filter: IssueFilter,
  me: { id: string; level: number },
  types: Category[],
  priorities: Category[],
): Prisma.IssueWhereInput {
  const where: Prisma.IssueWhereInput = {};

  // »Označeni« so osebna izbira čez vsa stanja, tudi arhiv.
  if (filter.view === "starred") where.stars = { some: { userId: me.id } };
  else if (filter.view === "archive") where.status = "closed";
  else if (filter.view === "manual") where.status = "manual";
  else if (filter.view === "waiting") where.status = "waiting";
  else where.status = "open";

  if (filter.view === "mine") where.assigneeId = me.id;
  if (filter.view === "level") where.level = me.level;
  // Sistemski ticketi imajo svoj pogled; »Vsa odprta« so delo ljudi.
  if (filter.view === "system") where.level = SYSTEM_LEVEL;
  if (filter.view === "all") where.level = { not: SYSTEM_LEVEL };
  // Filter po prevzemniku: iz nadzorne plošče pripelje na primere ene osebe.
  if (filter.assignee) where.assigneeId = filter.assignee;

  if (filter.type && types.some((type) => type.key === filter.type)) where.type = filter.type;
  if (filter.priority && priorities.some((p) => p.key === filter.priority)) {
    where.priority = filter.priority;
  }

  if (filter.q) {
    const like = filter.q.slice(0, 80);
    // Tracking številke ljudje lepijo s presledki iz mailov; brez tega
    // "CP 092 195 155 IT" ne bi našel ničesar.
    const compact = like.replace(/\s+/g, "");

    where.OR = [
      { orderNumber: { contains: like } },
      { key: { contains: like } },
      { title: { contains: like } },
      { customerName: { contains: like } },
      { customerEmail: { contains: like } },
      { customerPhone: { contains: like } },
      { customerAddress: { contains: like } },
      { items: { some: { name: { contains: like } } } },
      { returnTracking: { contains: compact } },
      { replacementTracking: { contains: compact } },
      { parcels: { some: { number: { contains: compact } } } },
    ];
    delete where.status; // iskanje gre tudi po arhivu
  }

  return where;
}

type Sortable = { type: string; priority: string; createdAt: Date; updatedAt: Date; emailCount?: number };

/**
 * Mailov s stranko na ticketu: seštevek vseh povezanih Gmail niti. Nit, ki še
 * ni preštet, šteje nič — ticket brez številke ne sme skočiti na vrh.
 */
export function emailCountOf(conversations: { messageCount: number | null }[]): number {
  return conversations.reduce((sum, conversation) => sum + (conversation.messageCount ?? 0), 0);
}

/**
 * Razvrščanje: privzeto po prioriteti (nujno najprej), znotraj enake prioritete
 * pa po nastanku — najstarejši ticket prvi, da ne obtiči. "created" pokaže
 * najnovejše, "type" združi po vrsti (refund, zamenjava …), "emails" in
 * "emailsFew" po številu mailov s stranko (pri enakem številu spet prioriteta).
 */
export function sortIssues<T extends Sortable>(
  issues: T[],
  sort: IssueSort,
  types: Category[],
  priorities: Category[],
): T[] {
  const oldestFirst = (a: Sortable, b: Sortable) => a.createdAt.getTime() - b.createdAt.getTime();
  const byPriority = (a: Sortable, b: Sortable) =>
    rankOf(priorities, a.priority) - rankOf(priorities, b.priority) || oldestFirst(a, b);
  const emails = (issue: Sortable) => issue.emailCount ?? 0;

  return [...issues].sort((a, b) => {
    if (sort === "created") return b.createdAt.getTime() - a.createdAt.getTime();
    if (sort === "updated") return b.updatedAt.getTime() - a.updatedAt.getTime();
    if (sort === "type") return rankOf(types, a.type) - rankOf(types, b.type) || byPriority(a, b);
    if (sort === "emails") return emails(b) - emails(a) || byPriority(a, b);
    if (sort === "emailsFew") return emails(a) - emails(b) || byPriority(a, b);
    return byPriority(a, b);
  });
}
