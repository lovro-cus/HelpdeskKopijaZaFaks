import { NextResponse, type NextRequest } from "next/server";

/**
 * Groba zaščita: brez sejnega piškotka ni dostopa do aplikacije.
 * Prava validacija seje (baza, potek, aktivnost uporabnika) se zgodi
 * v postavitvi strani in v vsaki strežniški akciji — middleware je samo
 * prvo sito, ne edino.
 */
const PUBLIC = ["/login", "/_next", "/favicon.ico", "/robots.txt"];

/**
 * Poti, ki jih kliče stroj in ne brskalnik: cron s CRON_SECRET, webhooki s
 * svojo skrivnostjo. Sejnega piškotka nimajo in ga ne morejo imeti — vsaka
 * si preveri dostop sama, takoj na začetku obravnave.
 */
const MACHINE = ["/api/cron", "/api/webhooks"];

/**
 * Portal za dobavitelja: brez računa, z zasebnim žetonom v poti. Stran, izvoz
 * in akcije žeton preverijo same (lib/supplier-orders.ts → validPortalToken).
 */
const PORTAL = ["/portal"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const passthrough = [...PUBLIC, ...MACHINE, ...PORTAL];
  if (passthrough.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has("helpdesk_session");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
