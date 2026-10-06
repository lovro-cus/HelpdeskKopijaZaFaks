"use client";

import { Check, X } from "lucide-react";

import { PASSWORD_RULES } from "@/lib/password-rules";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

/**
 * Seznam zahtev za geslo. Kljukica je rdeča, dokler pogoj ni izpolnjen,
 * in zelena, ko je — posodablja se med tipkanjem.
 */
export function PasswordRequirements({
  value,
  repeat,
  current,
}: {
  value: string;
  /** Če je podan, se preveri še ujemanje ponovljenega gesla. */
  repeat?: string;
  /** Če je podan, mora biti novo geslo drugačno od trenutnega. */
  current?: string;
}) {
  const t = useT();
  const items = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: t(`password.${rule.id}` as TranslationKey),
    ok: rule.test(value),
  }));

  if (repeat !== undefined) {
    items.push({
      id: "match",
      label: t("password.match"),
      ok: value.length > 0 && value === repeat,
    });
  }

  if (current !== undefined) {
    items.push({
      id: "different",
      label: t("password.different"),
      ok: value.length > 0 && current.length > 0 && value !== current,
    });
  }

  return (
    <ul className="grid gap-1.5" aria-live="polite">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 text-[12.5px]">
          <span
            aria-hidden
            className="flex h-[16px] w-[16px] shrink-0 items-center justify-center transition-colors"
            // Nedosežena zahteva ni napaka, ampak še neizpolnjena rubrika:
            // tiho stoji v okvirju, dokler je ne odkljukaš. Rdeče je v tem
            // sistemu rezervirano za tisto, kar gori.
            style={{
              background: item.ok ? "var(--ink)" : "transparent",
              border: item.ok ? "1px solid var(--ink)" : "1px solid var(--rule-strong)",
              color: item.ok ? "var(--sheet)" : "var(--ink-3)",
            }}
          >
            {item.ok ? <Check size={10} strokeWidth={3.2} /> : <X size={10} strokeWidth={3.2} />}
          </span>
          <span
            className="transition-colors"
            style={{ color: item.ok ? "var(--ink)" : "var(--ink-2)" }}
          >
            {item.label}
          </span>
          <span className="sr-only">{item.ok ? t("password.met") : t("password.notMet")}</span>
        </li>
      ))}
    </ul>
  );
}
