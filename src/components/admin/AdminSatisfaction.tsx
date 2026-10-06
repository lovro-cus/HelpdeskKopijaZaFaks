"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { markSatisfactionReviewed } from "@/lib/actions/satisfaction";
import { formatDateTime } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { needsReview, scoreTone } from "@/lib/satisfaction";
import { EmptyState } from "../ui";
import { ThankYouMail } from "../ThankYouMail";

export type SatisfactionRow = {
  issueId: number;
  key: string;
  orderNumber: string;
  customerName: string | null;
  score: number;
  reason: string;
  closedAt: Date;
  reviewedAt: Date | null;
  reviewer: string | null;
  canThank: boolean;
  thankYouStatus: string | null;
};

const TONE_COLOR = { low: "var(--stamp)", mid: "var(--warning)", high: "var(--petrol)", none: "var(--ink-3)" } as const;

const SORTS = ["newest", "oldest", "lowest", "highest"] as const;
type Sort = (typeof SORTS)[number];
const TONES = ["all", "low", "mid", "high"] as const;
type ToneFilter = (typeof TONES)[number];

// Izbira razvrščanja in filtra je udobje posameznika: ostane v brskalniku.
const PREFS_KEY = "helpdesk.satisfaction.list";

function sortRows(rows: SatisfactionRow[], sort: Sort): SatisfactionRow[] {
  const newest = (a: SatisfactionRow, b: SatisfactionRow) => b.closedAt.getTime() - a.closedAt.getTime();
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return -newest(a, b);
    if (sort === "lowest") return a.score - b.score || newest(a, b);
    if (sort === "highest") return b.score - a.score || newest(a, b);
    return newest(a, b);
  });
}

/**
 * Zadovoljstvo strank po zaključku. Na vrhu nizke ocene, ki jih še nihče ni
 * pogledal — to je delo; spodaj vse ocene, razvrščene in filtrirane po želji.
 */
export function AdminSatisfaction({ rows, below }: { rows: SatisfactionRow[]; below: number }) {
  const t = useT();
  const toReview = rows.filter((row) => needsReview(row.score, below) && !row.reviewedAt);
  const monthAgo = Date.now() - 30 * 86_400_000;
  const recent = rows.filter((row) => row.closedAt.getTime() >= monthAgo);
  const average = recent.length ? recent.reduce((sum, row) => sum + row.score, 0) / recent.length : null;

  return (
    <div className="grid gap-4">
      <div className="card grid grid-cols-3 gap-4 px-4 py-3.5">
        <Stat label={t("satisfaction.stat.average")} value={average === null ? "—" : average.toFixed(1).replace(".", ",")} />
        <Stat label={t("satisfaction.stat.count")} value={String(recent.length)} />
        <Stat label={t("satisfaction.stat.low", { below })} value={String(recent.filter((row) => needsReview(row.score, below)).length)} />
      </div>

      <section className="card overflow-hidden">
        <div className="px-4 py-3.5">
          <h2 className="caption" style={{ color: "var(--ink)" }}>{t("satisfaction.toReviewTitle")}</h2>
          <p className="mt-1 text-[12px] text-label-2">{t("satisfaction.toReviewIntro", { below })}</p>
        </div>
        {toReview.length === 0 ? (
          <div className="border-t" style={{ borderColor: "var(--separator)" }}>
            <EmptyState title={t("satisfaction.toReviewNone")} />
          </div>
        ) : toReview.map((row) => <Row key={row.issueId} row={row} below={below} reviewable />)}
      </section>

      <AllRatings rows={rows} below={below} />
    </div>
  );
}

/**
 * Vse ocene z razvrščanjem in filtrom po barvi ocene. Števila na filtrih
 * povedo, koliko je v vsakem kupu, še preden klikneš.
 */
function AllRatings({ rows, below }: { rows: SatisfactionRow[]; below: number }) {
  const t = useT();
  const [sort, setSort] = useState<Sort>("newest");
  const [tone, setTone] = useState<ToneFilter>("all");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as { sort?: string; tone?: string } | null;
      if (saved && SORTS.includes(saved.sort as Sort)) setSort(saved.sort as Sort);
      if (saved && TONES.includes(saved.tone as ToneFilter)) setTone(saved.tone as ToneFilter);
    } catch {}
  }, []);
  const remember = (next: { sort: Sort; tone: ToneFilter }) => {
    setSort(next.sort);
    setTone(next.tone);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
  };

  const counts = useMemo(() => {
    const result: Record<ToneFilter, number> = { all: rows.length, low: 0, mid: 0, high: 0 };
    for (const row of rows) {
      const rowTone = scoreTone(row.score, below);
      if (rowTone !== "none") result[rowTone] += 1;
    }
    return result;
  }, [rows, below]);
  const activeTone: ToneFilter = tone === "mid" && below > 7 ? "all" : tone;
  const visible = useMemo(
    () => sortRows(activeTone === "all" ? rows : rows.filter((row) => scoreTone(row.score, below) === activeTone), sort),
    [rows, below, sort, activeTone],
  );

  // Meje sledijo barvam (scoreTone): nizke pod pragom, visoke od 8 naprej.
  // Pri pragu nad 7 srednjih ni, zato tega filtra tedaj ne kažemo.
  const highFrom = Math.max(below, 8);
  const tones = TONES.filter((value) => value !== "mid" || below <= 7);
  const range = (from: number, to: number) => (from === to ? String(from) : `${from}–${to}`);
  const toneLabel = (value: ToneFilter) =>
    value === "low" ? t("satisfaction.filter.low", { below })
      : value === "mid" ? range(below, 7)
        : value === "high" ? range(highFrom, 10)
          : t("satisfaction.filter.all");

  return (
    <section className="card overflow-hidden">
      <div className="px-4 pt-3.5">
        <h2 className="caption" style={{ color: "var(--ink)" }}>{t("satisfaction.allTitle")}</h2>
        <p className="mt-1 text-[12px] text-label-2">{t("satisfaction.allIntro")}</p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pb-3 pt-3">
        <div className="filters" role="group" aria-label={t("satisfaction.filter.label")}>
          {tones.map((value) => (
            <button
              key={value}
              type="button"
              data-active={activeTone === value}
              aria-pressed={activeTone === value}
              onClick={() => remember({ sort, tone: value })}
            >
              {value !== "all" && <span aria-hidden className="mr-1.5 inline-block h-[7px] w-[7px]" style={{ background: activeTone === value ? "currentColor" : TONE_COLOR[value] }} />}
              {toneLabel(value)}
              <span className="ml-1.5 tabular-nums opacity-70">{counts[value]}</span>
            </button>
          ))}
        </div>
        <div className="segmented overflow-x-auto" role="group" aria-label={t("satisfaction.sort.label")}>
          {SORTS.map((value) => (
            <button key={value} type="button" data-active={sort === value} aria-pressed={sort === value} onClick={() => remember({ sort: value, tone })}>
              {t(`satisfaction.sort.${value}`)}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <div className="border-t" style={{ borderColor: "var(--separator)" }}>
          <EmptyState title={t(rows.length ? "satisfaction.filter.none" : "satisfaction.none")} />
        </div>
      ) : visible.map((row) => <Row key={row.issueId} row={row} below={below} reviewable={false} />)}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="caption">{label}</p>
      <p className="mono mt-1 text-[18px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Row({ row, below, reviewable }: { row: SatisfactionRow; below: number; reviewable: boolean }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t px-4 py-2.5" style={{ borderColor: "var(--separator)" }}>
      <span className="mono w-[44px] text-[13px] font-semibold tabular-nums" style={{ color: TONE_COLOR[scoreTone(row.score, below)] }}>
        {row.score}/10
      </span>
      <Link href={`/orders/${row.key}`} className="link mono text-[12.5px]">#{row.orderNumber}</Link>
      {row.customerName && <span className="text-[12.5px] font-medium">{row.customerName}</span>}
      <span className="mono ml-auto text-[11.5px] text-label-3">{formatDateTime(row.closedAt, locale)}</span>
      <p className="basis-full pl-[56px] text-[12px] leading-[1.5] text-label-2">{row.reason}</p>
      {row.reviewedAt && (
        <p className="basis-full pl-[56px] text-[11.5px] text-label-3">
          {t("satisfaction.reviewedBy", { name: row.reviewer ?? "—", date: formatDateTime(row.reviewedAt, locale) })}
        </p>
      )}
      {reviewable && (
        <div className="basis-full pl-[56px]">
          <button
            type="button"
            className="btn btn-sm"
            disabled={pending}
            onClick={() => start(async () => {
              const result = await markSatisfactionReviewed(row.issueId);
              if (result.error) setError(result.error);
              else router.refresh();
            })}
          >
            <Check size={13} /> {t("satisfaction.markReviewed")}
          </button>
          {error && <span className="ml-2 text-[12px]" style={{ color: "var(--stamp)" }}>{error}</span>}
        </div>
      )}
      {row.canThank && <div className="basis-full min-w-0 pt-2 sm:pl-[56px]"><ThankYouMail issueId={row.issueId} status={row.thankYouStatus} /></div>}
    </div>
  );
}
