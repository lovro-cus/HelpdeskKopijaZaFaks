/**
 * Izolacija kopije za faks.
 *
 * Kopija nima povezav na zunanje storitve; ta modul to še dodatno zagotovi:
 *
 *  1. `env()` vrne samo nastavitve s seznama spodaj,
 *  2. vsak `fetch` izven tega računalnika se zavrne (instrumentation.ts).
 *
 * Modul je brez odvisnosti, da ga lahko uvozita instrumentacija in `env.ts`.
 */

export function isSandbox(): boolean {
  // Kopija za faks: vedno izolirana. Izklop samo izrecno z DESK_SANDBOX=0.
  return process.env.DESK_SANDBOX !== "0";
}

/** Nastavitve iz okolja, ki jih kopija bere. Ključev integracij ni. */
export const SANDBOX_ENV_ALLOW: ReadonlySet<string> = new Set(["APP_URL"]);

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Ali sme testna kopija poklicati ta naslov. Samo ta računalnik. */
export function sandboxAllowsUrl(input: string | URL): boolean {
  let url: URL;
  try {
    url = new URL(String(input));
  } catch {
    // Relativen naslov na strežniku ne more nikamor ven.
    return true;
  }
  return LOCAL_HOSTS.has(url.hostname);
}

const GUARDED = Symbol.for("desk.sandbox.guarded");
type GuardedFetch = typeof fetch & { [GUARDED]?: true };
type GuardedGlobal = typeof globalThis & { __deskSandboxGuard?: boolean };

function hostOf(url: string | URL): string {
  try {
    return new URL(String(url)).host;
  } catch {
    return String(url);
  }
}

function guard(inner: typeof fetch): GuardedFetch {
  if ((inner as GuardedFetch)[GUARDED]) return inner as GuardedFetch;
  const guarded = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input;
    if (!sandboxAllowsUrl(url)) {
      console.warn(`[Sandbox] Blocked outbound request to ${hostOf(url)}`);
      return Promise.reject(new TypeError(`Sandbox: outbound request to ${hostOf(url)} blocked`));
    }
    return inner(input, init);
  }) as GuardedFetch;
  // Next.js na svoj fetch pripne oznake (__nextPatched …); ohranimo jih.
  Object.assign(guarded, inner);
  guarded[GUARDED] = true;
  return guarded;
}

/**
 * Zahteva navzven se zavrne kot omrežna napaka, zato jo obstoječa koda obravnava
 * enako kot nedosegljivo storitev ("ni na voljo").
 *
 * Ni dovolj enkrat zamenjati `globalThis.fetch`: Next.js ga ob nalaganju poti
 * ovije s svojim predpomnilnikom in pri tem vzame izvirnik, ki ga je zajel prej.
 * Zato je `fetch` lastnost s setterjem — vsak kasnejši nadomestek, tudi
 * Next.js-ov, se samodejno znova ovije.
 */
export function installSandboxNetworkGuard() {
  const target = globalThis as GuardedGlobal;
  if (target.__deskSandboxGuard) return;
  let current = guard(globalThis.fetch);
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    enumerable: true,
    get: () => current,
    set: (next: typeof fetch) => {
      current = guard(next);
    },
  });
  target.__deskSandboxGuard = true;
}

/**
 * Isti izvirnik dobi vedno isti nadomestek, zato ostanejo povezave med tabelami:
 * ista stranka na ticketu, v Prejeto in na paketu ShipGermana.
 */
export function pseudonymizer(format: (index: number) => string) {
  const seen = new Map<string, string>();
  return (value: string | null | undefined): string | null => {
    const key = value?.trim().toLowerCase();
    if (!key) return value ?? null;
    let fake = seen.get(key);
    if (!fake) {
      fake = format(seen.size + 1);
      seen.set(key, fake);
    }
    return fake;
  };
}
