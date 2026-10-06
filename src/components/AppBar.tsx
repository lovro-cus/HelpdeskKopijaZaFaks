"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Boxes, ClipboardList, Info, Languages, LogOut, Mail, Plus, Settings2, Truck, UserRound, Warehouse } from "lucide-react";

import { logout } from "@/lib/actions/auth";
import { markAllNotificationsRead, setLocale } from "@/lib/actions/preferences";
import type { SessionUser } from "@/lib/auth";
import { useT } from "@/lib/i18n/client";
import { manageAreas } from "@/lib/permissions";
import { NewOrderSheet, type PickableUser } from "./NewOrderSheet";
import { OrderSearch } from "./OrderSearch";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./ui";
import { Wordmark } from "./Wordmark";

type AppNotification = {
  id: number; kind: string; actorName: string; preview: string | null; createdAt: Date;
  /** Null pri odpremi novega naročila — ta ticketa nima. */
  issue: { key: string; orderNumber: string } | null;
  outboundOrderNumber: string | null;
};

export function AppBar({ me, users, notifications }: { me: SessionUser; users: PickableUser[]; notifications: AppNotification[] }) {
  const t = useT();
  const pathname = usePathname();
  // Stran »Urejanje« se pokaže vsakomur, ki sme urejati vsaj eno njeno področje.
  const canManage = manageAreas(me).length > 0;

  // Predal za nov ticket. Vrednost je tudi številka naročila, s katero se odpre
  // (iz iskanja); null pomeni zaprt.
  const [sheet, setSheet] = useState<{ orderNumber: string } | null>(null);
  const [menu, setMenu] = useState(false);
  const [notices, setNotices] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const noticesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "Escape") { setMenu(false); setNotices(false); }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setSheet({ orderNumber: "" });
      }
    }
    // Odprt predal se zapre s klikom kamorkoli izven njega — tipka Escape in
    // ponoven klik na gumb sta pot za tipkovnico, ne edini izhod.
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenu(false);
      if (noticesRef.current && !noticesRef.current.contains(target)) setNotices(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  return (
    <>
      <header className="bar sticky top-0 z-40">
        <div className="mx-auto flex h-[50px] max-w-[1320px] items-center gap-3 px-4 sm:px-6">
          <Link href="/orders" className="flex shrink-0 items-center" aria-label="HelpDesk">
            <Wordmark height={20} />
          </Link>

          <nav className="ml-3 hidden items-center gap-1 md:flex">
            <NavLink href="/orders" active={pathname.startsWith("/orders")}>
              {t("nav.tickets")}
            </NavLink>
            <NavLink href="/inbox" active={pathname.startsWith("/inbox")}>
              {t("nav.inbox")}
            </NavLink>
            {me.level >= 2 && (
              <NavLink href="/shipg" active={pathname.startsWith("/shipg")}>
                {t("nav.shipg")}
              </NavLink>
            )}
            {me.level >= 2 && (
              <NavLink href="/dobavitelj" active={pathname.startsWith("/dobavitelj")}>
                {t("nav.supplier")}
              </NavLink>
            )}
            {canManage && (
              <NavLink href="/urejanje" active={pathname.startsWith("/urejanje")}>
                {t("nav.manage")}
              </NavLink>
            )}
            {me.isAdmin && (
              <NavLink href="/admin" active={pathname.startsWith("/admin")}>
                {t("nav.dashboard")}
              </NavLink>
            )}
          </nav>

          <OrderSearch onCreate={(orderNumber) => setSheet({ orderNumber })} />

          <Link
            href="/process"
            className="btn btn-sm px-2"
            title={t("nav.process")}
            aria-label={t("nav.process")}
            data-active={pathname.startsWith("/process") || undefined}
          >
            <Info size={15} />
          </Link>

          <ThemeToggle signedIn />

          <div className="relative" ref={noticesRef}>
            <button
              onClick={() => { setNotices((v) => !v); setMenu(false); }}
              className="btn btn-sm relative px-2"
              aria-label={t("nav.notifications")}
            >
              <Bell size={15} />
              {notifications.length > 0 && (
                // Rdeč žig na vogalu: edina barva v vrstici in edina stvar,
                // ki v mirnem dokumentu terja pogled.
                <span
                  className="mono absolute -right-1.5 -top-1.5 min-w-[15px] px-[3px] text-center text-[10px] font-semibold leading-[15px]"
                  style={{ background: "var(--stamp)", color: "var(--sheet)" }}
                >
                  {notifications.length}
                </span>
              )}
            </button>
            {notices && (
              <div className="card absolute right-0 top-[34px] w-[310px] overflow-hidden p-1 animate-in" style={{ boxShadow: "var(--shadow-3)" }}>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <p className="text-[12.5px] font-semibold">{t("nav.notifications")}</p>
                  {notifications.length > 0 && <form action={markAllNotificationsRead}><button className="link text-[11.5px]">{t("nav.markAllRead")}</button></form>}
                </div>
                <div className="hairline" />
                {notifications.length === 0 ? (
                  <p className="px-3 py-5 text-center text-[12px] text-label-3">{t("nav.noNotifications")}</p>
                ) : notifications.map((n) => {
                  // Ticket pelje v nit, odprema novega naročila pa na naročilo.
                  const href = n.issue
                    ? `/orders/${n.issue.key}`
                    : `/unfulfilled/${encodeURIComponent(n.outboundOrderNumber ?? "")}`;
                  const number = n.issue?.orderNumber ?? n.outboundOrderNumber ?? "—";
                  return (
                    <Link key={n.id} href={href} onClick={() => setNotices(false)} className="block px-2 py-2 hover:bg-fill">
                      <p className="text-[12.5px] font-medium">#{number} · {n.actorName}</p>
                      {n.preview && <p className="mt-0.5 line-clamp-2 text-[11.5px] text-label-2">{n.preview}</p>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={() => setSheet({ orderNumber: "" })} className="btn btn-primary btn-sm">
            <Plus size={15} />
            <span className="hidden sm:inline">{t("nav.new")}</span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenu((v) => !v)}
              className="flex items-center"
              aria-haspopup="menu"
              aria-expanded={menu}
              aria-label={t("nav.userMenu")}
            >
              <Avatar name={me.name} color={me.color} size={28} />
            </button>

            {menu && (
              <div
                role="menu"
                className="card absolute right-0 top-[34px] w-[216px] overflow-hidden p-1 animate-in"
                style={{ boxShadow: "var(--shadow-3)" }}
              >
                <div className="px-2 py-1.5">
                  <p className="truncate text-[12.5px] font-semibold">{me.name}</p>
                  <p className="truncate text-[11.5px] text-label-2">
                    @{me.username} · {me.isAdmin ? t("nav.admin") : t("nav.level", { level: me.level })}
                  </p>
                </div>
                <div className="hairline my-1" />
                <div className="md:hidden">
                  <MenuLink href="/orders" icon={ClipboardList} onClick={() => setMenu(false)}>
                    {t("nav.tickets")}
                  </MenuLink>
                  <MenuLink href="/inbox" icon={Mail} onClick={() => setMenu(false)}>
                    {t("nav.inbox")}
                  </MenuLink>
                  {me.level >= 2 && (
                    <MenuLink href="/shipg" icon={Warehouse} onClick={() => setMenu(false)}>
                      {t("nav.shipg")}
                    </MenuLink>
                  )}
                  {me.level >= 2 && (
                    <MenuLink href="/dobavitelj" icon={Truck} onClick={() => setMenu(false)}>
                      {t("nav.supplier")}
                    </MenuLink>
                  )}
                  {canManage && (
                    <MenuLink href="/urejanje" icon={Boxes} onClick={() => setMenu(false)}>
                      {t("nav.manage")}
                    </MenuLink>
                  )}
                  <div className="hairline my-1" />
                </div>
                {me.isAdmin && (
                  <MenuLink href="/admin" icon={Settings2} onClick={() => setMenu(false)}>
                    {t("nav.manageUsers")}
                  </MenuLink>
                )}
                {/* Obvestila, izgled in geslo so v profilu — v ozkem meniju je
                    bil obrazec obvestil pretesen za razlage. */}
                <MenuLink href="/profil" icon={UserRound} onClick={() => setMenu(false)}>
                  {t("nav.profile")}
                </MenuLink>
                <div className="flex items-center gap-2 px-2 py-1 text-[12.5px] text-label-2">
                  <Languages size={15} />
                  <span className="mr-auto">{t("nav.language")}</span>
                  {(["en", "sl"] as const).map((locale) => (
                    <form action={setLocale} key={locale}>
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className={`px-1.5 py-0.5 uppercase ${me.locale === locale ? "bg-fill font-semibold text-label" : "text-label-3"}`}>{locale}</button>
                    </form>
                  ))}
                </div>
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex h-7 w-full items-center gap-2 px-2 text-[12.5px] text-red transition-colors hover:bg-fill"
                  >
                    <LogOut size={14} />
                    {t("nav.logout")}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {sheet && (
        <NewOrderSheet me={me} users={users} orderNumber={sheet.orderNumber} onClose={() => setSheet(null)} />
      )}
    </>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="caption nav-link" data-active={active ? "true" : undefined}>
      {children}
    </Link>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex h-7 items-center gap-2 px-2 text-[12.5px] text-label-2 transition-colors hover:bg-fill hover:text-label"
    >
      <Icon size={15} />
      {children}
    </Link>
  );
}
