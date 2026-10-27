/**
 * Skupni račun za ogled (sošolci, profesorji). Vsi se prijavljajo z istim
 * geslom, zato ga nihče od njih ne sme zamenjati — sicer bi zaklenil ostale.
 */
export const GUEST_USERNAME = "gost";

/** Račun za predstavitev pri predmetu VUI (vui / vui) — enake omejitve kot gost. */
export const VUI_USERNAME = "vui";

const GUEST_USERNAMES: ReadonlySet<string> = new Set([GUEST_USERNAME, VUI_USERNAME]);

export function isGuest(user: { username: string }): boolean {
  return GUEST_USERNAMES.has(user.username.toLowerCase());
}

/**
 * Gost je za ogled tudi administrator: stran Admin vidi, uporabnikov pa ne
 * spreminja, sej in dejavnosti (kdo se je kdaj prijavil) pa sploh ne vidi.
 */
export const GUEST_HIDDEN_ADMIN_VIEWS: ReadonlySet<string> = new Set(["sessions", "activity"]);

export function guestReadOnlyMessage(locale: string): string {
  return locale === "sl"
    ? "Račun za ogled uporabnikov ne more spreminjati."
    : "The guest account cannot change users.";
}
