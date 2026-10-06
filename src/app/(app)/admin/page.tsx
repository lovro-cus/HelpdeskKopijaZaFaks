import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminActivity, ManageActivity, type ActivityRow } from "@/components/admin/AdminActivity";
import { AdminCatalog, type CatalogRow } from "@/components/admin/AdminCatalog";
import { AdminProducts, type AdminProduct } from "@/components/admin/AdminProducts";
import { AdminLanguages } from "@/components/admin/AdminLanguages";
import { catalogSnapshot } from "@/lib/catalog-registry";
import { ensureCatalog, readLanguages } from "@/lib/catalog-server";
import { allLanguages, unknownOptionWords } from "@/lib/language-registry";
import { suggestGroups } from "@/lib/catalog-suggest";
import { formatDateTime } from "@/lib/format";
import { AdminSessions, type AdminSession } from "@/components/admin/AdminSessions";
import { AdminStorage } from "@/components/admin/AdminStorage";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminWarehouse } from "@/components/admin/AdminWarehouse";
import { AdminWorkload, type WorkloadRow } from "@/components/admin/AdminWorkload";
import { Notice } from "@/components/ui";
import { collectStorage } from "@/lib/admin-storage";
import { collectCostHistory, collectWarehouse } from "@/lib/admin-warehouse";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadCategoryRows, loadConfig } from "@/lib/config/server";
import { storageDays } from "@/lib/storage-cost";
import { t } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { GUEST_HIDDEN_ADMIN_VIEWS, isGuest } from "@/lib/guest";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Pogledi so ločeni namenoma: vsak potegne le svoje podatke, zato ostane
 *  nalaganje poceni tudi, ko dnevnik in priloge zrastejo. */
const VIEWS = ["users", "workload", "catalog", "sessions", "activity", "storage"] as const;
type View = (typeof VIEWS)[number];

/** Pogledi, ki so se preselili na stran »Urejanje«; stari zaznamki naj ne padejo. */
const MOVED = new Set(["warehouse", "products", "languages", "satisfaction"]);

const FEEDBACK = ["revoked", "revokedAll", "pruned"];

export default async function AdminPage({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const one = (key: string) => {
    const value = sp[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };

  const saved = one("saved");
  const userFilter = one("user");
  const raw = one("view");
  if (raw && MOVED.has(raw)) redirect(`/urejanje?view=${raw}`);
  const guest = isGuest(me);
  const views = VIEWS.filter((item) => !guest || !GUEST_HIDDEN_ADMIN_VIEWS.has(item));
  const view: View = views.includes(raw as View) ? (raw as View) : "users";

  return (
    // Skupine izdelkov stojijo v dveh stolpcih, zato ta pogled rabi več širine.
    <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6">
      <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.015em]">{t(me.locale, "admin.pageTitle")}</h1>

      <nav className="segmented mt-4 overflow-x-auto" aria-label={t(me.locale, "admin.pageTitle")}>
        {views.map((item) => (
          <Link
            key={item}
            href={item === "users" ? "/admin" : `/admin?view=${item}`}
            data-active={view === item ? "true" : undefined}
          >
            {t(me.locale, `admin.view.${item}` as TranslationKey)}
          </Link>
        ))}
      </nav>

      {saved && FEEDBACK.includes(saved) && (
        <div className="mt-4">
          <Notice kind="ok">{t(me.locale, `admin.feedback.${saved}` as TranslationKey)}</Notice>
        </div>
      )}

      <div className="mt-4">
        {view === "users" && <UsersView locale={me.locale} meId={me.id} readOnly={guest} />}
        {view === "workload" && <WorkloadView locale={me.locale} />}
        {view === "sessions" && <SessionsView locale={me.locale} />}
        {view === "activity" && <ActivityView locale={me.locale} userFilter={userFilter} />}
        {view === "catalog" && <CatalogView locale={me.locale} />}
        {view === "storage" && <StorageView locale={me.locale} />}
      </div>
    </div>
  );
}

async function UsersView({ locale, meId, readOnly }: { locale: "sl" | "en"; meId: string; readOnly: boolean }) {
  const users = await db.user.findMany({
    orderBy: [{ active: "desc" }, { level: "asc" }, { name: "asc" }],
    select: {
      id: true, username: true, name: true, level: true, isAdmin: true, active: true,
      mustChangePw: true, color: true, locale: true, email: true,
      notifyEmail: true, notifyOutsider: true, notifyKinds: true, notifyDigest: true, permissions: true, lastLogin: true, createdAt: true,
      _count: { select: { assigned: true, events: true } },
    },
  });

  return (
    <>
      <p className="mb-4 text-[13.5px] text-label-2">{t(locale, "admin.intro")}</p>
      <AdminUsers users={users} meId={meId} readOnly={readOnly} />
    </>
  );
}

async function WorkloadView({ locale }: { locale: "sl" | "en" }) {
  // Vsi odprti/čakajoči/ročni primeri naenkrat; štetje po osebi naredimo v
  // pomnilniku, ker so trije statusi ceneje v eni poizvedbi kot v devetih.
  const [issues, users] = await Promise.all([
    db.issue.findMany({
      where: { status: { in: ["open", "waiting", "manual"] } },
      select: { assigneeId: true, status: true, priority: true, createdAt: true },
    }),
    db.user.findMany({ where: { active: true }, orderBy: [{ level: "asc" }, { name: "asc" }], select: { id: true, name: true, level: true } }),
  ]);

  // "Nujno" je najvišja prioriteta v šifrantu, ne trdo zapisan ključ — admin
  // jo lahko preimenuje ali zamenja.
  const { priorities } = await loadConfig(locale);
  const topPriority = priorities[0]?.key;

  const now = new Date();
  const build = (id: string | null, name: string, level: number | null): WorkloadRow => {
    const mine = issues.filter((issue) => issue.assigneeId === id);
    const open = mine.filter((issue) => issue.status === "open");
    const oldest = open.reduce<Date | null>((acc, issue) => (!acc || issue.createdAt < acc ? issue.createdAt : acc), null);
    return {
      id, name, level,
      open: open.length,
      waiting: mine.filter((issue) => issue.status === "waiting").length,
      manual: mine.filter((issue) => issue.status === "manual").length,
      urgent: open.filter((issue) => issue.priority === topPriority).length,
      oldestDays: oldest ? storageDays(oldest, now) : null,
    };
  };

  const rows = users.map((user) => build(user.id, user.name, user.level));
  const unassigned = build(null, t(locale, "admin.workload.unassigned"), null);
  // Nedodeljene pokažemo samo, kadar obstajajo — prazna vrstica je šum.
  const all = unassigned.open + unassigned.waiting + unassigned.manual > 0 ? [unassigned, ...rows] : rows;

  return <AdminWorkload rows={all.filter((row) => row.open + row.waiting + row.manual > 0)} locale={locale} />;
}

async function SessionsView({ locale }: { locale: "sl" | "en" }) {
  const sessions: AdminSession[] = await db.session.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, createdAt: true, expiresAt: true, userAgent: true,
      user: { select: { id: true, name: true } },
    },
  });
  return <AdminSessions sessions={sessions} locale={locale} />;
}

async function ActivityView({ locale, userFilter }: { locale: "sl" | "en"; userFilter?: string }) {
  const [rows, users, manageRows] = await Promise.all([
    db.event.findMany({
      where: userFilter ? { authorId: userFilter } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, kind: true, field: true, toValue: true, body: true, outsider: true, createdAt: true,
        author: { select: { name: true } },
        issue: { select: { key: true, orderNumber: true } },
      },
    }),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.manageLog.findMany({
      where: userFilter ? { authorId: userFilter } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, area: true, action: true, detail: true, createdAt: true, author: { select: { name: true } } },
    }),
  ]);
  return (
    <>
      <AdminActivity rows={rows as ActivityRow[]} users={users} activeUser={userFilter} locale={locale} />
      <ManageActivity rows={manageRows} locale={locale} />
    </>
  );
}

/**
 * Šifrant in številke. Poleg vrstic prešteje še, koliko tiketov posamezno
 * vrednost nosi — brisanje mora povedati, kaj bo z njimi.
 */
async function CatalogView({ locale }: { locale: "sl" | "en" }) {
  const [categories, config, byType, byPriority] = await Promise.all([
    loadCategoryRows(locale),
    loadConfig(locale),
    db.issue.groupBy({ by: ["type"], _count: { _all: true } }),
    db.issue.groupBy({ by: ["priority"], _count: { _all: true } }),
  ]);

  const used = new Map<string, number>();
  for (const row of byType) used.set(`type:${row.type}`, row._count._all);
  for (const row of byPriority) used.set(`priority:${row.priority}`, row._count._all);

  const rows: CatalogRow[] = categories.map((category) => ({
    ...category,
    used: used.get(`${category.kind}:${category.key}`) ?? 0,
  }));

  return <AdminCatalog rows={rows} settings={config.settings} text={config.text} />;
}

async function StorageView({ locale }: { locale: "sl" | "en" }) {
  return <AdminStorage storage={await collectStorage()} locale={locale} />;
}
