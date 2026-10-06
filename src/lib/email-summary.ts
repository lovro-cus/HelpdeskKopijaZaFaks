export const RETURN_INTENTS = ["refund", "exchange", "unknown", "not_applicable"] as const;
export type ReturnIntent = (typeof RETURN_INTENTS)[number];

export type EmailSummary = {
  overview: string;
  customerRequest: string;
  /**
   * Kaj je stranka sama povedala, da želi doseči z vračilom. Namenoma ni
   * izpeljano iz vrste ticketa ali interne rešitve artikla.
   */
  returnIntent: ReturnIntent;
  facts: string[];
  /** Kronološki potek niti, najstarejše najprej. Starejši povzetki ga nimajo. */
  timeline: string[];
  commitments: string[];
  currentState: string;
  nextStep: string;
  warnings: string[];
};

function clippedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (!clean) return null;
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function stringArray(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => clippedString(item, 500))
    .filter((item): item is string => Boolean(item))
    .slice(0, max);
}

/** Enako strogo preveri svež odgovor modela in zapis iz predpomnilnika. */
export function emailSummaryFromUnknown(value: unknown): EmailSummary | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const overview = clippedString(record.overview, 1_200);
  const customerRequest = clippedString(record.customerRequest, 1_200);
  const currentState = clippedString(record.currentState, 1_200);
  const nextStep = clippedString(record.nextStep, 1_200);
  const returnIntent = typeof record.returnIntent === "string" && RETURN_INTENTS.includes(record.returnIntent as ReturnIntent)
    ? record.returnIntent as ReturnIntent
    : null;

  if (!overview || !customerRequest || !currentState || !nextStep || !returnIntent) return null;
  return {
    overview,
    customerRequest,
    returnIntent,
    facts: stringArray(record.facts, 10),
    timeline: stringArray(record.timeline, 14),
    commitments: stringArray(record.commitments),
    currentState,
    nextStep,
    warnings: stringArray(record.warnings),
  };
}

export function parseEmailSummary(value: string): EmailSummary | null {
  try {
    const parsed = JSON.parse(value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
    return emailSummaryFromUnknown(parsed);
  } catch {
    return null;
  }
}
