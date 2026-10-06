import { PasswordForm } from "@/components/PasswordForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requireUser } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n/client";
import { t } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const me = await requireUser();

  return (
    <I18nProvider locale={me.locale}><div className="relative flex min-h-viewport flex-col items-center justify-center px-5 py-12">
      <div className="absolute right-5 top-5">
        <ThemeToggle signedIn />
      </div>

      <div className="w-full max-w-[400px] animate-in">
        <div className="mb-7 text-center">
          <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.018em]">
            {t(me.locale, "auth.changeTitle")}
          </h1>
          <p className="mt-1 text-[13px] text-label-2">
            {me.mustChangePw
              ? t(me.locale, "auth.firstPassword")
              : t(me.locale, "auth.signedInAs", { name: me.name })}
          </p>
        </div>

        <PasswordForm />
      </div>
    </div></I18nProvider>
  );
}
