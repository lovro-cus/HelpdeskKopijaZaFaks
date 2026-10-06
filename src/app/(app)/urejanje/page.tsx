import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLanguages } from "@/components/admin/AdminLanguages";
import { AdminProducts, type AdminProduct } from "@/components/admin/AdminProducts";
import { AdminSatisfaction } from "@/components/admin/AdminSatisfaction";
import { SatisfactionMailSettings } from "@/components/admin/SatisfactionMailSettings";
import { SatisfactionAlertForm } from "@/components/manage/SatisfactionAlertForm";
import { canThankCustomer, readThankYouTemplate, satisfactionCloseKey, SATISFACTION_MAIL_KEY } from "@/lib/satisfaction-mail";
import { AdminWarehouse } from "@/components/admin/AdminWarehouse";
import { ShipCutoffForm } from "@/components/manage/ShipCutoffForm";
import { collectCostHistory, collectWarehouse } from "@/lib/admin-warehouse";
import { requireUser } from "@/lib/auth";
import { catalogSnapshot } from "@/lib/catalog-registry";
import { ensureCatalog, readLanguages } from "@/lib/catalog-server";
import { suggestGroups } from "@/lib/catalog-suggest";
import { db } from "@/lib/db";
import { loadSettings } from "@/lib/config/server";
import { formatDateTime } from "@/lib/format";
import { aiConfigured } from "@/lib/groq";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/server";
import { allLanguages, unknownOptionWords } from "@/lib/language-registry";
import { manageAreas, type Permission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

/**
 * Urejanje: skladišče, izdelki, jeziki in pravila za AI. Ločeno od admina,
 * ker jih sme poleg admina urejati tudi nekdo, ki mu admin to dovoli — vsak
 * zavihek zase (lib/permissions.ts). Stran pokaže samo dovoljene zavihke;
 * akcije za njimi preverjajo pravico še enkrat same.
 */
export default async function ManagePage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const areas = manageAreas(me);
  if (areas.length === 0) redirect("/orders");

  const sp = await searchParams;
  const raw = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  const view: Permission = areas.includes(raw as Permission) ? (raw as Permission) : areas[0]!;

  return (
    // Vsi zavihki imajo isto širino: naslov in zavihki ob preklopu ne skačejo.
    // Širino narekujejo skupine izdelkov, ki stojijo v dveh stolpcih.
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
      <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.015em]">{t(me.locale, "manage.pageTitle")}</h1>

      {/* Tudi z enim samim področjem: zavihek pove, kaj ta oseba tu ureja. */}
      <nav className="segmented mt-4 overflow-x-auto" aria-label={t(me.locale, "manage.pageTitle")}>
        {areas.map((item) => (
          <Link key={item} href={`/urejanje?view=${item}`} data-active={view === item ? "true" : undefined}>
            {t(me.locale, `manage.view.${item}` as TranslationKey)}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        {view === "warehouse" && <WarehouseView locale={me.locale} />}
        {view === "products" && <ProductsView locale={me.locale} />}
        {view === "languages" && <LanguagesView />}
        {view === "satisfaction" && <SatisfactionView />}
      </div>
    </div>
  );
}

async function WarehouseView({ locale }: { locale: "sl" | "en" }) {
  const [stats, history, settings] = await Promise.all([collectWarehouse(), collectCostHistory(60), loadSettings()]);
  return (
    <div className="grid gap-4">
      <ShipCutoffForm maxDays={settings.shipMaxAgeDays} rareExempt={settings.shipMaxAgeRareExempt === 1} />
      <AdminWarehouse stats={stats} history={history} locale={locale} />
    </div>
  );
}


/** Izdelki, skupine in predlogi, kateri izdelki so isti kos. */
async function ProductsView({ locale }: { locale: "sl" | "en" }) {
  // Prazno bazo napolni iz semena, preden jo preberemo.
  await ensureCatalog();
  const [rows, groups] = await Promise.all([
    db.catalogProduct.findMany({ orderBy: [{ title: "asc" }, { handle: "asc" }] }),
    db.productGroup.findMany({ orderBy: [{ position: "asc" }, { label: "asc" }] }),
  ]);

  const parse = <T,>(value: string, fallback: T): T => {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  };
  const thumb = (url: string | null | undefined) => (url ? `${url}${url.includes("?") ? "&" : "?"}width=96` : null);
  const variantImages = new Map(rows.map((row) => [row.id, parse<{ image: string | null }[]>(row.variants, [])]));

  const suggestions = suggestGroups(rows.map((row) => ({
    id: row.id,
    title: row.title,
    image: row.image,
    variants: variantImages.get(row.id) ?? [],
    groupId: row.groupId,
    dismissed: parse<string[]>(row.dismissed, []),
    missing: Boolean(row.missingSince),
    status: row.status,
  })));

  const products: AdminProduct[] = rows.map((row) => {
    const variants = variantImages.get(row.id) ?? [];
    return {
      id: row.id,
      title: row.title,
      handle: row.handle,
      status: row.status,
      language: row.language,
      thumb: thumb(row.image ?? variants.find((variant) => variant.image)?.image),
      groupId: row.groupId,
      missing: Boolean(row.missingSince),
      variants: variants.length,
    };
  });

  return (
    <>
      <p className="mb-5 max-w-[70ch] text-[13px] text-label-2">{t(locale, "products.intro")}</p>
      <AdminProducts
        products={products}
        groups={groups.map((group) => ({
          id: group.id,
          key: group.key,
          label: group.label,
          genderAgnostic: group.genderAgnostic,
          aliases: parse<string[]>(group.aliases, []),
        }))}
        suggestions={suggestions}
        languages={allLanguages().map((language) => language.code)}
      />
    </>
  );
}


/** Jeziki strank z besedami izdelkov, ki jih Desk še ne razume. */
async function LanguagesView() {
  await ensureCatalog();
  const [languages, products] = await Promise.all([
    readLanguages(),
    db.catalogProduct.findMany({ where: { missingSince: null }, select: { language: true, options: true } }),
  ]);
  const parsed = products.map((product) => {
    let options: { key: string; values: string[] }[] = [];
    try {
      options = JSON.parse(product.options) as typeof options;
    } catch {}
    return { language: product.language, options };
  });
  // Besede vseh jezikov in osnovni slovar: beseda, ki jo pozna katerikoli jezik, ni neznana.
  const known = {
    color: Object.assign({}, catalogSnapshot().colors, ...languages.map((language) => language.words.color)),
    gender: Object.assign({}, catalogSnapshot().genders, ...languages.map((language) => language.words.gender)),
  };

  return (
    <AdminLanguages
      aiReady={aiConfigured()}
      languages={languages.map((language) => ({
        ...language,
        products: parsed.filter((product) => product.language === language.code).length,
        unknown: unknownOptionWords(parsed, language.code, known),
      }))}
    />
  );
}

/** Ocene zadovoljstva zaprtih ticketov zadnjih 60 dni. */
async function SatisfactionView() {
  const since = new Date(Date.now() - 60 * 86_400_000);
  const [setting, settings] = await Promise.all([db.appSetting.findUnique({ where: { key: SATISFACTION_MAIL_KEY } }), loadSettings()]);
  const scores = await db.satisfactionScore.findMany({
    where: { status: "scored", score: { not: null }, forClosedAt: { gte: since } },
    orderBy: { forClosedAt: "desc" },
    include: {
      issue: { select: { key: true, orderNumber: true, customerName: true, status: true, closedAt: true, customerEmail: true } },
      reviewedBy: { select: { name: true } },
    },
  });
  const letters = await db.customerEmailDraft.findMany({
    where: { satisfactionCloseKey: { in: scores.map(row => satisfactionCloseKey(row.issueId, row.forClosedAt)) } },
    select: { satisfactionCloseKey: true, status: true },
  });
  const statuses = new Map(letters.map(row => [row.satisfactionCloseKey, row.status]));
  return (
    <div className="space-y-4">
    <SatisfactionAlertForm below={settings.satisfactionReviewBelow} notify={settings.satisfactionNotify === 1} />
    <SatisfactionMailSettings template={readThankYouTemplate(setting?.value)} />
    <AdminSatisfaction
      below={settings.satisfactionReviewBelow}
      rows={scores.map((row) => ({
        issueId: row.issueId,
        key: row.issue.key,
        orderNumber: row.issue.orderNumber,
        customerName: row.issue.customerName,
        score: row.score!,
        reason: row.reason,
        closedAt: row.forClosedAt,
        reviewedAt: row.reviewedAt,
        reviewer: row.reviewedBy?.name ?? null,
        canThank: canThankCustomer({ ...row.issue, satisfaction: row }),
        thankYouStatus: statuses.get(satisfactionCloseKey(row.issueId, row.forClosedAt)) ?? null,
      }))}
    />
    </div>
  );
}
