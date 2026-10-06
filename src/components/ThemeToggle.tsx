"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { updateAppearance } from "@/lib/actions/preferences";
import { rememberTheme, syncDarkClass } from "@/lib/appearance-client";
import { useT } from "@/lib/i18n/client";

/**
 * Hitri preklop svetla/temna. Prijavljenemu se izbira shrani v profil (velja
 * na vseh računalnikih), sicer samo v brskalnik. Ikona sledi razredu `dark`,
 * zato se ujema tudi, ko temo spremeniš v profilu ali jo preklopi sistem.
 */
export function ThemeToggle({ signedIn = false }: { signedIn?: boolean }) {
  const t = useT();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <button
      onClick={() => {
        const mode = dark ? "light" : "dark";
        rememberTheme(mode);
        if (signedIn) {
          document.documentElement.setAttribute("data-mode", mode);
          updateAppearance({ mode }).catch(() => {});
        }
        syncDarkClass();
      }}
      className="btn btn-sm px-2.5"
      aria-label={dark ? t("theme.light") : t("theme.dark")}
      title={dark ? t("theme.light") : t("theme.dark")}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
