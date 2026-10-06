/**
 * Področja strani »Urejanje«: kar sme poleg admina urejati tudi nekdo, ki mu
 * admin to dovoli. "satisfaction" je pregled nizkih ocen zadovoljstva — kdor
 * ga ima, dobi tudi obvestilo o nizki oceni. Namenoma ozek seznam — Nastavitve (tarife, varovala),
 * Povezave (ključi) in Uporabniki ostanejo adminu, sicer bi kljukica
 * »izdelki« pomenila več, kot piše na njej.
 *
 * Čisto (brez baze), ker ga berejo strežnik, meni in obrazec v adminu.
 */

export const PERMISSIONS = ["warehouse", "products", "languages", "satisfaction"] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value);
}

/** Zapis iz baze ("products,rules"). Neznano se tiho izpusti. */
export function parsePermissions(raw: string | null | undefined): Permission[] {
  const chosen = new Set((raw ?? "").split(",").map((part) => part.trim()).filter(isPermission));
  return PERMISSIONS.filter((permission) => chosen.has(permission));
}

export function serializePermissions(values: readonly unknown[]): string {
  const chosen = new Set(values.filter(isPermission));
  return PERMISSIONS.filter((permission) => chosen.has(permission)).join(",");
}

/** Admin sme vse; ostali samo to, kar jim je admin odkljukal. */
export function can(user: { isAdmin: boolean; permissions: readonly Permission[] }, permission: Permission): boolean {
  return user.isAdmin || user.permissions.includes(permission);
}

/** Področja, ki jih uporabnik na strani »Urejanje« vidi, v stalnem vrstnem redu. */
export function manageAreas(user: { isAdmin: boolean; permissions: readonly Permission[] }): Permission[] {
  return PERMISSIONS.filter((permission) => can(user, permission));
}
