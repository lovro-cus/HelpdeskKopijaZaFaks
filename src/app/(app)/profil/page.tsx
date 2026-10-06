import Link from "next/link";
import { KeyRound } from "lucide-react";

import { AppearanceSettings } from "@/components/AppearanceSettings";
import { NotificationSettings } from "@/components/NotificationSettings";
import { notifyMatrix } from "@/lib/notify-prefs";
import { PrefRow } from "@/components/ProfileParts";
import { Avatar } from "@/components/ui";
import { setLocale } from "@/lib/actions/preferences";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const LANGUAGES = [
  { locale: "sl", label: "Slovenščina" },
  { locale: "en", label: "English" },
] as const;

/**
 * Profil: kako je Desk videti zate, kaj ti pride po pošti in jezik. Vse je
 * vezano na račun, ne na brskalnik.
 */
export default async function ProfilePage() {
  const me = await requireUser();

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--rule-strong)" }}>
        <div>
          <h1 className="text-[19px] font-semibold leading-tight tracking-[-0.02em]">{t(me.locale, "profile.title")}</h1>
          <p className="mt-1.5 max-w-[70ch] text-[13px] text-label-2">{t(me.locale, "profile.lede")}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Avatar name={me.name} color={me.color} size={34} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{me.name}</p>
            <p className="truncate text-[12px] text-label-2">
              <span className="mono">@{me.username}</span> · {me.isAdmin ? t(me.locale, "nav.admin") : t(me.locale, "nav.level", { level: me.level })}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-5">
        <AppearanceSettings initial={me.appearance} />

        <NotificationSettings
          email={me.email}
          matrix={notifyMatrix(me)}
          notifyPriority={me.notifyPriority}
          notifyDigest={me.notifyDigest}
        />

        <section className="card" aria-labelledby="account-title">
          <header className="pref-head">
            <h2 id="account-title" className="pref-title">{t(me.locale, "profile.account")}</h2>
          </header>
          <PrefRow label={t(me.locale, "profile.language")}>
            <div className="pref-choices">
              {LANGUAGES.map(({ locale, label }) => (
                <form action={setLocale} key={locale}>
                  <input type="hidden" name="locale" value={locale} />
                  <button type="submit" className="pref-choice pref-mode" aria-pressed={me.locale === locale} lang={locale}>
                    {label}
                  </button>
                </form>
              ))}
            </div>
          </PrefRow>
          <PrefRow label={t(me.locale, "profile.password")}>
            <Link href="/geslo" className="btn">
              <KeyRound size={14} aria-hidden />
              {t(me.locale, "nav.changePassword")}
            </Link>
          </PrefRow>
        </section>
      </div>
    </div>
  );
}
