import { db } from "@/lib/db";
import { rankPackages, suggestedReturnRows, type RoundItem } from "@/lib/exchange-round";
import { formatDate, formatWeightKg } from "@/lib/format";
import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/shared";
import { AnotherReturnForm, type PackageOption } from "./AnotherReturnForm";

type ReturnIssue = {
  id: number;
  orderNumber: string;
  customerName: string | null;
  exchangeRound: number;
  items: RoundItem[];
};

/** Gumb "Stranka je poslala še eno vračilo" s podatki, ki jih obrazec potrebuje. */
export async function AnotherReturn({ issue, locale, label }: { issue: ReturnIssue; locale: Locale; label?: string }) {
  const active = await db.shipgAllocation.count({
    where: { exchangeIssueId: issue.id, exchangeRound: issue.exchangeRound, status: { in: ["reserved", "dispatching"] } },
  });

  return (
    <AnotherReturnForm
      label={label}
      issueId={issue.id}
      orderNumber={issue.orderNumber}
      nextRound={issue.exchangeRound + 1}
      blocked={active > 0 ? t(locale, "round.blocked.active") : null}
      suggestion={suggestedReturnRows(issue.items)}
      packages={active > 0 ? { suggested: [], other: [] } : await unlinkedPackages(issue.customerName, locale)}
    />
  );
}

/** Paketi v ShipGermanu, ki še niso pripeti nobenemu zapisu registra. */
async function unlinkedPackages(customerName: string | null, locale: Locale): Promise<{ suggested: PackageOption[]; other: PackageOption[] }> {
  const linked = await db.shipgReturn.findMany({ where: { shipgermanParcelId: { not: null } }, select: { shipgermanParcelId: true } });
  const parcels = await db.shipGermanCachedParcel.findMany({
    where: { active: true, id: { notIn: linked.flatMap((row) => (row.shipgermanParcelId ? [row.shipgermanParcelId] : [])) } },
    orderBy: { arrivalDate: "desc" },
    take: 300,
    select: { id: true, sender: true, trackingNumber: true, arrivalDate: true, weightGrams: true },
  });
  const ranked = rankPackages(parcels, customerName);
  const option = (parcel: (typeof parcels)[number]): PackageOption => ({
    id: parcel.id,
    sender: parcel.sender || "—",
    arrived: formatDate(parcel.arrivalDate, locale),
    weight: formatWeightKg(parcel.weightGrams, locale),
    tracking: parcel.trackingNumber,
  });
  return { suggested: ranked.suggested.map(option), other: ranked.other.map(option) };
}
