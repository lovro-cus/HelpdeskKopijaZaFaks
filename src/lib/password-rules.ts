/**
 * Pravila za gesla. Brez uvozov iz Node — datoteka se uporablja tudi na
 * klientu za sprotno preverjanje med tipkanjem.
 *
 * Vir resnice: strežnik (`passwordProblem`) uporablja ista pravila, zato
 * vmesnik in preverjanje na strežniku ne moreta razhajati.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

export type PasswordRule = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `Vsaj ${MIN_PASSWORD_LENGTH} znakov`,
    test: (v) => v.length >= MIN_PASSWORD_LENGTH,
  },
  {
    id: "upper",
    label: "Vsaj ena velika črka",
    test: (v) => /\p{Lu}/u.test(v),
  },
  {
    id: "lower",
    label: "Vsaj ena mala črka",
    test: (v) => /\p{Ll}/u.test(v),
  },
  {
    id: "digit",
    label: "Vsaj ena številka",
    test: (v) => /\d/.test(v),
  },
  {
    id: "special",
    label: "Vsaj en poseben znak (!?#$%…)",
    test: (v) => /[^\p{L}\p{N}]/u.test(v),
  },
];

export function failedRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((r) => !r.test(password));
}

/** Prva neizpolnjena zahteva kot besedilo napake, ali null. */
export function passwordProblem(password: string): string | null {
  if (password.length > MAX_PASSWORD_LENGTH) return "Geslo je predolgo.";
  const failed = failedRules(password);
  if (failed.length === 0) return null;
  return `Geslo ne ustreza zahtevam: ${failed.map((r) => r.label.toLowerCase()).join(", ")}.`;
}
