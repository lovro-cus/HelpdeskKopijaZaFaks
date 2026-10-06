import { redirect } from "next/navigation";

import { AppBar } from "@/components/AppBar";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CatalogProvider } from "@/lib/catalog-client";
import { ensureCatalog } from "@/lib/catalog-server";
import { allLanguages } from "@/lib/language-registry";
import { I18nProvider } from "@/lib/i18n/client";
import { ConfigProvider } from "@/lib/config/client";
import { loadConfig } from "@/lib/config/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  if (me.mustChangePw) redirect("/geslo");

  const [config, catalog] = await Promise.all([loadConfig(me.locale), ensureCatalog()]);

  const [users, notifications] = await Promise.all([db.user.findMany({
    where: { active: true },
    orderBy: [{ level: "asc" }, { name: "asc" }],
    select: { id: true, name: true, level: true, color: true },
  }), db.notification.findMany({
    where: { userId: me.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { issue: { select: { key: true, orderNumber: true } } },
  })]);

  return (
    <I18nProvider locale={me.locale}>
      <ConfigProvider value={config}>
        <CatalogProvider snapshot={catalog} languages={allLanguages()}>
          <div className="min-h-viewport">
            <AppBar me={me} users={users} notifications={notifications} />
            <main>{children}</main>
          </div>
        </CatalogProvider>
      </ConfigProvider>
    </I18nProvider>
  );
}
