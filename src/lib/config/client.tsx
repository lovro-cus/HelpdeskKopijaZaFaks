"use client";

import { createContext, useContext, useMemo } from "react";

import { DEFAULT_SETTINGS, type Settings } from "./defaults";
import { assignableTypes, findCategory, labelOf, visible, type Category } from "./shared";

/**
 * Šifrant, kakršnega vidi klient. Postrežen je iz postavitve (en sam prenos na
 * stran), zato izbirniki, filtri in značke berejo isti seznam kot strežnik in
 * po urejanju v adminu ni razhajanja med tem, kar se pokaže, in tem, kar se
 * shrani.
 */

export type ClientConfig = {
  types: Category[];
  priorities: Category[];
  settings: Settings;
};

const EMPTY: ClientConfig = { types: [], priorities: [], settings: DEFAULT_SETTINGS };

const ConfigContext = createContext<ClientConfig>(EMPTY);

export function ConfigProvider({ value, children }: { value: ClientConfig; children: React.ReactNode }) {
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ClientConfig {
  return useContext(ConfigContext);
}

export function useSettings(): Settings {
  return useConfig().settings;
}

/** Vse vrste, tudi skrite — značka starega ticketa mora ostati berljiva. */
export function useTypes(): Category[] {
  return useConfig().types;
}

export function usePriorities(): Category[] {
  return useConfig().priorities;
}

/** Samo tiste, ki jih sme človek še izbrati. */
export function useTypeOptions(): Category[] {
  const types = useTypes();
  return useMemo(() => assignableTypes(types), [types]);
}

/** Vrste za filter seznama — tudi »Nerazvrščeno«, ki jo ima sistemski ticket. */
export function useTypeFilterOptions(): Category[] {
  const types = useTypes();
  return useMemo(() => visible(types), [types]);
}

export function usePriorityOptions(): Category[] {
  const priorities = usePriorities();
  return useMemo(() => visible(priorities), [priorities]);
}

export function useTypeLabel(key: string): string {
  return labelOf(useTypes(), key);
}

export function usePriority(key: string): Category | undefined {
  return findCategory(usePriorities(), key);
}

/**
 * Ali ta vrsta pred zaprtjem zahteva potrjen vrnjen paket. Neznana vrsta ne
 * zahteva ničesar — sicer bi izbrisana vrsta zaklenila stare ticket.
 */
export function useReturnTypes(): Set<string> {
  const types = useTypes();
  return useMemo(
    () => new Set(types.filter((type) => type.requiresReturn).map((type) => type.key)),
    [types],
  );
}
