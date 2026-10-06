import { notFound } from "next/navigation";

import { SupplierBoard } from "@/components/SupplierBoard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wordmark } from "@/components/Wordmark";
import { loadTextSettings } from "@/lib/config/server";
import { I18nProvider } from "@/lib/i18n/client";
import { t } from "@/lib/i18n/server";
import { validPortalToken } from "@/lib/supplier-orders";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Portal za dobavitelja: brez prijave, z zasebno povezavo. Vidi samo seznam
 * za naročilo in uvoz trackinga — nobenih ticketov, strank ali pošte.
 */
export default async function SupplierPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await validPortalToken(token))) notFound();
  const { supplierName } = await loadTextSettings();
  const locale = "en";

  return (
    <I18nProvider locale={locale}>
      <div className="min-h-viewport">
        <header className="mx-auto flex max-w-[1100px] items-center justify-between px-4 pt-5 sm:px-6">
          <Wordmark height={22} />
          <ThemeToggle />
        </header>
        <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
          <div className="mb-5">
            <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.015em]">{t(locale, "supplier.portal.heading", { supplier: supplierName })}</h1>
            <p className="mt-1 max-w-[70ch] text-[12.5px] text-label-2">{t(locale, "supplier.portal.lede")}</p>
          </div>
          <SupplierBoard locale={locale} portalToken={token} />
        </main>
      </div>
    </I18nProvider>
  );
}
