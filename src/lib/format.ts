const RELATIVE = new Intl.RelativeTimeFormat("sl", { numeric: "auto" });

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (abs < min) return "pravkar";
  if (abs < hour) return RELATIVE.format(Math.round(diff / min), "minute");
  if (abs < day) return RELATIVE.format(Math.round(diff / hour), "hour");
  if (abs < 30 * day) return RELATIVE.format(Math.round(diff / day), "day");
  return formatDate(d);
}

export function formatDate(date: Date | string | null | undefined, locale = "sl-SI"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(date: Date | string | null | undefined, locale = "sl-SI"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMoney(amount: number | null | undefined, currency = "EUR", locale = "sl-SI"): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

/** Teža paketa v kilogramih, npr. "1,2 kg". Vhod je v gramih. */
export function formatWeightKg(grams: number | null | undefined, locale = "sl-SI"): string | null {
  if (grams == null) return null;
  return `${(grams / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })} kg`;
}

/** Koliko dni je issue že odprt — za "staranje" opozorila. */
export function daysOpen(createdAt: Date | string): number {
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.match(/\p{L}|\p{N}/u)?.[0]?.toUpperCase() ?? "")
    .join("");
}
