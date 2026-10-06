import "server-only";

import { isSandbox, SANDBOX_ENV_ALLOW } from "./sandbox";

/**
 * Branje nastavitev iz okolja.
 *
 * Docker Compose pri `env_file` narekovajev ne odstrani: vrstica
 *     TRACK17_TOKEN="D3F..."
 * pride v proces skupaj z narekovaji. To nam je enkrat že podrlo povezavo s
 * Shopifyjem (domena z narekovaji ni prestala preverbe), zato jih porežemo
 * na enem mestu in nikjer drugje ne beremo process.env neposredno.
 */
export function env(name: string): string | undefined {
  // Testna kopija baze: integracije so "nenastavljene" (lib/sandbox.ts).
  if (isSandbox() && !SANDBOX_ENV_ALLOW.has(name)) return undefined;
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  return raw.replace(/^["']|["']$/g, "").trim() || undefined;
}

export function envFlag(name: string): boolean {
  const value = env(name)?.toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}
