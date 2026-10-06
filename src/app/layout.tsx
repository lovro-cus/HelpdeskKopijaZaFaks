import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { appearanceAttributes, DEFAULT_APPEARANCE } from "@/lib/appearance";
import { getSessionUser } from "@/lib/auth";
import { isSandbox } from "@/lib/sandbox";
import "./globals.css";

/**
 * Plex Sans nosi besedilo, Plex Mono vse podatke — številke naročil, ključe,
 * datume, števce — in rubrike obrazca. Latin-ext je obvezen: brez njega
 * "Kovačič" in "Jakna" nista ista pisava.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-mono",
});

/**
 * Izbirna pisava iz profila za tiste, ki jim je Plex pri drobnem besedilu
 * pretesen: I, l in 1 ter O in 0 so jasno različni. Brskalnik jo prenese šele,
 * ko jo kdo izbere. Ima samo 400 in 700 — 500/600 padeta na najbližjo.
 */
const hyperlegible = Atkinson_Hyperlegible({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-hyperlegible",
});

export const metadata: Metadata = {
  title: "HelpDesk",
  description: "Internal returns, exchanges and order issue desk",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e3e2de" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

/**
 * Temna tema se odloči pred prvim izrisom, sicer stran blisne. Vrstni red:
 * izbira v profilu (`data-mode`), stara izbira v brskalniku, sistem. Pri
 * "po sistemu" stran sledi tudi, ko se sistem med delom preklopi.
 * Logika je ista kot `resolveDark` v lib/appearance.ts.
 */
const themeScript = `
(function () {
  try {
    var root = document.documentElement;
    var media = window.matchMedia("(prefers-color-scheme: dark)");
    var apply = function () {
      var stored = null;
      try { stored = localStorage.getItem("theme"); } catch (e) {}
      var valid = function (m) { return m === "light" || m === "dark" || m === "system" ? m : null; };
      var mode = valid(root.getAttribute("data-mode")) || valid(stored) || "system";
      root.classList.toggle("dark", mode === "dark" || (mode === "system" && media.matches));
    };
    apply();
    media.addEventListener("change", apply);
  } catch (e) {}
})();
`;

const CONTRACT = `
THESIS: A returns desk built as the paper it replaced — sheets of work laid on a drafting table.
It refuses the indigo-on-white Linear clone it grew out of, and refuses colour as a substitute for hierarchy.
OWN-WORLD: Mid-tone desk ground under a 24px drafting grid; near-white cut sheets, zero radius, hairline
rules with one heavy rule per document head. Ink in three strengths, no hue anywhere. One stamp red
(#a8271c / #e2695c) reserved for urgent, stale, error and destructive. IBM Plex Sans for prose,
IBM Plex Mono for every datum and every uppercase field caption.
STORY: The visitor scans a table of sheets, reads the order number first, lifts the one that moved,
adds evidence to its record, and hands it up a level.
FIRST VIEWPORT: Masthead with the HelpDesk wordmark over a full ink rule; view register as file tabs;
sheets in a grid, each led by a large mono order number under its own head rule, assignee stamped right.
FORM: Technical worksheet, direction pinned by the user over the dealt set (paper/document lane).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Izgled je vezan na račun; stran za prijavo ga še ne pozna in ostane privzeta.
  const me = await getSessionUser();
  const attributes = appearanceAttributes(me?.appearance ?? DEFAULT_APPEARANCE);

  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${hyperlegible.variable}`}
      suppressHydrationWarning
      {...attributes}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: `<!--${CONTRACT}-->` }} />
        {children}
        {isSandbox() && (
          <div className="sandbox-flag" role="status">
            Kopija za faks · izmišljeni podatki · povezave navzven izklopljene
          </div>
        )}
      </body>
    </html>
  );
}
