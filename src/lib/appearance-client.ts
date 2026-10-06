import { appearanceAttributes, resolveDark, type Appearance, type ThemeMode } from "./appearance";

/** Stara izbira teme iz časov, ko je gumb pisal samo v brskalnik. */
export function storedTheme(): string | null {
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
}

/** Razred `dark` sledi atributu `data-mode`, stari izbiri in sistemu. */
export function syncDarkClass() {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", resolveDark(root.getAttribute("data-mode"), storedTheme(), systemDark));
}

/** Takojšnji predogled: izgled gre na <html>, preden ga strežnik shrani. */
export function applyAppearance(appearance: Appearance) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(appearanceAttributes(appearance))) {
    if (value === undefined) root.removeAttribute(name);
    else root.setAttribute(name, value);
  }
  syncDarkClass();
}

/** Izbrana tema velja tudi za stran za prijavo, ki uporabnika še ne pozna. */
export function rememberTheme(mode: ThemeMode | null) {
  try {
    if (mode === "light" || mode === "dark") localStorage.setItem("theme", mode);
    else localStorage.removeItem("theme");
  } catch {}
}
