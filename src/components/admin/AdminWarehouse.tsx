import { CostChart } from "./CostChart";
import type { CostPoint, WarehouseStats } from "@/lib/admin-warehouse";
import { STORAGE_CURRENCY } from "@/lib/storage-cost";
import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/shared";

function usd(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "sl" ? "sl-SI" : "en-GB", { style: "currency", currency: STORAGE_CURRENCY }).format(amount);
}

export function AdminWarehouse({
  stats, history, locale,
}: {
  stats: WarehouseStats; history: CostPoint[]; locale: Locale;
}) {
  return (
    <div className="grid gap-4">
      <div className="card overflow-hidden">
        <div className="px-4 py-3.5">
          <h2 className="caption" style={{ color: "var(--ink)" }}>{t(locale, "admin.warehouse.title")}</h2>
        </div>

        <div className="grid gap-x-6 gap-y-3 border-t px-4 py-3.5 sm:grid-cols-3" style={{ borderColor: "var(--separator)" }}>
          <Stat label={t(locale, "admin.warehouse.parcels")} value={String(stats.parcels)} />
          <Stat label={t(locale, "admin.warehouse.daily")} value={usd(stats.dailyCost, locale)} tone="var(--stamp)" />
          <Stat label={t(locale, "admin.warehouse.accrued")} value={usd(stats.accruedCost, locale)} />
          <Stat label={t(locale, "admin.warehouse.oldest")} value={t(locale, "unfulfilled.days", { days: stats.oldestDays })} />
          <Stat label={t(locale, "admin.warehouse.median")} value={t(locale, "unfulfilled.days", { days: stats.medianDays })} />
          <Stat label={t(locale, "admin.warehouse.unidentified")} value={String(stats.unidentified)} />
        </div>

        {/* Starostni razredi so isti kot v seznamu za odpremo — ista pravila,
            ista imena, da se številki tu in tam ujemata. */}
        <div className="border-t px-4 py-3.5" style={{ borderColor: "var(--separator)" }}>
          <p className="caption text-label-3">{t(locale, "admin.warehouse.tiers")}</p>
          {/* Skupna mreža: oznake, števila in vrstice stojijo v istih stolpcih. */}
          <div className="mt-2 grid grid-cols-[minmax(0,max-content)_auto_minmax(80px,1fr)] items-center gap-x-4 gap-y-1.5">
            <Tier color="var(--success)" label={t(locale, "admin.warehouse.tierFree")} count={stats.byTier.free} total={stats.parcels} />
            <Tier color="var(--warning)" label={t(locale, "admin.warehouse.tierWarning")} count={stats.byTier.warning} total={stats.parcels} />
            <Tier
              color="var(--stamp)"
              label={stats.maxAgeDays > 0 ? t(locale, "admin.warehouse.tierDangerUpTo", { days: stats.maxAgeDays }) : t(locale, "admin.warehouse.tierDanger")}
              count={stats.byTier.danger}
              total={stats.parcels}
            />
            {stats.maxAgeDays > 0 && (
              <Tier color="var(--stamp-deep)" label={t(locale, "admin.warehouse.tierTooOld", { days: stats.maxAgeDays })} count={stats.old.notShipping} total={stats.parcels} />
            )}
            {/* Čez prag, a še v igri ali izven odpreme — pokažemo le, kadar so. */}
            {stats.old.rareWaiting > 0 && (
              <Tier color="var(--petrol)" label={t(locale, "admin.warehouse.tierRareWaiting", { days: stats.maxAgeDays })} count={stats.old.rareWaiting} total={stats.parcels} />
            )}
            {stats.old.other > 0 && (
              <Tier color="var(--ink-3)" label={t(locale, "admin.warehouse.tierOldOther", { days: stats.maxAgeDays })} count={stats.old.other} total={stats.parcels} />
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3.5">
          <h2 className="caption" style={{ color: "var(--ink)" }}>{t(locale, "admin.warehouse.chartTitle")}</h2>
          <p className="mt-1 max-w-[80ch] text-[12px] text-label-2">{t(locale, "admin.warehouse.chartIntro")}</p>
        </div>
        <div className="border-t px-4 py-3.5" style={{ borderColor: "var(--separator)" }}>
          <CostChart points={history} />
          <p className="mt-3 max-w-[80ch] text-[11.5px] text-label-3">{t(locale, "admin.warehouse.chartCaveat")}</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="caption text-label-3">{label}</div>
      {/* Stopnja "key" iz DESIGN.md: mono 600 / 19px — številka, ki jo nekdo
          prebere in primerja, ne okrasek. */}
      <div className="mono mt-1 text-[19px] font-semibold leading-none tracking-[-0.02em]" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
    </div>
  );
}

/** Delež kot tanka črta pod imenom — brez tortnega grafa za tri vrednosti. */
function Tier({ color, label, count, total }: { color: string; label: string; count: number; total: number }) {
  const share = total > 0 ? (count / total) * 100 : 0;
  return (
    <>
      <span className="text-[12.5px]">{label}</span>
      <span className="mono text-right text-[12.5px] tabular-nums" style={{ color }}>{count}</span>
      <span className="h-[6px]" style={{ background: "var(--wash)" }}>
        <span className="block h-full" style={{ width: `${share}%`, background: color }} />
      </span>
    </>
  );
}
