"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserStrict } from "../auth";
import { ensureCatalog } from "../catalog-server";
import { loadSettings, loadTextSettings } from "../config/server";
import { db } from "../db";
import { createExchangeShippedDraft } from "../customer-draft";
import { canAccessShipg, canDispatchMatch, entryStance, hasPendingResolution, isShipgermanMarket } from "../domain";
import { canonicalLabel } from "../catalog-canonical";
import { findOrder } from "../shopify";
import { addressLine } from "../supplier-address";
import { supplierOrderCode } from "../supplier-import";
import { t } from "../i18n/server";
import { hasUnsettledPriceDiff } from "../exchange-price";
import { shipCutoff } from "../ship-cutoff";
import { exchangeDemand, findExactPackageMatches } from "../shipg-matching";
import { getCachedShipGermanParcels } from "../shipgerman-sync";

function ids(fd: FormData, name: string) {
  return fd.getAll(name).flatMap((value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? [id] : [];
  });
}

async function context(fd: FormData) {
  const me = await requireUserStrict();
  if (!canAccessShipg(me)) throw new Error("Forbidden");
  await ensureCatalog();
  const issueId = Number(fd.get("issueId"));
  const issue = Number.isInteger(issueId) && issueId > 0
    ? await db.issue.findUnique({ where: { id: issueId }, include: { items: true, shipgAllocations: true, assignee: { select: { name: true } } } })
    : null;
  if (!issue) redirect("/orders");
  return { me, issue };
}

/** Rezervacije tekočega kroga menjave. */
function currentRound(issue: { exchangeRound: number; shipgAllocations: { exchangeRound: number; status: string }[] }) {
  return issue.shipgAllocations.filter((item) => item.exchangeRound === issue.exchangeRound);
}

function back(key: string, result: string): never {
  revalidatePath(`/orders/${key}`);
  revalidatePath("/shipg");
  revalidatePath("/dobavitelj");
  redirect(`/orders/${key}?shipgAllocation=${result}`);
}

export async function reserveShipgPackages(fd: FormData): Promise<void> {
  const { me, issue } = await context(fd);
  const selectedIds = [...new Set(ids(fd, "shipgReturnId"))];
  // Ključno je, da naročilo vsebuje artikel z zamenjavo — tip celega naročila je
  // lahko refund (mešano naročilo), pa vseeno potrebuje ShipGerman paket.
  const hasExchangeItem = issue.items.some((item) => item.resolution === "exchange");
  if (!hasExchangeItem || !isShipgermanMarket(issue.customerCountryCode) || selectedIds.length === 0) {
    back(issue.key, "invalid");
  }
  const demand = exchangeDemand(issue.items);
  if (!demand.length || issue.items.some((item) => item.resolution === "exchange" && !item.replacementVariant)) {
    back(issue.key, "invalid");
  }
  // Menjava v drug izdelek pomeni razliko v ceni. Dokler nihče ne potrdi, da je
  // urejena, paket ne sme oditi — dražji kos, odposlan brez doplačila, je izguba.
  if (hasUnsettledPriceDiff(issue.items, issue.currency)) {
    back(issue.key, "priceDiff");
  }

  const [records, live] = await Promise.all([
    db.shipgReturn.findMany({
      where: { id: { in: selectedIds }, status: "stocked" },
      include: { items: true, allocation: true },
    }),
    getCachedShipGermanParcels(),
  ]);
  if (records.length !== selectedIds.length) back(issue.key, "stale");
  // Dvomljivo ujemanje ustavimo z lastnim sporočilom; sicer bi rezervacija
  // spodletela kot "stale", čeprav se zaloga ni spremenila.
  if (records.some((record) => !canDispatchMatch(record.matchQuality))) back(issue.key, "lowConfidence");
  const matches = findExactPackageMatches(demand, records.map((record) => ({
    id: record.id,
    trackingNumber: record.trackingNumber,
    externalParcelId: record.shipgermanParcelId,
    allocated: Boolean(record.allocation),
    matchQuality: record.matchQuality,
    items: record.items.map((item) => ({
      name: item.name,
      variant: item.variant,
      qty: item.receivedQty > 0 ? item.receivedQty : item.expectedQty,
    })),
  })), live, undefined, undefined, shipCutoff(await loadSettings()));
  const match = matches.find((candidate) => {
    const found = candidate.packages.map((item) => item.shipgReturnId).sort((a, b) => a - b);
    return found.length === selectedIds.length && found.every((id, index) => id === [...selectedIds].sort((a, b) => a - b)[index]);
  });
  if (!match) back(issue.key, "stale");

  try {
    await db.$transaction(async (tx) => {
      // Odposlan paket prejšnjega kroga je zgodovina; zaklene samo rezervacija
      // tekočega kroga.
      if (currentRound(issue).length) throw new Error("already-reserved");
      for (const item of match.packages) {
        await tx.shipgAllocation.create({
          data: {
            shipgReturnId: item.shipgReturnId,
            exchangeIssueId: issue.id,
            exchangeRound: issue.exchangeRound,
            externalParcelId: item.parcel.id,
            reservedById: me.id,
          },
        });
      }
      await tx.event.create({
        data: {
          issueId: issue.id,
          kind: "system",
          field: "shipg_allocation",
          fromValue: null,
          toValue: "reserved",
          body: match.packages.map((item) => `ShipGerman ${item.parcel.id}`).join(", "),
          authorId: me.id,
        },
      });
      // Paket imamo sami: zahteva, ki je dobavitelj še ni prenesel, odpade.
      // Prenesene ne prekličemo — dobavitelj jo morda že pakira; kartica in
      // seznam pokažeta opozorilo, preklic je dogovor z njim.
      const unsent = await tx.supplierOrder.findMany({
        where: { issueId: issue.id, exchangeRound: issue.exchangeRound, status: "open" },
        select: { id: true },
      });
      for (const order of unsent) {
        await tx.supplierOrder.update({ where: { id: order.id }, data: { status: "cancelled" } });
        await tx.event.create({
          data: {
            issueId: issue.id, kind: "system", field: "supplier_order", fromValue: "open", toValue: "cancelled",
            body: `${supplierOrderCode(order.id)} · ShipGerman`, authorId: me.id,
          },
        });
      }
    });
  } catch (error) {
    console.error("ShipGerman reservation failed", error);
    back(issue.key, "stale");
  }
  back(issue.key, "reserved");
}

export async function releaseShipgPackages(fd: FormData): Promise<void> {
  const { me, issue } = await context(fd);
  const current = currentRound(issue);
  if (!current.length) back(issue.key, "invalid");
  if (current.some((item) => item.status === "shipped")) back(issue.key, "invalid");
  await db.$transaction([
    db.shipgAllocation.deleteMany({ where: { exchangeIssueId: issue.id, exchangeRound: issue.exchangeRound, status: { in: ["reserved", "dispatching"] } } }),
    db.event.create({ data: { issueId: issue.id, kind: "system", field: "shipg_allocation", fromValue: "reserved", toValue: "released", authorId: me.id } }),
  ]);
  back(issue.key, "released");
}

/**
 * Želenega kosa ni v zalogi: naroči ga pri dobavitelju. Zahteva gre na seznam
 * za dobavitelja (stran Dobavitelj, izvoz v Excel), v ticket pa zapis, kaj in
 * kam. Ticket ostane pri tistem, ki ga obravnava — ko dobavitelj vrne
 * tracking, se ta zapiše nazaj v ticket in pripravi se pismo stranki.
 *
 * Seznam kosov je isti, kot ga kartica kaže pod "iščem", da se zahteva ne
 * razlikuje od tega, kar je Desk iskal v zalogi. Naslov je posnetek iz
 * Shopifyja ob zahtevi.
 */
export async function requestSupplierExchange(fd: FormData): Promise<void> {
  const { me, issue } = await context(fd);
  const demand = exchangeDemand(issue.items);
  if (!demand.length) back(issue.key, "invalid");
  if (hasPendingResolution(issue.items)) back(issue.key, "resolutionPending");
  if (hasUnsettledPriceDiff(issue.items, issue.currency)) back(issue.key, "priceDiff");

  const pending = await db.supplierOrder.findFirst({
    where: { issueId: issue.id, exchangeRound: issue.exchangeRound, status: { in: ["open", "exported"] } },
    select: { id: true },
  });
  if (pending) back(issue.key, "supplierNoted");

  const address = await shippingAddressFor(issue);
  const items = demand.map((item) => ({ qty: item.qty, name: item.name, variant: item.variant }));
  const wanted = demand.map((item) => `${item.qty}× ${canonicalLabel(item.name, item.variant)}`).join(", ");
  const supplier = (await loadTextSettings()).supplierName;
  const outsider = entryStance(issue, me) === "outsider";

  await db.$transaction(async (tx) => {
    const order = await tx.supplierOrder.create({
      data: {
        issueId: issue.id,
        exchangeRound: issue.exchangeRound,
        items: JSON.stringify(items),
        ...address,
        email: issue.customerEmail,
        createdById: me.id,
      },
    });
    await tx.event.create({
      data: {
        issueId: issue.id,
        kind: "comment",
        body: t(me.locale, "shipg.exchange.supplierNote", {
          items: wanted,
          supplier,
          code: supplierOrderCode(order.id),
          address: addressLine(address) || "—",
        }),
        authorId: me.id,
        outsider,
      },
    });
    await tx.issue.update({ where: { id: issue.id }, data: { updatedAt: new Date() } });
  });

  back(issue.key, "supplierRequested");
}

type SnapshotAddress = {
  recipient: string | null; company: string | null; address1: string | null; address2: string | null;
  zip: string | null; city: string | null; province: string | null; country: string | null;
  countryCode: string | null; phone: string | null;
};

/** Naslov po poljih iz Shopifyja; brez povezave ostane vrstica iz ticketa. */
async function shippingAddressFor(issue: {
  orderNumber: string; customerName: string | null; customerPhone: string | null;
  customerAddress: string | null; customerCountryCode: string | null;
}): Promise<SnapshotAddress> {
  try {
    const order = await findOrder(issue.orderNumber);
    const address = order?.shippingAddress;
    if (address) {
      return {
        recipient: address.name || issue.customerName,
        company: address.company,
        address1: address.address1,
        address2: address.address2,
        zip: address.zip,
        city: address.city,
        province: address.province,
        country: address.country,
        countryCode: address.countryCode ?? issue.customerCountryCode,
        phone: address.phone || issue.customerPhone,
      };
    }
  } catch (error) {
    console.error("Supplier address lookup failed", error);
  }
  return {
    recipient: issue.customerName, company: null, address1: issue.customerAddress, address2: null,
    zip: null, city: null, province: null, country: null,
    countryCode: issue.customerCountryCode, phone: issue.customerPhone,
  };
}

/** Gotovost ujemanja preverimo tik pred odpremo — po rezervaciji jo je lahko
 *  kdo znižal, prav zato ker je opazil, da paket morda ni pravi. */
async function hasDoubtfulMatch(issueId: number): Promise<boolean> {
  const allocations = await db.shipgAllocation.findMany({
    // Samo paketi, ki še niso odšli — dvom o že odposlanem paketu prejšnjega
    // kroga ne sme ustaviti nove odpreme.
    where: { exchangeIssueId: issueId, status: { in: ["reserved", "dispatching"] } },
    select: { shipgReturn: { select: { matchQuality: true } } },
  });
  return allocations.some((allocation) => !canDispatchMatch(allocation.shipgReturn?.matchQuality));
}

/** Označi rezervirane pakete kot "v odpremi". ShipGerman odpremo odpre povezava
 *  v vmesniku (nov zavihek), zato tu namenoma ne preusmerjamo — server action bi
 *  `target="_blank"` ignorirala in odpremo odprla v istem zavihku. */
export async function prepareShipgDispatch(fd: FormData): Promise<void> {
  const { me, issue } = await context(fd);
  const allocations = issue.shipgAllocations.filter((item) => ["reserved", "dispatching"].includes(item.status));
  if (!allocations.length || !isShipgermanMarket(issue.customerCountryCode)) back(issue.key, "invalid");
  if (await hasDoubtfulMatch(issue.id)) back(issue.key, "lowConfidence");
  await db.$transaction([
    db.shipgAllocation.updateMany({ where: { exchangeIssueId: issue.id, status: "reserved" }, data: { status: "dispatching" } }),
    db.event.create({ data: { issueId: issue.id, kind: "system", field: "shipg_allocation", fromValue: "reserved", toValue: "dispatching", body: allocations.map((item) => `ShipGerman ${item.externalParcelId}`).join(", "), authorId: me.id } }),
  ]);
  revalidatePath(`/orders/${issue.key}`);
}

/** Ročna potrditev, da je paket dejansko odposlan. Stanje "shipped" pomeni, da
 *  je zaposleni v ShipGermanu zaključil odpremo. Ali je paket res zapustil
 *  skladišče, se izpelje iz scrape-a (paket izgine iz aktivne zaloge). */
export async function markShipgShipped(fd: FormData): Promise<void> {
  const { me, issue } = await context(fd);
  const pending = issue.shipgAllocations.filter((item) => ["reserved", "dispatching"].includes(item.status));
  if (!pending.length) back(issue.key, "invalid");
  if (await hasDoubtfulMatch(issue.id)) back(issue.key, "lowConfidence");
  await db.$transaction([
    db.shipgAllocation.updateMany({ where: { exchangeIssueId: issue.id, status: { in: ["reserved", "dispatching"] } }, data: { status: "shipped" } }),
    db.event.create({ data: { issueId: issue.id, kind: "system", field: "shipg_allocation", fromValue: "dispatching", toValue: "shipped", body: pending.map((item) => `ShipGerman ${item.externalParcelId}`).join(", "), authorId: me.id } }),
  ]);
  // Od tu naprej je nadomestek pri stranki na poti — pripravimo pismo, ki jo o
  // tem obvesti. Osnutek je spremljevalec odpreme: če spodleti, odprema velja.
  try {
    await createExchangeShippedDraft(issue, me.id);
  } catch (error) {
    console.error("Customer email draft failed", error);
  }
  back(issue.key, "shipped");
}
