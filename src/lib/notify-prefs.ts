/**
 * Katera obvestila dobi uporabnik in po kateri poti. Za vsako vrsto: izklopljeno,
 * samo zvonec ali zvonec in pošta. Nastavlja jih admin (Admin → Uporabniki) in
 * uporabnik sam (Profil). Brez baze, da jo berejo strežnik, obrazca in testi.
 */

export const NOTIFY_KINDS = ["handoff", "outsider", "reply", "deadline", "parcel", "stock", "delivery", "satisfaction", "outbound"] as const;
export type NotifyKind = (typeof NOTIFY_KINDS)[number];

export const NOTIFY_CHANNELS = ["off", "bell", "mail"] as const;
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number];

export type NotifyMatrix = Record<NotifyKind, NotifyChannel>;

/** Vrste, ki so bile doslej samo v zvoncu — množične ali brez smisla v pošti. */
const BELL_BY_DEFAULT = new Set<NotifyKind>(["reply", "satisfaction", "outbound"]);

/**
 * Nastavitve uporabnika. Brez shranjene tabele veljajo dosedanja stikala
 * (notifyEmail, notifyOutsider), da se nikomur nič ne spremeni sámo.
 */
export function notifyMatrix(user: { notifyKinds?: string | null; notifyEmail: boolean; notifyOutsider: boolean }): NotifyMatrix {
  const fallback = Object.fromEntries(NOTIFY_KINDS.map((kind) => {
    if (BELL_BY_DEFAULT.has(kind) || !user.notifyEmail) return [kind, "bell"];
    if (kind === "outsider" && !user.notifyOutsider) return [kind, "bell"];
    return [kind, "mail"];
  })) as NotifyMatrix;
  if (!user.notifyKinds) return fallback;
  let saved: unknown;
  try {
    saved = JSON.parse(user.notifyKinds);
  } catch {
    return fallback;
  }
  if (!saved || typeof saved !== "object") return fallback;
  const record = saved as Record<string, unknown>;
  return Object.fromEntries(NOTIFY_KINDS.map((kind) => {
    const value = record[kind];
    return [kind, NOTIFY_CHANNELS.includes(value as NotifyChannel) ? value : fallback[kind]];
  })) as NotifyMatrix;
}

/** Tabela iz obrazca (polja »notify.<vrsta>«); neznana vrednost ostane privzeta. */
export function readNotifyMatrix(get: (name: string) => unknown, current: NotifyMatrix): NotifyMatrix {
  return Object.fromEntries(NOTIFY_KINDS.map((kind) => {
    const value = get(`notify.${kind}`);
    return [kind, NOTIFY_CHANNELS.includes(value as NotifyChannel) ? value : current[kind]];
  })) as NotifyMatrix;
}

/** Pot za obvestilo; vrsta, ki je tabela ne pozna, gre v zvonec. */
export function channelFor(matrix: NotifyMatrix, kind: string): NotifyChannel {
  return (NOTIFY_KINDS as readonly string[]).includes(kind) ? matrix[kind as NotifyKind] : "bell";
}
