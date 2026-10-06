import { ProcessMap } from "@/components/ProcessMap";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/server";
import { collectOpen } from "@/lib/process";
import { ensureProcessSeeded } from "@/lib/process-seed";

export const dynamic = "force-dynamic";

/**
 * Zapisan potek dela s stranko — kaj pišemo, v kakšnem vrstnem redu in kje
 * poteka nihče ni določil. Ureja ga lahko vsak, ki je prijavljen: zapis, ki ga
 * sme popraviti samo eden, v pol leta ne drži več.
 */
export default async function ProcessPage() {
  const me = await requireUser();
  await ensureProcessSeeded();

  const [branches, steps] = await Promise.all([
    db.processBranch.findMany({
      orderBy: { position: "asc" },
      select: { id: true, key: true, title: true, subtitle: true, position: true },
    }),
    db.processStep.findMany({
      orderBy: { position: "asc" },
      select: { id: true, branchId: true, parentId: true, kind: true, title: true, body: true, edgeLabel: true, open: true, position: true },
    }),
  ]);

  // Rdeči seznam se ne vodi posebej: sestavijo ga vprašanja, pripisana korakom,
  // zato ne more zastarati mimo risbe.
  const open = collectOpen(branches, steps);
  const openCount = open.reduce((sum, group) => sum + group.items.length, 0);

  const legend = [
    ["act", "var(--petrol)"],
    ["mail", "var(--petrol)"],
    ["dec", "var(--rule-ink)"],
    ["wait", "var(--warning)"],
    ["sys", "var(--ink-3)"],
    ["end", "var(--success)"],
    ["undef", "var(--stamp)"],
  ] as const;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <header className="mb-5 border-b pb-4" style={{ borderColor: "var(--rule-strong)" }}>
        <h1 className="text-[19px] font-semibold leading-tight tracking-[-0.02em]">{t(me.locale, "process.title")}</h1>
        <p className="mt-1.5 max-w-[70ch] text-[13px] text-label-2">{t(me.locale, "process.lede")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {legend.map(([kind, color]) => (
            <span key={kind} className="caption flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-[10px] w-[3px]" style={{ background: color }} />
              {t(me.locale, `process.kind.${kind}` as never)}
            </span>
          ))}
        </div>
      </header>

      <ProcessMap branches={branches} steps={steps} />

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold tracking-[-0.012em]">
          {t(me.locale, "process.open.title")}{" "}
          <span className="mono text-[12px] font-normal text-label-3">{openCount}</span>
        </h2>
        <p className="mt-1 max-w-[70ch] text-[12.5px] text-label-2">{t(me.locale, "process.open.lede")}</p>

        {open.length === 0 ? (
          <p className="mt-3 text-[12.5px] text-label-3">{t(me.locale, "process.open.none")}</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {open.map((group) => (
              <div key={group.key} className="pm-open-group">
                <p className="caption" style={{ color: "var(--stamp)" }}>{group.key} · {group.branch}</p>
                <ul className="mt-2 grid gap-2">
                  {group.items.map((item, index) => (
                    <li key={index} className="pm-open-item">
                      <span className="text-[12.5px] text-label-2">{item.question}</span>
                      <span className="mt-0.5 block text-[11px] text-label-3">{item.step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
