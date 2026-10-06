"use client";

import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { NOTIFY_CHANNELS, NOTIFY_KINDS, type NotifyMatrix } from "@/lib/notify-prefs";

/**
 * Tabela obvestil: za vsako vrsto izklopljeno, zvonec ali zvonec in pošta.
 * Ista polja (»notify.<vrsta>«) uporabljata admin pri uporabniku in profil.
 */
export function NotifyMatrixFields({ matrix }: { matrix: NotifyMatrix }) {
  const t = useT();
  return (
    <div className="grid gap-2">
      {NOTIFY_KINDS.map((kind) => (
        <label key={kind} className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_170px]">
          <span className="min-w-0">
            <span className="block text-[12.5px]">{t(`notifyPrefs.kind.${kind}` as TranslationKey)}</span>
            <span className="block text-[11.5px] text-label-3">{t(`notifyPrefs.hint.${kind}` as TranslationKey)}</span>
          </span>
          <select name={`notify.${kind}`} defaultValue={matrix[kind]} className="field h-[30px] text-[12.5px]">
            {/* Samodejna odprema nima poštne različice. */}
            {NOTIFY_CHANNELS.filter((channel) => kind !== "outbound" || channel !== "mail").map((channel) => (
              <option key={channel} value={channel}>{t(`notifyPrefs.${channel}` as TranslationKey)}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
