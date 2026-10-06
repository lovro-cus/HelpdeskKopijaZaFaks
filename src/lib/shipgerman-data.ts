export type ShipGermanParcel = {
  id: string;
  arrivalDate: Date;
  barcode: string;
  carrier: string;
  dimensionsMm: [number, number, number];
  sender: string;
  trackingNumber: string | null;
  weightGrams: number;
  location: string;
  labelAvailable: boolean;
};

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export type ShipGermanShipment = {
  id: string;
  parcelId: string | null;
  status: string;
  actualShipDate: Date | null;
  plannedShipDate: Date | null;
  tracking: string | null;
  trackingLink: string | null;
  shipMethod: string | null;
  price: number | null;
  sender: string | null;
  invoiceAvailable: boolean;

  /** Mere in teža odposlanega paketa, kakor jih je stehtal ShipGerman. */
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  insurance: number | null;
  incoterm: string | null;
  /** "single" ali konsolidacija več paketov. */
  kind: string | null;
  isEU: boolean | null;
  isVAT: boolean | null;
  isPickupPoint: boolean | null;
  isConsolidation: boolean | null;
  /** Skladišče, iz katerega je paket odšel (npr. "MUC"). */
  locations: string | null;
  /** Dodatne tracking številke pri pošiljkah z več paketi. */
  altTrackings: string | null;

  /**
   * Podatki fizičnega paketa iz `included`: s čim je paket PRIŠEL v skladišče.
   * Stranka sporoči prav to številko, ko pove, da je poslala vračilo, zato je
   * pomembnejša od odhodne, kadar iščeš, čigav paket je bil.
   */
  parcelTracking: string | null;
  parcelCarrier: string | null;
  parcelBarcode: string | null;
  parcelArrival: Date | null;
  /** Koliko dni je paket ležal v skladišču (ShipGermanov "dwell_time"). */
  parcelDwellDays: number | null;
  labelAvailable: boolean;
};

function optionalDate(value: unknown): Date | null {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/** Prevede ShipGerman shipmethod ID (npr. "26-FEDEX_REGIONAL_ECONOMY-UBBli6Mn")
 *  v berljivo oznako ("FedEx Regional Economy"). */
function prettyShipMethod(id: string): string | null {
  if (!id) return null;
  const parts = id.split("-");
  const core = (parts.length >= 3 ? parts.slice(1, -1).join("-") : id).replace(/_/g, " ").trim().toLowerCase();
  if (!core) return null;
  return core.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bFedex\b/g, "FedEx");
}

function relationshipId(relationships: Record<string, unknown> | null, key: string): string | null {
  const relation = object(relationships?.[key]);
  const data = object(relation?.data);
  const id = data?.id;
  return typeof id === "string" ? id : id != null ? String(id) : null;
}

function optionalBool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function optionalText(value: unknown): string | null {
  const raw = text(value);
  return raw && raw.toLowerCase() !== "unknown" ? raw : null;
}

export function normalizeShipGermanTracking(value: string | null | undefined): string | null {
  const normalized = value?.replace(/[^a-z0-9]/gi, "").toUpperCase() ?? "";
  return normalized && normalized !== "UNKNOWN" ? normalized : null;
}

export type ShipGermanLinkRecord = { id: number; trackingNumber: string | null; externalParcelId: string | null };

/** Vrne samo nedvoumna 1:1 ujemanja še nepovezanih zapisov in živih paketov. */
export function inferShipGermanLinks(records: ShipGermanLinkRecord[], parcels: ShipGermanParcel[]) {
  const occupied = new Set(records.flatMap((record) => record.externalParcelId ? [record.externalParcelId] : []));
  const recordGroups = new Map<string, number[]>();
  const parcelGroups = new Map<string, ShipGermanParcel[]>();
  for (const record of records) {
    if (record.externalParcelId) continue;
    const tracking = normalizeShipGermanTracking(record.trackingNumber);
    if (tracking) recordGroups.set(tracking, [...(recordGroups.get(tracking) ?? []), record.id]);
  }
  for (const parcel of parcels) {
    if (occupied.has(parcel.id)) continue;
    const tracking = normalizeShipGermanTracking(parcel.trackingNumber);
    if (tracking) parcelGroups.set(tracking, [...(parcelGroups.get(tracking) ?? []), parcel]);
  }
  return [...recordGroups].flatMap(([tracking, recordIds]) => {
    const matches = parcelGroups.get(tracking) ?? [];
    return recordIds.length === 1 && matches.length === 1
      ? [{ recordId: recordIds[0], parcelId: matches[0].id }]
      : [];
  });
}
