"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";

import { useT } from "@/lib/i18n/client";

/**
 * Kopiranje podatka v odložišče.
 *
 * Ikona je skrita, dokler miška ni nad vrstico (razred `reveal` v
 * globals.css). Ob fokusu s tipkovnico in na napravah brez miške je vedno
 * vidna — sicer bi bila funkcija za del ljudi nedosegljiva.
 */
/**
 * Zapis v odložišče. Clipboard API zahteva varen izvor in fokusiran dokument;
 * kadar ga brskalnik odkloni, poskusimo še po stari poti prek izbire besedila,
 * da kopiranje ne odpove tam, kjer je nova pot nedosegljiva.
 */
async function write(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Nadaljujemo z rezervo.
  }

  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  value,
  from,
  label,
  title,
  className = "",
}: {
  /** Vrednost za kopiranje; pri `from` služi le za odločitev o prikazu. */
  value: string | null | undefined;
  /**
   * Ime polja v istem obrazcu. Kadar je podano, kopiramo trenutno vsebino
   * polja — kar je nekdo pravkar popravil, a še ni shranil, se kopira tako,
   * kot je na zaslonu.
   */
  from?: string;
  /** Ime podatka; vstavi se v "Kopiraj {field}". */
  label?: string;
  /** Cel napis, kadar "Kopiraj {field}" ne bi bil slovnično smiseln. */
  title?: string;
  className?: string;
}) {
  const t = useT();
  const button = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const initial = value?.trim();
  if (!initial) return null;

  async function copy() {
    if (timer.current) clearTimeout(timer.current);

    const live = from
      ? (button.current?.closest("form")?.elements.namedItem(from) as HTMLInputElement | null)
          ?.value
      : undefined;
    const text = (live ?? initial ?? "").trim();
    if (!text) return;

    setResult((await write(text)) ? "ok" : "fail");
    timer.current = setTimeout(() => setResult("idle"), 1400);
  }

  const caption = title ?? t("copy.label", { field: label ?? "" });
  const Icon = result === "ok" ? Check : result === "fail" ? X : Copy;
  const color =
    result === "ok" ? "var(--green)" : result === "fail" ? "var(--red)" : "var(--text-3)";

  return (
    <button
      ref={button}
      type="button"
      onClick={copy}
      aria-label={caption}
      title={result === "fail" ? t("copy.failed") : caption}
      className={`reveal inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center transition-colors hover:bg-fill ${className}`}
      style={{ color }}
    >
      <Icon size={13} />
    </button>
  );
}
