import { db } from "@/lib/db";
import { expectedReturnLines, rankPackages, type RoundItem } from "@/lib/exchange-round";
import { formatDate, formatWeightKg } from "@/lib/format";
import type { Locale } from "@/lib/i18n/shared";
import { normalizeShipGermanTracking } from "@/lib/shipgerman-data";
import { IssueParcelLinkForm, type LinkPackage, type OpenReturn } from "./IssueParcelLinkForm";

type LinkIssue = {
  id: number;
  exchangeRound: number;
  items: RoundItem[];
  customerName: string | null;
  returnTracking: string | null;
  parcels: { number: string; direction: string }[];
};

/**
 * "Poveži paket" v skupini Skladišče: odprto vračilo ticketa, ki še nima
 * fizičnega paketa, poveže z neobdelanim paketom iz ShipGermana — brez obiska
 * registra. Kadar vračila še ni, ga povezava vpiše iz artiklov, ki se vračajo
 * (namesto posebnega koraka "Paket je pri nas"). Brez česa za vrniti gumba ni.
 */
/** Oznaka "vračilo še ni vpisano": strežnik ga ustvari ob povezavi. */
const NEW_RETURN = 0;

export async function IssueParcelLink({ issue, locale, label }: { issue: LinkIssue; locale: Locale; label: string }) {
  const records = await db.shipgReturn.findMany({
    where: { issueId: issue.id, status: { in: ["check", "expected", "exception"] }, shipgermanParcelId: null, allocation: { is: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      exchangeRound: true,
      trackingNumber: true,
      createdAt: true,
      items: { orderBy: { position: "asc" }, select: { name: true, variant: true, expectedQty: true } },
    },
  });
  // Vračila še ni: povezava ga ustvari iz artiklov tekočega kroga, ki se vračajo.
  // Drug paket istega kroga gre skozi "Še eno vračilo", ne sem.
  const roundHasReturn = records.length > 0 ||
    (await db.shipgReturn.count({ where: { issueId: issue.id, exchangeRound: issue.exchangeRound } })) > 0;
  const fresh = roundHasReturn ? [] : expectedReturnLines(issue.exchangeRound, issue.exchangeRound, issue.items, []);
  if (records.length === 0 && fresh.length === 0) return null;

  const linked = await db.shipgReturn.findMany({ where: { shipgermanParcelId: { not: null } }, select: { shipgermanParcelId: true } });
  const parcels = await db.shipGermanCachedParcel.findMany({
    where: { active: true, id: { notIn: linked.flatMap((row) => (row.shipgermanParcelId ? [row.shipgermanParcelId] : [])) } },
    orderBy: { arrivalDate: "desc" },
    take: 300,
    select: { id: true, sender: true, trackingNumber: true, arrivalDate: true, weightGrams: true },
  });

  // Tracking vračila, ki ga stranka pošlje, je tudi dohodni tracking paketa v
  // ShipGermanu — tak paket je skoraj gotovo pravi, zato gre na vrh.
  const knownTracking = new Set([
    issue.returnTracking,
    ...issue.parcels.filter((parcel) => parcel.direction === "return").map((parcel) => parcel.number),
    ...records.map((record) => record.trackingNumber),
  ].flatMap((value) => {
    const tracking = normalizeShipGermanTracking(value);
    return tracking ? [tracking] : [];
  }));
  const trackingMatches = (parcel: (typeof parcels)[number]) => {
    const tracking = normalizeShipGermanTracking(parcel.trackingNumber);
    return tracking !== null && knownTracking.has(tracking);
  };
  const byTracking = parcels.filter(trackingMatches);
  const ranked = rankPackages(parcels.filter((parcel) => !trackingMatches(parcel)), issue.customerName);

  const option = (parcel: (typeof parcels)[number]): LinkPackage => ({
    id: parcel.id,
    sender: parcel.sender || "—",
    arrived: formatDate(parcel.arrivalDate, locale),
    weight: formatWeightKg(parcel.weightGrams, locale),
    tracking: parcel.trackingNumber,
    trackingMatch: trackingMatches(parcel),
  });
  const openReturns: OpenReturn[] = records.length > 0
    ? records.map((record) => ({
        id: record.id,
        round: record.exchangeRound,
        added: formatDate(record.createdAt, locale),
        contents: record.items.map((item) => `${item.expectedQty}× ${item.name}${item.variant ? ` (${item.variant})` : ""}`).join(", "),
      }))
    : [{
        id: NEW_RETURN,
        round: issue.exchangeRound,
        added: formatDate(new Date(), locale),
        contents: fresh.map((line) => `${line.qty}× ${line.name}${line.variant ? ` (${line.variant})` : ""}`).join(", "),
      }];

  return (
    <IssueParcelLinkForm
      label={label}
      issueId={issue.id}
      returns={openReturns}
      packages={{ suggested: [...byTracking, ...ranked.suggested].map(option), other: ranked.other.map(option) }}
    />
  );
}
