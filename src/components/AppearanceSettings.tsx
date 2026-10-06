"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { updateAppearance } from "@/lib/actions/preferences";
import {
  COLOR_SCHEMES,
  DEFAULT_APPEARANCE,
  serializeAppearance,
  TEXT_FONTS,
  TEXT_SIZES,
  type Appearance,
  type TextFont,
  type ThemeMode,
} from "@/lib/appearance";
import { applyAppearance, rememberTheme, storedTheme } from "@/lib/appearance-client";
import { useT } from "@/lib/i18n/client";
import { onRadioKeys, PrefRow, SaveStatus, type SaveState } from "./ProfileParts";

const FONT_STACK: Record<TextFont, string> = {
  plex: "var(--font-plex-sans)",
  hyperlegible: "var(--font-hyperlegible)",
  system: 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial',
};

const MODE_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

/**
 * Izgled v profilu. Vsaka izbira se takoj pokaže na strani in se shrani na
 * račun — gumba "Shrani" ni, ker je predogled že rezultat.
 */
export function AppearanceSettings({ initial }: { initial: Appearance }) {
  const t = useT();
  const [appearance, setAppearance] = useState(initial);
  const [mode, setMode] = useState<ThemeMode>(initial.mode ?? "system");
  const [state, setState] = useState<SaveState>("idle");
  const request = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Kdor teme v profilu še ni izbral, ima morda staro izbiro v brskalniku.
  useEffect(() => {
    if (initial.mode) return;
    const stored = storedTheme();
    if (stored === "light" || stored === "dark") setMode(stored);
  }, [initial.mode]);

  useEffect(() => () => clearTimeout(settle.current), []);

  function save(next: Appearance, reset = false) {
    setAppearance(next);
    applyAppearance(next);
    if (reset || next.mode !== appearance.mode) {
      rememberTheme(next.mode);
      setMode(next.mode ?? "system");
    }
    // Pošljemo cel izgled, ne le spremembe: pri hitrem klikanju zadnji zapis
    // nosi vse izbire in se ne more pomešati s starejšim.
    const id = ++request.current;
    clearTimeout(settle.current);
    setState("saving");
    updateAppearance(next, reset)
      .then(() => {
        if (request.current !== id) return;
        setState("saved");
        settle.current = setTimeout(() => setState("idle"), 2400);
      })
      .catch(() => {
        if (request.current === id) setState("failed");
      });
  }

  const change = (patch: Partial<Appearance>) => save({ ...appearance, ...patch });
  const isDefault = serializeAppearance(appearance) === "{}";

  return (
    <section className="card" aria-labelledby="appearance-title">
      <header className="pref-head">
        <h2 id="appearance-title" className="pref-title">{t("appearance.title")}</h2>
        <div className="flex items-center gap-3">
          <SaveStatus state={state} />
          <button type="button" className="btn btn-plain btn-sm" disabled={isDefault} onClick={() => save(DEFAULT_APPEARANCE, true)}>
            {t("appearance.reset")}
          </button>
        </div>
      </header>

      <PrefRow label={t("appearance.scheme")} hint={t("appearance.schemeHint")}>
        <div role="radiogroup" aria-label={t("appearance.scheme")} className="scheme-grid" onKeyDown={onRadioKeys}>
          {COLOR_SCHEMES.map((scheme) => {
            const checked = appearance.scheme === scheme;
            return (
              <button
                key={scheme}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                className="pref-choice scheme-option"
                onClick={() => change({ scheme })}
              >
                <span className="scheme-swatch" data-scheme={scheme} aria-hidden>
                  <span className="scheme-paper">
                    <span className="scheme-paper-head">
                      <span className="scheme-paper-number">#3267</span>
                      <span className="scheme-paper-level">L2</span>
                    </span>
                    <span className="scheme-paper-type">{t("appearance.preview.type")}</span>
                    <span className="scheme-paper-foot">
                      <span className="scheme-paper-take">{t("appearance.preview.take")}</span>
                      <span className="scheme-paper-urgent">{t("appearance.preview.urgent")}</span>
                    </span>
                  </span>
                </span>
                <span className="scheme-caption">
                  <span className="scheme-name">
                    {t(`appearance.scheme.${scheme}` as never)}
                    {checked && <Check size={14} aria-hidden />}
                  </span>
                  <span className="scheme-hint">{t(`appearance.scheme.${scheme}Hint` as never)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </PrefRow>

      <PrefRow label={t("appearance.mode")} hint={t("appearance.modeHint")}>
        <div role="radiogroup" aria-label={t("appearance.mode")} className="pref-choices" onKeyDown={onRadioKeys}>
          {(["light", "dark", "system"] as const).map((option) => {
            const Icon = MODE_ICON[option];
            const checked = mode === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                className="pref-choice pref-mode"
                onClick={() => change({ mode: option })}
              >
                <Icon size={14} aria-hidden />
                {t(`appearance.mode.${option}` as never)}
              </button>
            );
          })}
        </div>
      </PrefRow>

      <PrefRow label={t("appearance.textSize")} hint={t("appearance.textSizeHint")}>
        <div role="radiogroup" aria-label={t("appearance.textSize")} className="pref-choices" onKeyDown={onRadioKeys}>
          {TEXT_SIZES.map((size) => {
            const checked = appearance.textSize === size;
            const value = t("appearance.textSizeValue", { value: size });
            return (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={value}
                tabIndex={checked ? 0 : -1}
                className="pref-choice pref-size"
                onClick={() => change({ textSize: size })}
              >
                <span className="pref-size-glyph" style={{ fontSize: (15 * size) / 100 }} aria-hidden>Aa</span>
                <span className="pref-size-value" aria-hidden>{value}</span>
              </button>
            );
          })}
        </div>
      </PrefRow>

      <PrefRow label={t("appearance.font")} hint={t("appearance.fontHint")}>
        <div role="radiogroup" aria-label={t("appearance.font")} className="pref-fonts" onKeyDown={onRadioKeys}>
          {TEXT_FONTS.map((font) => {
            const checked = appearance.font === font;
            return (
              <button
                key={font}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                className="pref-choice pref-font"
                onClick={() => change({ font })}
              >
                <span className="pref-font-sample" style={{ fontFamily: FONT_STACK[font] }}>{t("appearance.fontSample")}</span>
                <span className="pref-font-name">
                  <span className="font-medium text-label">{t(`appearance.font.${font}` as never)}</span>
                  <span>{t(`appearance.font.${font}Hint` as never)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </PrefRow>

      <PrefRow label={t("appearance.background")}>
        <label className="pref-check">
          <input type="checkbox" checked={appearance.grid} onChange={(event) => change({ grid: event.target.checked })} />
          {t("appearance.grid")}
        </label>
      </PrefRow>

      <PrefRow label={t("appearance.motion")} hint={t("appearance.motionHint")}>
        <label className="pref-check">
          <input type="checkbox" checked={appearance.reduceMotion} onChange={(event) => change({ reduceMotion: event.target.checked })} />
          {t("appearance.reduceMotion")}
        </label>
      </PrefRow>
    </section>
  );
}
