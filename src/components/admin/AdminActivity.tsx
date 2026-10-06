import Link from "next/link";

import { EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { t } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/shared";

export type ActivityRow = {
  id: number;
  kind: string;
  field: string | null;
  toValue: string | null;
  body: string | null;
  outsider: boolean;
  createdAt: Date;
  author: { name: string } | null;
  issue: { key: string; orderNumber: string };
};

/** Dnevnik čez vse tikete. Doslej je bila dejavnost vidna le znotraj posameznega
 *  ticketa, zato vprašanje "kaj se je danes dogajalo" ni imelo odgovora. */
export function AdminActivity({
  rows, users, activeUser, locale,
}: {
  rows: ActivityRow[];
  users: { id: string; name: string }[];
  activeUser?: string;
  locale: Locale;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <div>
          <h2 className="caption" style={{ color: "var(--ink)" }}>{t(locale, "admin.activity.title")}</h2>
          <p className="mt-1 text-[12px] text-label-2">{t(locale, "admin.activity.intro")}</p>
        </div>
        <div className="filters" role="tablist">
          <Link href="/admin?view=activity" role="tab" aria-selected={!activeUser} data-active={!activeUser}>
            {t(locale, "admin.activity.all")}
          </Link>
          {users.map((user) => (
            <Link
              key={user.id}
              href={`/admin?view=activity&user=${encodeURIComponent(user.id)}`}
              role="tab"
              aria-selected={activeUser === user.id}
              data-active={activeUser === user.id}
            >
              {user.name}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border-t" style={{ borderColor: "var(--separator)" }}>
          <EmptyState title={t(locale, "admin.activity.none")} />
        </div>
      ) : rows.map((row) => (
        <div key={row.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-t px-4 py-2.5" style={{ borderColor: "var(--separator)" }}>
          <Link href={`/orders/${row.issue.key}`} className="link mono text-[12.5px]">#{row.issue.orderNumber}</Link>
          <span className="text-[12.5px] font-medium">{row.author?.name ?? t(locale, "admin.activity.system")}</span>
          <span className="text-[12px] text-label-2">{kindLabel(row.kind, locale)}</span>
          {row.outsider && <span className="pill">{t(locale, "admin.activity.outsider")}</span>}
          <span className="mono ml-auto text-[11.5px] text-label-3">{formatDateTime(row.createdAt, locale)}</span>
        </div>
      ))}
    </div>
  );
}

/** Vrste dogodkov, ki imajo ime; ostale pokažemo, kot so zapisane — bolje surovo
 *  kot izmišljeno. */
const NAMED = ["comment", "status", "handoff", "assign", "field", "system", "parcel", "created"];

function kindLabel(kind: string, locale: Locale): string {
  return NAMED.includes(kind) ? t(locale, `admin.activity.kind.${kind}` as TranslationKey) : kind;
}

export type ManageLogRow = {
  id: number;
  area: string;
  action: string;
  detail: string;
  createdAt: Date;
  author: { name: string } | null;
};

/** Znane spremembe na strani »Urejanje«; neznana pokaže svoj ključ. */
const MANAGE_ACTIONS = [
  "sync", "product.group", "product.ungroup", "product.language", "group.create", "group.update", "group.delete",
  "group.join", "group.alias", "suggestion.dismiss", "language.save", "language.create", "language.retranslate",
  "language.delete", "rule.create", "rule.update", "rule.enable", "rule.disable", "rule.delete", "satisfaction.review",
  "cutoff.update", "satisfaction.template", "satisfaction.alert",
];

/**
 * Spremembe izdelkov, jezikov in pravil. Ko jih ureja več ljudi, mora biti
 * razvidno, kdo je kaj premaknil — dogodki ticketov tega ne pokrijejo.
 */
export function ManageActivity({ rows, locale }: { rows: ManageLogRow[]; locale: Locale }) {
  return (
    <div className="card mt-4 overflow-hidden">
      <div className="px-4 py-3.5">
        <h2 className="caption" style={{ color: "var(--ink)" }}>{t(locale, "admin.manageLog.title")}</h2>
        <p className="mt-1 text-[12px] text-label-2">{t(locale, "admin.manageLog.intro")}</p>
      </div>
      {rows.length === 0 ? (
        <div className="border-t" style={{ borderColor: "var(--separator)" }}>
          <EmptyState title={t(locale, "admin.manageLog.none")} />
        </div>
      ) : rows.map((row) => (
        <div key={row.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-t px-4 py-2.5" style={{ borderColor: "var(--separator)" }}>
          <span className="pill">{t(locale, `manage.view.${row.area}` as TranslationKey)}</span>
          <span className="text-[12.5px] font-medium">{row.author?.name ?? t(locale, "admin.activity.system")}</span>
          <span className="text-[12px] text-label-2">
            {MANAGE_ACTIONS.includes(row.action) ? t(locale, `manage.log.${row.action}` as TranslationKey) : row.action}
          </span>
          {row.detail && <span className="min-w-0 truncate text-[12px]">{row.detail}</span>}
          <span className="mono ml-auto text-[11.5px] text-label-3">{formatDateTime(row.createdAt, locale)}</span>
        </div>
      ))}
    </div>
  );
}
