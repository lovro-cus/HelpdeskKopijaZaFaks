/**
 * Kaj naj iskalnik sploh prebrska.
 *
 * Privzeto vsa polja — naročilo se išče po tistem, kar je pri roki, in to je
 * včasih številka, včasih priimek, včasih tracking z lepljive listke. Kadar pa
 * iskani niz nastopa v več vlogah (številka naročila je lahko tudi del
 * naslova), je koristno povedati, kje naj Desk gleda.
 *
 * Seznam je skupen odjemalcu in strežniku: polja v poizvedbi in kljukice v
 * filtru morajo biti eno in isto, sicer filter obljublja nekaj, česar iskanje
 * ne naredi.
 */

export const SEARCH_SCOPES = ["order", "email", "customer", "tracking", "items", "title"] as const;

export type SearchScope = (typeof SEARCH_SCOPES)[number];

export const ALL_SCOPES: SearchScope[] = [...SEARCH_SCOPES];

function isScope(value: string): value is SearchScope {
  return (SEARCH_SCOPES as readonly string[]).includes(value);
}

/**
 * Prebere izbor iz naslova ("order,tracking"). Prazno ali nerazumljeno pomeni
 * vsa polja — iskanje brez enega samega polja ne bi vrnilo nikoli ničesar in
 * bi bilo videti kot okvara.
 */
export function parseScopes(raw: string | null | undefined): SearchScope[] {
  const chosen = (raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(isScope);
  return chosen.length > 0 ? [...new Set(chosen)] : ALL_SCOPES;
}

/** Zapis izbora za naslov; poln izbor se ne zapisuje, ker je privzetek. */
export function scopeParam(scopes: SearchScope[]): string | null {
  const chosen = SEARCH_SCOPES.filter((scope) => scopes.includes(scope));
  return chosen.length === 0 || chosen.length === SEARCH_SCOPES.length ? null : chosen.join(",");
}
