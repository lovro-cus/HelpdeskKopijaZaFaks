export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) return;
  // Kopija za faks: nič v ozadju in nič navzven (lib/sandbox.ts).
  const { installSandboxNetworkGuard } = await import("./lib/sandbox");
  installSandboxNetworkGuard();
  console.log("[Sandbox] Kopija za faks — izmišljeni podatki, povezave navzven izklopljene.");
}
