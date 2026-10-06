/**
 * Ocena zadovoljstva stranke ob zaključku — brez baze in brez omrežja, da jo
 * berejo strežnik, stran in testi enako.
 *
 * Ocena je samo za ekipo: nizka pošlje ticket v pregled, da ga nekdo pogleda,
 * preden stranka nezadovoljstvo nese drugam. Stranka o njej ne izve ničesar.
 */

/**
 * Privzeta meja za pregled (»manj kot 5«). Dejanska je nastavitev
 * satisfactionReviewBelow v Urejanje → Zadovoljstvo.
 */
export const REVIEW_BELOW = 5;

/** Kolikokrat poskusimo, preden ocena obvisi kot neuspešna. */
export const MAX_ATTEMPTS = 3;

/** Za koliko nazaj ob zagonu ocenimo že zaprte tickete. */
export const BACKFILL_DAYS = 7;

export type SatisfactionResult = { score: number | null; reason: string };

export function needsReview(score: number | null | undefined, below = REVIEW_BELOW): boolean {
  return typeof score === "number" && score < below;
}

/**
 * Strogo prebere odgovor modela. Ocena je celo število 1–10 ali null (stranka
 * ni pisala); karkoli drugega je neveljaven odgovor, ne ocena — izmišljena
 * številka bi ticket po krivem poslala v pregled ali ga iz njega skrila.
 */
export function parseSatisfaction(raw: string): SatisfactionResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as { score?: unknown; reason?: unknown };
  const reason = typeof record.reason === "string" ? record.reason.trim().slice(0, 400) : "";

  if (record.score === null) return { score: null, reason };
  const score = typeof record.score === "string" ? Number(record.score) : record.score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 10) return null;
  if (!reason) return null;
  return { score, reason };
}

/** Barva ocene na strani: nizka je žig, visoka mirna. */
export function scoreTone(score: number | null, below = REVIEW_BELOW): "low" | "mid" | "high" | "none" {
  if (score === null) return "none";
  if (needsReview(score, below)) return "low";
  return score >= 8 ? "high" : "mid";
}
