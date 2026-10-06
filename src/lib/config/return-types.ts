import "server-only";

import { loadConfig } from "./server";

/**
 * Vrste, ki pred zaprtjem zahtevajo potrjen vrnjen paket, kakor jih je nastavil
 * admin. Ločena datoteka, ker jo potrebujejo strežniške akcije, ki šifranta
 * sicer ne berejo.
 */
export async function returnTypeSet(): Promise<Set<string>> {
  const { types } = await loadConfig("en");
  return new Set(types.filter((type) => type.requiresReturn).map((type) => type.key));
}
