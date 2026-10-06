import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, HelpCircle, Layers, List, Plus, Search, X } from "lucide-react";

import { OutboundWorklistPanel } from "@/components/OutboundWorklist";
import { ShipgReturnRow, type ShipgReturnView } from "@/components/ShipgReturnRow";
import { ShipGermanParcelTable, type ShipGermanMatch } from "@/components/ShipGermanParcelTable";
import { ShipgInventoryTable, type InventoryRow, type InventoryPackage } from "@/components/ShipgInventoryTable";
import { StockMatchPopup } from "@/components/StockMatchPopup";
import { ShipgShippedTable, type ShippedRow } from "@/components/ShipgShippedTable";
import { ShipgPendingLink } from "@/components/ShipgPendingLink";
import { ShipgBulkCheck } from "@/components/ShipgBulkCheck";
import { EmptyState, Notice } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { canonicalKey, canonicalLabel } from "@/lib/catalog-canonical";
import { ensureCatalog } from "@/lib/catalog-server";
import { loadSettings } from "@/lib/config/server";
import { db } from "@/lib/db";
import { shipCutoff, tooOldToShip } from "@/lib/ship-cutoff";
import { storageDays } from "@/lib/storage-cost";
import { isIgnorableShipgItem } from "@/lib/shipg-matching";
import { isBulkEligible } from "@/lib/shipg-bulk";
import { normalizeShipGermanTracking } from "@/lib/shipgerman-data";
import { mergeDiff } from "@/lib/shipg-merge";
import { canAccessShipg, shipmentOrigin } from "@/lib/domain";
import { formatDate, formatDateTime } from "@/lib/format";
import { t } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { cachedShipGermanParcel, SHIPGERMAN_SYNC_KEY } from "@/lib/shipgerman-sync";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
// Glavni zavihki sledijo poti paketa: pride (Za preverit), leži (Zaloga), gre k
// naročilu (Za odpremo), odide (Odposlano). Odstopanja so pomožna akcija desno,
// ne zavihek. Zaloga ima lečo (seznam pošiljk / po sestavi) in filtre
// (neidentificirano / brez pošiljke).
const PRIMARY_VIEWS = ["check", "stock", "outbound", "shipped"] as const;
const ALL_VIEWS = [...PRIMARY_VIEWS, "exception"] as const;

export default async function ShipgPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireUser();
  await ensureCatalog();
  if (!canAccessShipg(me)) redirect("/orders");

  const params = await searchParams;
  const one = (name: string) => {
    const value = params[name];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  // Stari naslov (Za odpremo kot leča pod Zalogo) živi v poslanih mailih in zaznamkih.
  if (one("view") === "stock" && one("lens") === "outbound") {
    const next = new URLSearchParams({ view: "outbound" });
    for (const name of ["state", "found", "only", "sort"]) {
      const value = one(name);
      if (value) next.set(name, value);
    }
    redirect(`/shipg?${next.toString()}`);
  }
  const requestedView = one("view");
  const view = ALL_VIEWS.includes(requestedView as never) ? requestedView! : "check";
  const stockView = view === "stock";
  const shippedView = view === "shipped";
  const lens = stockView && one("lens") === "composition" ? "composition" : "list";
  // "Za odpremo" ima svoje poizvedbe (Shopify naročila) — seznam in filtri
  // zaloge se zanj ne poženejo, ker stockView ni aktiven.
  const outboundView = view === "outbound";
  const rawFilter = one("filter");
  const listLens = stockView && lens === "list";
  const unlinkedView = listLens && rawFilter === "unlinked";
  const externalView = listLens && !unlinkedView;
  const inventoryView = stockView && lens === "composition";
  const internalListView = view === "check" || view === "exception" || unlinkedView;
  const onlyUnidentifiable = externalView && rawFilter === "unidentifiable";
  const unmatchedView = externalView && rawFilter === "unmatched";
  const q = one("q")?.slice(0, 80);
  const page = Math.max(1, Number.parseInt(one("page") ?? "1", 10) || 1);
  const pageSize = 100;
  const saved = one("saved");
  // Ravnokar vpisan paket: list z naročili, ki ga lahko porabijo.
  const rawStockMatch = Number(one("matches"));
  const stockMatchId = stockView && Number.isInteger(rawStockMatch) && rawStockMatch > 0 ? rawStockMatch : null;
  const error = one("error");
  const sort = one("sort") === "oldest" ? "oldest" : "newest";
  const activeFilter = onlyUnidentifiable ? "unidentifiable" : unmatchedView ? "unmatched" : unlinkedView ? "unlinked" : undefined;

  // Notranji seznam vračil pokriva tri primere: Za preverit (check + expected),
  // Odstopanja, in Zaloga → filter "brez pošiljke" (vpisano, a brez ShipGerman
  // paketa). Sicer status ne ustreza ničemur (renderira se pošiljke/sestava).
  const where = {
    ...(view === "check"
      ? { status: { in: ["check", "expected"] } }
      : view === "exception"
        ? { status: "exception" }
        : unlinkedView
          ? { status: "stocked", shipgermanParcelId: null }
          : { status: "__none__" }),
    ...(q ? {
      OR: [
        { orderNumber: { contains: q } },
        { customerName: { contains: q } },
        { trackingNumber: { contains: q.replace(/\s+/g, "") } },
        { items: { some: { OR: [{ name: { contains: q } }, { variant: { contains: q } }] } } },
      ],
    } : {}),
  };
  // ShipGerman pošiljke, ki so že povezane z zapisom zaloge (obstaja ticket).
  // Za filter "Za identificirati" pokažemo tiste BREZ takega zapisa in ki niso
  // ročno označene kot neidentificirane — torej za katere še ne vemo, kaj so.
  const linkedParcelIds = listLens
    ? (await db.shipgReturn.findMany({ where: { shipgermanParcelId: { not: null } }, select: { shipgermanParcelId: true } }))
        .flatMap((record) => (record.shipgermanParcelId ? [record.shipgermanParcelId] : []))
    : [];
  const externalWhere = {
    active: true,
    ...(onlyUnidentifiable ? { unidentifiable: true } : {}),
    ...(unmatchedView ? { unidentifiable: false, id: { notIn: linkedParcelIds } } : {}),
    ...(q ? {
      OR: [
        { id: { contains: q } },
        { sender: { contains: q } },
        { trackingNumber: { contains: q.replace(/\s+/g, "") } },
        { carrier: { contains: q } },
        { barcode: { contains: q } },
      ],
    } : {}),
  };

  const [records, internalFilteredTotal, expected, check, exception, shippedCount, cachedRows, externalFilteredTotal, externalTotal, unidentifiableTotal, unmatchedTotal, unlinkedTotal, syncState, internalParcelRows, occupiedParcelRows] = await Promise.all([
    internalListView ? db.shipgReturn.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        issue: { select: { key: true } },
        parcel: { select: { carrierName: true, state: true, lastEventText: true, checkedAt: true } },
        createdBy: { select: { name: true } },
        verifiedBy: { select: { name: true } },
        allocation: { select: { id: true } },
        items: { orderBy: { position: "asc" } },
      },
    }) : Promise.resolve([]),
    internalListView ? db.shipgReturn.count({ where }) : Promise.resolve(0),
    db.shipgReturn.count({ where: { status: "expected" } }),
    db.shipgReturn.count({ where: { status: "check" } }),
    db.shipgReturn.count({ where: { status: "exception" } }),
    db.shipGermanCachedShipment.count({ where: { status: { in: ["Shipped", "ReadyForProcessing"] } } }),
    externalView ? db.shipGermanCachedParcel.findMany({
      where: externalWhere,
      orderBy: { arrivalDate: sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }) : Promise.resolve([]),
    externalView ? db.shipGermanCachedParcel.count({ where: externalWhere }) : Promise.resolve(0),
    db.shipGermanCachedParcel.count({ where: { active: true } }),
    externalView ? db.shipGermanCachedParcel.count({ where: { active: true, unidentifiable: true } }) : Promise.resolve(0),
    listLens ? db.shipGermanCachedParcel.count({ where: { active: true, unidentifiable: false, id: { notIn: linkedParcelIds } } }) : Promise.resolve(0),
    listLens ? db.shipgReturn.count({ where: { status: "stocked", shipgermanParcelId: null } }) : Promise.resolve(0),
    externalView ? db.shipGermanSyncState.findUnique({ where: { key: SHIPGERMAN_SYNC_KEY } }) : Promise.resolve(null),
    externalView ? Promise.resolve([]) : db.shipGermanCachedParcel.findMany({
      orderBy: { arrivalDate: "desc" },
      select: { id: true, active: true, arrivalDate: true, sender: true, trackingNumber: true, carrier: true },
    }),
    externalView ? Promise.resolve([]) : db.shipgReturn.findMany({
      where: { shipgermanParcelId: { not: null } },
      select: { shipgermanParcelId: true },
    }),
  ]);

  const matchRecords = externalView ? await db.shipgReturn.findMany({
    select: {
      id: true,
      trackingNumber: true,
      shipgermanParcelId: true,
      shipgermanMatchSource: true,
      matchQuality: true,
      orderNumber: true,
      customerName: true,
      status: true,
      issue: { select: { key: true } },
      allocation: { select: { id: true } },
      items: { orderBy: { position: "asc" }, select: { name: true, variant: true, expectedQty: true, receivedQty: true } },
    },
    orderBy: { updatedAt: "desc" },
  }) : [];

  // Agregacija zaloge po SESTAVI paketa. Paket je najmanjša enota, ki jo lahko
  // pošljemo — kosov iz paketa ne moremo ločiti — zato štejemo pakete, ne kosov,
  // in "samo črne hlače M" ločimo od "črne hlače M + jakna". Pas/očala kot
  // brezplačna dodatka izpustimo iz sestave (glej isIgnorableShipgItem).
  const stockedPackages = inventoryView ? await db.shipgReturn.findMany({
    // Poslana zaloga (alokacija "shipped") je fizično zapustila skladišče, zato
    // je v pregledu po sestavi ne štejemo — pripada zavihku Odposlano.
    where: { status: "stocked", NOT: { allocation: { is: { status: "shipped" } } } },
    select: {
      id: true,
      orderNumber: true,
      trackingNumber: true,
      shipgermanParcelId: true,
      allocation: { select: { id: true } },
      issue: { select: { key: true } },
      items: { orderBy: { position: "asc" }, select: { name: true, variant: true, receivedQty: true, expectedQty: true } },
    },
  }) : [];
  const parcelMeta = new Map(internalParcelRows.map((parcel) => [parcel.id, parcel]));
  const cutoff = shipCutoff(await loadSettings());
  // Nepovezan zapis ujemanje najde prek trackinga živega paketa — enako ga štejemo tu.
  const liveParcelByTracking = new Map(internalParcelRows.flatMap((parcel) => {
    const tracking = parcel.active ? normalizeShipGermanTracking(parcel.trackingNumber) : null;
    return tracking ? [[tracking, parcel] as const] : [];
  }));
  const inventoryMap = new Map<string, InventoryRow>();
  for (const pkg of stockedPackages) {
    const paid = pkg.items.filter((item) => !isIgnorableShipgItem({ name: item.name }));
    const source = paid.length > 0 ? paid : pkg.items;
    const parts = new Map<string, { qty: number; label: string }>();
    for (const item of source) {
      const qty = item.receivedQty > 0 ? item.receivedQty : item.expectedQty;
      if (qty <= 0) continue;
      const key = canonicalKey(item.name, item.variant);
      const entry = parts.get(key) ?? { qty: 0, label: canonicalLabel(item.name, item.variant) };
      entry.qty += qty;
      parts.set(key, entry);
    }
    if (parts.size === 0) continue;
    const ordered = [...parts.entries()].sort(([, a], [, b]) => a.label.localeCompare(b.label));
    const compositionKey = ordered.map(([key, entry]) => `${key}×${entry.qty}`).join(" + ");
    const compositionLabel = ordered.map(([, entry]) => `${entry.qty}× ${entry.label}`).join("  +  ");
    const row = inventoryMap.get(compositionKey)
      ?? { key: compositionKey, label: compositionLabel, available: 0, reserved: 0, blocked: 0, tooOld: 0, packages: [] };
    const reserved = Boolean(pkg.allocation);
    // Na voljo je le paket, ki je fizično v skladišču — isti pogoj kot pri
    // ujemanju (findExactPackageMatches). Tip izvornega naročila ne vpliva.
    const meta = pkg.shipgermanParcelId
      ? parcelMeta.get(pkg.shipgermanParcelId)
      : liveParcelByTracking.get(normalizeShipGermanTracking(pkg.trackingNumber) ?? "");
    const pieces = [...parts.values()].reduce((sum, entry) => sum + entry.qty, 0);
    const blockReason: InventoryPackage["blockReason"] = reserved
      ? null
      : !meta?.active
        ? (pkg.shipgermanParcelId ? "gone" : "unlinked")
        // Enako kot pri ujemanju: čez prag starosti ga ne ponudimo nikomur.
        : meta.arrivalDate && tooOldToShip(storageDays(meta.arrivalDate), paid.length > 0 ? pieces : 0, cutoff)
          ? "tooOld"
          : null;
    if (reserved) row.reserved += 1;
    else if (blockReason === "tooOld") row.tooOld += 1;
    else if (blockReason) row.blocked += 1;
    else row.available += 1;
    row.packages.push({
      shipgReturnId: pkg.id,
      parcelId: pkg.shipgermanParcelId,
      sender: meta?.sender ?? null,
      arrivalLabel: meta?.arrivalDate ? formatDate(meta.arrivalDate, me.locale) : null,
      arrivalSort: meta?.arrivalDate ? meta.arrivalDate.getTime() : Number.MAX_SAFE_INTEGER,
      reserved,
      blockReason,
      orderNumber: pkg.orderNumber,
      issueKey: pkg.issue?.key ?? null,
    });
    inventoryMap.set(compositionKey, row);
  }
  // FIFO znotraj sestave: prosti paketi pred rezerviranimi, paketov, ki jih ni
  // v skladišču, na konec; nato najstarejši prvi.
  const packageRank = (pkg: InventoryPackage) => (pkg.reserved ? 1 : pkg.blockReason ? 2 : 0);
  for (const row of inventoryMap.values()) {
    row.packages.sort((a, b) =>
      packageRank(a) - packageRank(b)
        || a.arrivalSort - b.arrivalSort
        || (a.parcelId ?? "").localeCompare(b.parcelId ?? ""),
    );
  }
  const inventoryRows: InventoryRow[] = [...inventoryMap.values()].sort((a, b) =>
    (b.available + b.reserved + b.tooOld) - (a.available + a.reserved + a.tooOld) || b.blocked - a.blocked || a.label.localeCompare(b.label),
  );

  // Zavihek Odposlano: vse odposlane pošiljke iz ShipGermana (cache, status
  // Shipped). Sistemske pošiljke navežemo na našo alokacijo prek parcelId;
  // pošiljke izpred sistema alokacije nimajo in so v prikazu označene.
  const shippedShipments = shippedView ? (await db.shipGermanCachedShipment.findMany({
    where: { status: { in: ["Shipped", "ReadyForProcessing"] } },
  })).sort((a, b) => Number(b.id) - Number(a.id)) : [];
  const shippedParcelIds = shippedShipments.flatMap((shipment) => shipment.parcelId ? [shipment.parcelId] : []);
  const shippedAllocations = shippedParcelIds.length ? await db.shipgAllocation.findMany({
    where: { externalParcelId: { in: shippedParcelIds } },
    include: {
      shipgReturn: {
        select: {
          orderNumber: true,
          issue: { select: { key: true } },
          items: { orderBy: { position: "asc" }, select: { name: true, variant: true, receivedQty: true, expectedQty: true } },
        },
      },
      exchangeIssue: { select: { key: true, orderNumber: true } },
      // Odprema novega naročila nima ticketa — cilj je Shopify naročilo samo.
      outboundOrder: { select: { orderNumber: true } },
      reservedBy: { select: { name: true } },
    },
  }) : [];
  const allocByParcel = new Map(shippedAllocations.map((allocation) => [allocation.externalParcelId, allocation] as const));
  // Ticket, ročno povezan z že odposlano pošiljko (status "shipped"): njegov
  // izvor naročila obogati vrstico, tudi če ni šla skozi našo alokacijo.
  const shippedReturns = shippedParcelIds.length ? await db.shipgReturn.findMany({
    where: { shipgermanParcelId: { in: shippedParcelIds } },
    select: {
      shipgermanParcelId: true,
      orderNumber: true,
      issue: { select: { key: true } },
      items: { orderBy: { position: "asc" }, select: { name: true, variant: true, receivedQty: true, expectedQty: true } },
    },
  }) : [];
  const returnByParcel = new Map(shippedReturns.flatMap((record) => record.shipgermanParcelId ? [[record.shipgermanParcelId, record] as const] : []));
  const contentsOf = (items: { name: string; variant: string | null; receivedQty: number; expectedQty: number }[]) =>
    items
      .filter((item) => !isIgnorableShipgItem({ name: item.name }))
      .map((item) => `${item.receivedQty || item.expectedQty}× ${canonicalLabel(item.name, item.variant)}`)
      .join(", ");
  const shippedRows: ShippedRow[] = shippedShipments.map((shipment) => {
    const allocation = shipment.parcelId ? allocByParcel.get(shipment.parcelId) : undefined;
    const sourceReturn = allocation?.shipgReturn ?? (shipment.parcelId ? returnByParcel.get(shipment.parcelId) : undefined);
    return {
      id: shipment.id,
      parcelId: shipment.parcelId,
      sender: shipment.sender,
      dateLabel: (shipment.actualShipDate ?? shipment.plannedShipDate) ? formatDate((shipment.actualShipDate ?? shipment.plannedShipDate)!, me.locale) : null,
      status: shipment.status,
      tracking: shipment.tracking,
      trackingLink: shipment.trackingLink,
      shipMethod: shipment.shipMethod,
      price: shipment.price,
      currency: shipment.currency,
      invoiceAvailable: shipment.invoiceAvailable,
      origin: shipmentOrigin(Boolean(allocation), shipment.actualShipDate ?? shipment.plannedShipDate),
      contents: sourceReturn ? contentsOf(sourceReturn.items) : null,
      sourceOrderNumber: sourceReturn?.orderNumber ?? null,
      sourceIssueKey: sourceReturn?.issue?.key ?? null,
      orderNumber: allocation?.exchangeIssue?.orderNumber ?? null,
      issueKey: allocation?.exchangeIssue?.key ?? null,
      outboundOrderNumber: allocation?.outboundOrder?.orderNumber ?? null,
      byName: allocation?.reservedBy?.name ?? null,

      weightGrams: shipment.weightGrams,
      dimensionsMm: shipment.lengthMm != null && shipment.widthMm != null && shipment.heightMm != null
        ? [shipment.lengthMm, shipment.widthMm, shipment.heightMm]
        : null,
      insurance: shipment.insurance,
      incoterm: shipment.incoterm,
      kind: shipment.kind,
      isEU: shipment.isEU,
      isVAT: shipment.isVAT,
      isPickupPoint: shipment.isPickupPoint,
      isConsolidation: shipment.isConsolidation,
      locations: shipment.locations,
      altTrackings: shipment.altTrackings,
      plannedLabel: shipment.plannedShipDate ? formatDate(shipment.plannedShipDate, me.locale) : null,
      shippedLabel: shipment.actualShipDate ? formatDate(shipment.actualShipDate, me.locale) : null,

      parcelTracking: shipment.parcelTracking,
      parcelCarrier: shipment.parcelCarrier,
      parcelBarcode: shipment.parcelBarcode,
      parcelArrivalLabel: shipment.parcelArrival ? formatDate(shipment.parcelArrival, me.locale) : null,
      parcelDwellDays: shipment.parcelDwellDays,
    };
  });

  // Iskanje po odposlanih: ista poizvedba zajame številko naročila (izvor ali
  // "poslano na"), pošiljatelja, ShipGerman ID in tracking — ker človek ob
  // reklamaciji v roki nima vedno istega podatka. Filtriramo v pomnilniku,
  // ker se polji "izvor" in "poslano na" sestavita šele iz povezav.
  const shippedFiltered = q
    ? (() => {
        const needle = q.toLowerCase().replace(/^#/, "").trim();
        const compact = needle.replace(/\s+/g, "");
        const has = (value: string | null | undefined) =>
          Boolean(value && value.toLowerCase().replace(/^#/, "").includes(needle));
        return shippedRows.filter((row) =>
          has(row.parcelId) || has(row.id) || has(row.sender) || has(row.contents)
          || has(row.sourceOrderNumber) || has(row.orderNumber) || has(row.outboundOrderNumber)
          || has(row.sourceIssueKey) || has(row.issueKey)
          || has(row.parcelBarcode)
          // Prihodna številka je tista, ki jo v roki drži stranka, ko sporoči,
          // da je vračilo poslala — iskanje mora zajeti tudi njo.
          || [row.tracking, row.parcelTracking, row.altTrackings].some((value) =>
            Boolean(value && value.toLowerCase().replace(/\s+/g, "").includes(compact))));
      })()
    : shippedRows;

  // Števci zavihkov: "Za preverit" združi prispelo + v tranzitu; "Zaloga" je
  // velikost police (aktivne ShipGerman pošiljke); Odstopanja so pomožna.
  const checkCount = check + expected;
  const stockCount = externalTotal;
  const exceptionCount = exception;
  const internalParcelsById = parcelMeta;
  const occupiedParcelIds = new Set(occupiedParcelRows.flatMap((record) => record.shipgermanParcelId ? [record.shipgermanParcelId] : []));
  const availableInternalParcels = internalParcelRows.filter((parcel) => parcel.active && !occupiedParcelIds.has(parcel.id));
  const externalParcels = cachedRows.map((row) => ({ ...cachedShipGermanParcel(row), unidentifiable: row.unidentifiable }));
  const filteredTotal = externalView ? externalFilteredTotal : internalListView ? internalFilteredTotal : 0;
  const maxPage = Math.max(1, Math.ceil(filteredTotal / pageSize));
  if (page > maxPage) redirect(shipgPageHref(view, q, maxPage, sort, activeFilter, lens));
  // Za odprte tickete (Za preverit) poiščemo že vpisano ShipGerman zalogo istega
  // naročila, ki še ni vezana na noben issue in ni rezervirana — kandidat za
  // združitev, da za isti fizični paket ne ostaneta dva zapisa.
  // Ista številka naročila v različnih krogih menjave sta dva fizična paketa —
  // stranka je vrnila prvotni kos, pozneje še nadomestek. Vse primerjave "isto
  // naročilo" zato tečejo po naročilu IN krogu.
  const roundKey = (orderNumber: string, round: number) => `${orderNumber}#${round}`;
  const openTicketOrders = [...new Set(
    records.filter((record) => record.status === "check" || record.status === "expected").map((record) => record.orderNumber),
  )];
  const reconcileStock = openTicketOrders.length
    ? await db.shipgReturn.findMany({
        where: { status: "stocked", issueId: null, shipgermanParcelId: { not: null }, allocation: { is: null }, orderNumber: { in: openTicketOrders } },
        orderBy: { stockedAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          exchangeRound: true,
          shipgermanParcelId: true,
          trackingNumber: true,
          stockedAt: true,
          items: { orderBy: { position: "asc" }, select: { name: true, variant: true, expectedQty: true, receivedQty: true } },
        },
      })
    : [];
  const reconcileByOrder = new Map<string, typeof reconcileStock>();
  for (const stock of reconcileStock) {
    // Paket, ki ga ni več v skladišču, ni kandidat: združitev bi vračilo stranke
    // potrdila kot zalogo na paketu, ki je že odšel.
    if (!stock.shipgermanParcelId || !parcelMeta.get(stock.shipgermanParcelId)?.active) continue;
    const key = roundKey(stock.orderNumber, stock.exchangeRound);
    const list = reconcileByOrder.get(key) ?? [];
    list.push(stock);
    reconcileByOrder.set(key, list);
  }

  // Že odposlane pošiljke (cache, Shipped), katerih paket še ni vezan na noben
  // zapis — kandidati za povezavo ticketa, katerega paket je bil odposlan pred
  // sistemom. Predlagamo tiste, kjer se pošiljatelj ujema s stranko.
  const shippedForLinking = internalListView ? await db.shipGermanCachedShipment.findMany({
    where: { status: "Shipped", parcelId: { not: null } },
    select: { id: true, parcelId: true, sender: true, actualShipDate: true },
    orderBy: { actualShipDate: "desc" },
  }) : [];
  const linkedParcelSet = internalListView
    ? new Set((await db.shipgReturn.findMany({ where: { shipgermanParcelId: { not: null } }, select: { shipgermanParcelId: true } }))
        .flatMap((record) => (record.shipgermanParcelId ? [record.shipgermanParcelId] : [])))
    : new Set<string>();
  const availableShipped = shippedForLinking.filter((shipment) => shipment.parcelId && !linkedParcelSet.has(shipment.parcelId));
  // Isto naročilo, ki je paket že prevzelo pod drugim zapisom in ga odposlalo.
  // To je zanesljiv ključ (naša lastna povezava), ne ugibanje po imenu: če je
  // za to številko naročila paket že šel skozi skladišče, mora odprt zapis to
  // povedati sam, namesto da čaka paket, ki je že odšel.
  const activeOrders = internalListView ? [...new Set(records.map((record) => record.orderNumber))] : [];
  const shippedSiblings = activeOrders.length
    ? await db.shipgReturn.findMany({
        where: {
          orderNumber: { in: activeOrders },
          shipgermanParcelId: { not: null },
          id: { notIn: records.map((record) => record.id) },
        },
        select: {
          id: true,
          orderNumber: true,
          exchangeRound: true,
          shipgermanParcelId: true,
          status: true,
          stockedAt: true,
          allocation: {
            select: {
              status: true,
              exchangeIssue: { select: { key: true, orderNumber: true } },
              outboundOrder: { select: { orderNumber: true } },
            },
          },
        },
      })
    : [];
  // Zanima nas samo paket, ki je res odšel: bodisi ga tako vodi naša alokacija
  // bodisi ga kot odposlanega pozna ShipGerman.
  const siblingParcelIds = shippedSiblings.flatMap((row) => (row.shipgermanParcelId ? [row.shipgermanParcelId] : []));
  const siblingShipments = siblingParcelIds.length
    ? await db.shipGermanCachedShipment.findMany({
        where: { parcelId: { in: siblingParcelIds }, status: "Shipped" },
        select: { parcelId: true, actualShipDate: true, tracking: true },
      })
    : [];
  const siblingShipmentByParcel = new Map(siblingShipments.flatMap((row) => (row.parcelId ? [[row.parcelId, row] as const] : [])));
  const alreadyShippedByOrder = new Map<string, {
    recordId: number;
    parcelId: string;
    dateLabel: string | null;
    tracking: string | null;
    exchangeIssueKey: string | null;
    exchangeOrderNumber: string | null;
    outboundOrderNumber: string | null;
  }>();
  for (const sibling of shippedSiblings) {
    const parcelId = sibling.shipgermanParcelId!;
    const shipment = siblingShipmentByParcel.get(parcelId);
    const dispatched = sibling.allocation?.status === "shipped" || sibling.allocation?.status === "dispatching";
    if (!shipment && !dispatched) continue;
    const key = roundKey(sibling.orderNumber, sibling.exchangeRound);
    if (alreadyShippedByOrder.has(key)) continue;
    alreadyShippedByOrder.set(key, {
      recordId: sibling.id,
      parcelId,
      dateLabel: shipment?.actualShipDate ? formatDate(shipment.actualShipDate, me.locale) : null,
      tracking: shipment?.tracking ?? null,
      exchangeIssueKey: sibling.allocation?.exchangeIssue?.key ?? null,
      exchangeOrderNumber: sibling.allocation?.exchangeIssue?.orderNumber ?? null,
      outboundOrderNumber: sibling.allocation?.outboundOrder?.orderNumber ?? null,
    });
  }

  const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");
  const namesMatch = (sender: string, customer: string) => {
    const a = normalizeName(sender);
    const b = normalizeName(customer);
    return Boolean(a) && Boolean(b) && (a === b || a.includes(b) || b.includes(a));
  };

  // Podvojitve v registru: ista številka naročila v več aktivnih zapisih
  // (ZA PREVERIT / odstopanja). Označimo jih kot opozorilo, da operater opazi.
  const duplicateOrders = internalListView
    ? new Set((await db.shipgReturn.groupBy({
        by: ["orderNumber", "exchangeRound"],
        where: { status: { in: ["check", "expected", "exception"] } },
        _count: { orderNumber: true },
        having: { orderNumber: { _count: { gt: 1 } } },
      })).map((group) => roundKey(group.orderNumber, group.exchangeRound)))
    : new Set<string>();

  const rows: ShipgReturnView[] = records.map((record) => ({
    id: record.id,
    orderNumber: record.orderNumber,
    exchangeRound: record.exchangeRound,
    duplicate: duplicateOrders.has(roundKey(record.orderNumber, record.exchangeRound)),
    customerName: record.customerName,
    trackingNumber: record.trackingNumber,
    status: record.status,
    notes: record.notes,
    createdAtLabel: formatDateTime(record.createdAt, me.locale),
    receivedAtLabel: record.receivedAt ? formatDateTime(record.receivedAt, me.locale) : null,
    stockedAtLabel: record.stockedAt ? formatDateTime(record.stockedAt, me.locale) : null,
    createdByName: record.createdBy?.name ?? null,
    verifiedByName: record.verifiedBy?.name ?? null,
    shipgermanParcelId: record.shipgermanParcelId,
    shipgermanParcel: record.shipgermanParcelId ? internalParcelsById.get(record.shipgermanParcelId) ?? null : null,
    shipgermanLinkLocked: Boolean(record.allocation),
    issue: record.issue,
    parcel: record.parcel ? {
      carrierName: record.parcel.carrierName,
      state: record.parcel.state,
      lastEventText: record.parcel.lastEventText,
      checkedAtLabel: record.parcel.checkedAt ? formatDateTime(record.parcel.checkedAt, me.locale) : null,
    } : null,
    items: record.items.map((item) => ({
      id: item.id,
      name: item.name,
      variant: item.variant,
      expectedQty: item.expectedQty,
      receivedQty: item.receivedQty,
      condition: item.condition,
      note: item.note,
    })),
    reconcile: (record.status === "check" || record.status === "expected")
      ? (reconcileByOrder.get(roundKey(record.orderNumber, record.exchangeRound)) ?? []).map((stock) => {
          const diff = mergeDiff(
            stock.items,
            record.items.map((item) => ({ name: item.name, variant: item.variant, qty: item.expectedQty, resolution: "refund" })),
          );
          return {
            stockId: stock.id,
            parcelLabel: stock.shipgermanParcelId ? `ShipGerman ${stock.shipgermanParcelId}` : stock.trackingNumber ?? "—",
            stockedAtLabel: stock.stockedAt ? formatDate(stock.stockedAt, me.locale) : null,
            diff,
            differences: diff.filter((row) => row.state !== "match").length,
          };
        })
      : [],
    alreadyShipped: record.shipgermanParcelId ? null : alreadyShippedByOrder.get(roundKey(record.orderNumber, record.exchangeRound)) ?? null,
    shippedMatches: (record.status === "check" || record.status === "expected") && record.customerName
      ? availableShipped
          .filter((shipment) => shipment.sender && namesMatch(shipment.sender, record.customerName!))
          .map((shipment) => ({
            parcelId: shipment.parcelId!,
            sender: shipment.sender,
            dateLabel: shipment.actualShipDate ? formatDate(shipment.actualShipDate, me.locale) : null,
          }))
      : [],
  }));
  const externalMatches = new Map<string, ShipGermanMatch>();
  for (const match of matchRecords) {
    if (match.shipgermanParcelId) externalMatches.set(match.shipgermanParcelId, {
      shipgReturnId: match.id,
      orderNumber: match.orderNumber,
      customerName: match.customerName,
      issueKey: match.issue?.key ?? null,
      status: match.status,
      source: match.shipgermanMatchSource ?? "manual",
      quality: match.matchQuality,
      items: match.items.map((item) => ({
        name: item.name,
        variant: item.variant,
        qty: item.receivedQty || item.expectedQty,
      })),
    });
  }
  const linkCandidates = matchRecords.filter((record) => !record.shipgermanParcelId && !record.allocation).map((record) => ({
    id: record.id,
    orderNumber: record.orderNumber,
    customerName: record.customerName,
    status: record.status,
    itemSummary: record.items.map((item) => `${item.receivedQty || item.expectedQty}× ${item.name}${item.variant ? ` · ${item.variant}` : ""}`).join(", "),
  }));
  const returnTo = shipgPageHref(view, q, page, sort, activeFilter, lens);

  return (
    <div className="shipg-surface mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.015em]">{t(me.locale, "shipg.title")}</h1>
          <p className="mt-1 text-[12.5px] text-label-2">{t(me.locale, "shipg.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/shipg?view=exception"
            className="btn btn-sm"
            data-active={view === "exception" ? "true" : undefined}
            style={exceptionCount > 0 ? { color: "var(--amber)", borderColor: "var(--amber)" } : undefined}
          >
            <AlertTriangle size={14} />
            {t(me.locale, "shipg.view.exception")}
            <span className="mono text-[10px]">{exceptionCount}</span>
          </Link>
          <Link href="/shipg/new" className="btn btn-primary">
            <Plus size={15} /> {t(me.locale, "shipg.add")}
          </Link>
        </div>
      </div>

      {stockMatchId && (
        <Suspense fallback={null}>
          <StockMatchPopup shipgReturnId={stockMatchId} locale={me.locale} closeHref="/shipg?view=stock" />
        </Suspense>
      )}

      {(saved || error) && (
        <div className="mt-4">
          {saved === "bulkStocked" && (
            <Notice kind="ok">
              {t(me.locale, "shipg.feedback.bulkStocked", { count: Number(one("count")) || 0 })}
              {Number(one("skipped")) > 0 && ` ${t(me.locale, "shipg.feedback.bulkSkipped", { skipped: Number(one("skipped")) })}`}
            </Notice>
          )}
          {saved && ["created", "check", "stocked", "exception", "linked", "unlinked", "shipgermanRefreshed", "shipmentsRefreshed", "shipmentsFulfilled", "manualStockCreated", "deleted", "reconciled", "linkedShipment", "resolvedShipped", "matchQuality"].includes(saved) && (
            <Notice kind="ok">{t(me.locale, `shipg.feedback.${saved}` as TranslationKey)}</Notice>
          )}
          {error && ["bulkEmpty", "invalidCheck", "staleCheck", "linkInvalid", "linkStale", "linkLocked", "shipgerman_not_configured", "shipgerman_authentication", "shipgerman_unavailable", "manualStockStale", "deleteInvalid", "deleteLinked", "deleteStale", "mergeInvalid", "mergeStale", "reconcileInvalid", "reconcileStale", "linkShipmentInvalid", "linkShipmentStale", "linkShipmentTaken", "qualityInvalid"].includes(error) && (
            <Notice kind="error">{t(me.locale, `shipg.feedback.${error}` as TranslationKey)}</Notice>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <nav className="segmented overflow-x-auto" aria-label={t(me.locale, "shipg.title")}>
          {PRIMARY_VIEWS.map((v) => (
            <ShipgPendingLink
              key={v}
              href={`/shipg?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              active={view === v || (v === "stock" && stockView)}
            >
              {t(me.locale, `shipg.view.${v}` as TranslationKey)}
              {/* Za odpremo brez števila: štetje bi zahtevalo Shopify naročila ob vsakem izrisu. */}
              {v !== "outbound" && (
                <span className="mono text-[10px]">{v === "check" ? checkCount : v === "shipped" ? shippedCount : stockCount}</span>
              )}
            </ShipgPendingLink>
          ))}
        </nav>

        {!inventoryView && !outboundView && (
          <form className="flex w-full max-w-[420px] items-center gap-2" method="get">
            <input type="hidden" name="view" value={view} />
            {stockView && lens === "composition" && <input type="hidden" name="lens" value="composition" />}
            {externalView && sort === "oldest" && <input type="hidden" name="sort" value="oldest" />}
            {activeFilter && <input type="hidden" name="filter" value={activeFilter} />}
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{t(me.locale, "shipg.search")}</span>
              <Search size={14} className="pointer-events-none absolute left-2.5 top-2 text-label-3" />
              <input name="q" defaultValue={q ?? ""} placeholder={t(me.locale, shippedView ? "shipg.shipped.search" : externalView ? "shipg.external.search" : "shipg.search")} className="field" style={{ paddingLeft: "30px" }} />
            </label>
            <button type="submit" className="btn btn-sm">{t(me.locale, "shipg.searchAction")}</button>
            {q && (
              <Link href={shipgFilterHref(view, undefined, sort, activeFilter)} className="btn btn-sm px-2" aria-label={t(me.locale, "shipg.clear")}>
                <X size={14} />
              </Link>
            )}
          </form>
        )}
      </div>

      {stockView && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="lens-toggle">
            <Link href={`/shipg?view=stock${q ? `&q=${encodeURIComponent(q)}` : ""}`} data-active={lens === "list" ? "true" : undefined}>
              <List size={13} /> {t(me.locale, "shipg.stock.list")}
            </Link>
            <Link href="/shipg?view=stock&lens=composition" data-active={lens === "composition" ? "true" : undefined}>
              <Layers size={13} /> {t(me.locale, "shipg.stock.composition")}
            </Link>
          </div>
          {listLens && (
            <>
              <Link
                href={unmatchedView ? `/shipg?view=stock${q ? `&q=${encodeURIComponent(q)}` : ""}` : `/shipg?view=stock&filter=unmatched${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="shipgerman-filter-chip"
                data-active={unmatchedView ? "true" : "false"}
              >
                <HelpCircle size={12} /> {t(me.locale, "shipg.stock.unmatched")} <span className="mono text-[10px]">{unmatchedTotal}</span>
              </Link>
              <Link
                href={unlinkedView ? `/shipg?view=stock${q ? `&q=${encodeURIComponent(q)}` : ""}` : `/shipg?view=stock&filter=unlinked${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="shipgerman-filter-chip"
                data-active={unlinkedView ? "true" : "false"}
              >
                <AlertTriangle size={12} /> {t(me.locale, "shipg.stock.unlinked")} <span className="mono text-[10px]">{unlinkedTotal}</span>
              </Link>
            </>
          )}
        </div>
      )}

      <div className="mt-4 border-t" style={{ borderColor: "var(--rule-ink)" }}>
        {outboundView ? (
          <OutboundWorklistPanel locale={me.locale} state={one("state")} found={one("found")} only={one("only")} sort={one("sort")} />
        ) : shippedView ? (
          <ShipgShippedTable rows={shippedFiltered} locale={me.locale} query={q} />
        ) : inventoryView ? (
          <ShipgInventoryTable rows={inventoryRows} />
        ) : externalView ? (
          <ShipGermanParcelTable
            parcels={externalParcels}
            fetchedAt={syncState?.fetchedAt ?? null}
            syncError={syncState?.status === "error" ? syncState.error : null}
            matches={externalMatches}
            candidates={linkCandidates}
            locale={me.locale}
            sort={sort}
            sortHref={shipgSortHref(view, q, sort === "oldest" ? "newest" : "oldest", onlyUnidentifiable ? "unidentifiable" : undefined)}
            filterActive={onlyUnidentifiable}
            filterHref={shipgFilterHref(view, q, sort, onlyUnidentifiable ? undefined : "unidentifiable")}
            unidentifiableTotal={unidentifiableTotal}
            returnTo={shipgPageHref(view, q, page, sort, onlyUnidentifiable ? "unidentifiable" : undefined)}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={t(me.locale, (unlinkedView ? "shipg.empty.unlinked" : `shipg.empty.${view}`) as TranslationKey)}
            action={<Link href="/shipg/new" className="btn btn-primary btn-sm"><Plus size={14} /> {t(me.locale, "shipg.add")}</Link>}
          />
        ) : (
          <div className="grid-settle grid gap-3 pt-4">
            <datalist id="shipgerman-available-parcels">
              {availableInternalParcels.map((parcel) => (
                <option
                  key={parcel.id}
                  value={parcel.id}
                  label={`${parcel.sender || t(me.locale, "shipg.external.unknown")} · ${parcel.trackingNumber || parcel.carrier} · ${formatDateTime(parcel.arrivalDate, me.locale)}`}
                />
              ))}
            </datalist>
            <datalist id="shipped-shipments-available">
              {availableShipped.map((shipment) => (
                <option
                  key={shipment.id}
                  value={shipment.parcelId ?? ""}
                  label={`${shipment.sender || t(me.locale, "shipg.external.unknown")} · ${shipment.actualShipDate ? formatDate(shipment.actualShipDate, me.locale) : ""}`}
                />
              ))}
            </datalist>
            {view === "check" ? (
              <ShipgBulkCheck eligibleIds={rows.filter(isBulkEligible).map((record) => record.id)}>
                {rows.map((record) => (
                  <ShipgReturnRow
                    key={record.id}
                    record={record}
                    returnTo={returnTo}
                    hasAvailableShipGermanParcels={availableInternalParcels.length > 0}
                    hasShippedShipments={availableShipped.length > 0}
                  />
                ))}
              </ShipgBulkCheck>
            ) : rows.map((record) => (
              <ShipgReturnRow
                key={record.id}
                record={record}
                returnTo={returnTo}
                hasAvailableShipGermanParcels={availableInternalParcels.length > 0}
                hasShippedShipments={availableShipped.length > 0}
              />
            ))}
          </div>
        )}
      </div>

      {filteredTotal > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[11.5px] text-label-2">
          <span className="mono">
            {t(me.locale, "shipg.showing", {
              from: (page - 1) * pageSize + 1,
              to: Math.min(page * pageSize, filteredTotal),
              total: filteredTotal,
            })}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <ShipgPendingLink href={shipgPageHref(view, q, page - 1, sort, activeFilter, lens)} className="btn btn-sm">
                <ChevronLeft size={14} /> {t(me.locale, "shipg.previous")}
              </ShipgPendingLink>
            )}
            {page * pageSize < filteredTotal && (
              <ShipgPendingLink href={shipgPageHref(view, q, page + 1, sort, activeFilter, lens)} className="btn btn-sm">
                {t(me.locale, "shipg.next")} <ChevronRight size={14} />
              </ShipgPendingLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function shipgPageHref(view: string, q: string | undefined, page: number, sort?: string, filter?: string, lens?: string) {
  const params = new URLSearchParams({ view, page: String(page) });
  if (q) params.set("q", q);
  if (lens === "composition") params.set("lens", "composition");
  if (sort === "oldest") params.set("sort", "oldest");
  if (filter) params.set("filter", filter);
  return `/shipg?${params.toString()}`;
}

function shipgSortHref(view: string, q: string | undefined, sort: string, filter?: string) {
  const params = new URLSearchParams({ view });
  if (q) params.set("q", q);
  // Sortiranje ponastavi paginacijo na prvo stran, ohrani pa aktiven filter.
  if (sort === "oldest") params.set("sort", "oldest");
  if (filter) params.set("filter", filter);
  return `/shipg?${params.toString()}`;
}

function shipgFilterHref(view: string, q: string | undefined, sort: string, nextFilter?: string) {
  const params = new URLSearchParams({ view });
  if (q) params.set("q", q);
  // Preklop filtra ohrani sortiranje in ponastavi paginacijo na prvo stran.
  if (sort === "oldest") params.set("sort", "oldest");
  if (nextFilter) params.set("filter", nextFilter);
  return `/shipg?${params.toString()}`;
}
