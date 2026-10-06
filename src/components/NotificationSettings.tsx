"use client";

import { useState } from "react";

import { updateNotifications } from "@/lib/actions/preferences";
import { usePriorityOptions } from "@/lib/config/client";
import { useT } from "@/lib/i18n/client";
import { PrefRow, SaveStatus, type SaveState } from "./ProfileParts";
import { NotifyMatrixFields } from "./NotifyMatrixFields";
import type { NotifyMatrix } from "@/lib/notify-prefs";

/** E-poštna obvestila. Prej v meniju uporabnika, zdaj v profilu, kjer je prostor za razlage. */
export function NotificationSettings({
  email,
  matrix,
  notifyPriority,
  notifyDigest,
}: {
  email: string | null;
  matrix: NotifyMatrix;
  notifyPriority: string;
  notifyDigest: boolean;
}) {
  const t = useT();
  const priorities = usePriorityOptions();
  const [state, setState] = useState<SaveState>("idle");

  return (
    <section className="card" aria-labelledby="notifications-title">
      <header className="pref-head">
        <h2 id="notifications-title" className="pref-title">{t("settings.notifications")}</h2>
        <SaveStatus state={state} />
      </header>
      <form
        action={async (fd) => {
          setState("saving");
          try {
            await updateNotifications(fd);
            setState("saved");
          } catch {
            setState("failed");
          }
        }}
        onChange={() => setState("idle")}
      >
        <PrefRow label={t("settings.email")} labelFor="profile-email">
          <input id="profile-email" name="email" type="email" autoComplete="email" defaultValue={email ?? ""} className="field max-w-[360px]" />
        </PrefRow>

        {/* Ista tabela, kot jo za to osebo vidi admin. */}
        <PrefRow label={t("notifyPrefs.title")} hint={t("notifyPrefs.intro")}>
          <NotifyMatrixFields matrix={matrix} />
        </PrefRow>

        <PrefRow label={t("profile.mailWhat")}>
          <div className="grid gap-2.5">
            <label className="pref-check">
              <input name="notifyDigest" type="checkbox" defaultChecked={notifyDigest} />
              {t("settings.digest")}
            </label>
          </div>
        </PrefRow>

        {/* Prag ne izklopi obvestil, le pošto: zvonec dobi vse naprej. */}
        <PrefRow label={t("settings.threshold")} hint={t("settings.thresholdHint")} labelFor="profile-threshold">
          <select id="profile-threshold" name="notifyPriority" defaultValue={notifyPriority} className="field max-w-[360px]">
            {/* Napis nastane iz šifranta: naštevanje prioritet v slovarju bi se
                podrlo, brž ko admin katero doda. */}
            {priorities.map((priority, index) => (
              <option key={priority.key} value={priority.key}>
                {index === 0
                  ? t("settings.thresholdOnly", { priority: priority.label })
                  : index === priorities.length - 1
                    ? t("settings.thresholdAll")
                    : t("settings.thresholdFrom", { priority: priority.label })}
              </option>
            ))}
          </select>
        </PrefRow>

        <div className="pref-row">
          <div className="hidden md:block" />
          <div>
            <button type="submit" className="btn btn-primary" disabled={state === "saving"}>
              {t("settings.save")}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
