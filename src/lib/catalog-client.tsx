"use client";

import { setCatalogSnapshot, type CatalogSnapshot } from "./catalog-registry";
import { setLanguages, type LanguageInfo } from "./language-registry";

/**
 * Katalog in jeziki za brskalnik. Posnetka prideta iz postavitve strani in se
 * nastavita med izrisom — preden ju preberejo otroci (urejevalnik postavk,
 * izbira jezika pisma). Po urejanju v adminu ju osveži router.refresh(), ki
 * postavitev izriše znova.
 */
export function CatalogProvider({ snapshot, languages, children }: {
  snapshot: CatalogSnapshot;
  languages: LanguageInfo[];
  children: React.ReactNode;
}) {
  setCatalogSnapshot(snapshot);
  setLanguages(languages);
  return <>{children}</>;
}
