import { redirect } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wordmark } from "@/components/Wordmark";
import { getSessionUser } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n/client";
import { t } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.mustChangePw ? "/geslo" : "/orders");

  return (
    <I18nProvider locale="en"><div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      {/* En sam list, položen na sredino mize. */}
      <div className="card w-full max-w-[352px] animate-in px-7 py-7" style={{ boxShadow: "var(--lift)" }}>
        <div className="mb-6">
          <Wordmark height={26} />
          <div className="mt-3.5 mb-3.5 h-px w-full" style={{ background: "var(--rule-ink)" }} />
          <p className="text-[13px] text-label-2">{t("en", "auth.signInPrompt")}</p>
        </div>

        <LoginForm />

        <p className="mt-6 text-[12px] leading-relaxed text-label-3">
          {t("en", "auth.noRegistration")}
        </p>
      </div>
    </div></I18nProvider>
  );
}
