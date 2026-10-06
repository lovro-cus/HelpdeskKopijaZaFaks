"use client";

import { createContext, useCallback, useContext, useEffect } from "react";
import { translate, type TranslationKey } from "./dictionaries";
import type { Locale, Vars } from "./shared";

const LocaleContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return useCallback((key: TranslationKey, vars?: Vars) => translate(locale, key, vars), [locale]);
}
