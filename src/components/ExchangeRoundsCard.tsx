import { RotateCcw } from "lucide-react";

import { db } from "@/lib/db";
import {
  heldAfterRound,
  isRoundFault,
  parseLines,
  returningNow,
  roundBlocker,
  roundSummary,
  type RoundItem,
} from "@/lib/exchange-round";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/shared";
import { ExchangeRoundActions } from "./ExchangeRoundActions";

type RoundsIssue = {
  id: number;
  exchangeRound: number;
  exchangeFault: string | null;
  items: RoundItem[];
};

/**
 * Krogi menjave naročila: v katerem krogu smo, zakaj, in kako so se končali
 * prejšnji. Od tu se začne nov krog, v katerem stranka kos obdrži; še eno
 * vračilo se vpiše ob "Poglej v ShipG" (AnotherReturn).
 */
export async function ExchangeRoundsCard({ issue, locale, canShipg }: { issue: RoundsIssue; locale: Locale; canShipg: boolean }) {
  const [rounds, active] = await Promise.all([
    db.exchangeRound.findMany({
      where: { issueId: issue.id },
      orderBy: { number: "asc" },
      include: { startedBy: { select: { name: true } } },
    }),
    db.shipgAllocation.count({
      where: { exchangeIssueId: issue.id, exchangeRound: issue.exchangeRound, status: { in: ["reserved", "dispatching"] } },
    }),
  ]);

  const canNewRound = roundBlocker(issue.items, 0) === null;
  const fault = issue.exchangeRound > 1 && isRoundFault(issue.exchangeFault) ? issue.exchangeFault : null;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pb-2.5 pt-3.5">
        <h3 className="caption flex items-center gap-2" style={{ color: "var(--ink)" }}>
          <RotateCcw size={14} />
          {t(locale, "round.title")}
        </h3>
        <span className="pill pill-ink">
          {issue.exchangeRound > 1 ? t(locale, "round.current", { round: issue.exchangeRound }) : t(locale, "round.first")}
        </span>
      </div>

      {fault && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--separator)" }}>
          <p className="text-[13px] font-medium">{t(locale, `round.fault.${fault}`)}</p>
          <p className="mt-0.5 max-w-[70ch] text-[12.5px] text-label-2">
            {fault === "ours"
              ? t(locale, "round.hint.ours")
              : t(locale, "round.hint.customer", { items: returningNow(issue.items) || t(locale, "round.none") })}
          </p>
        </div>
      )}

      {rounds.length > 0 && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--separator)" }}>
          <p className="caption">{t(locale, "round.history")}</p>
          <ol className="mt-2 grid gap-2.5">
            {rounds.map((round) => (
              <li key={round.id} className="grid gap-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="mono text-[11.5px] text-label-3">{t(locale, "round.current", { round: round.number - 1 })}</span>
                  <span className="mono text-[12.5px]">{roundSummary(parseLines(round.previous)) || "—"}</span>
                </div>
                <p className="text-[12px] text-label-2">
                  {t(locale, "round.current", { round: round.number })}:{" "}
                  {isRoundFault(round.fault) ? t(locale, `round.fault.${round.fault}`) : round.fault}
                </p>
                {round.note && <p className="max-w-[70ch] text-[12px] text-label-2">{round.note}</p>}
                <p className="text-[11.5px] text-label-3">
                  {t(locale, "round.startedBy", { name: round.startedBy?.name ?? "—", date: formatDate(round.createdAt, locale) })}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="border-t px-4 py-2.5" style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}>
        <ExchangeRoundActions
          issueId={issue.id}
          nextRound={issue.exchangeRound + 1}
          blocked={active > 0 ? t(locale, "round.blocked.active") : null}
          canNewRound={canNewRound}
          canShipg={canShipg}
          holding={heldAfterRound(issue.items) || "—"}
        />
      </div>
    </section>
  );
}
