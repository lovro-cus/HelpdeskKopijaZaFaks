import Link from "next/link";
import { AlertTriangle, CheckCircle2, HardDrive } from "lucide-react";

import { EmptyState } from "@/components/ui";
import type { StorageSummary } from "@/lib/admin-storage";
import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/shared";

/** Bajti v berljivo enoto. Ena decimalka je dovolj — za odločitev "je čas za
 *  čiščenje?" natančnejše število ne pove nič več. */
function bytes(value: number, locale: Locale): string {
  const units = ["B", "kB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 ? size : Number(size.toFixed(1));
  return `${rounded.toLocaleString(locale === "sl" ? "sl-SI" : "en-GB")} ${units[unit]}`;
}

export function AdminStorage({ storage, locale }: { storage: StorageSummary; locale: Locale }) {
  const clean = storage.orphanCount === 0 && storage.missingCount === 0;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3.5">
        <h2 className="caption" style={{ color: "var(--ink)" }}>{t(locale, "admin.storage.title")}</h2>
        <p className="mt-1 max-w-[80ch] text-[12px] text-label-2">{t(locale, "admin.storage.intro")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-3" style={{ borderColor: "var(--separator)" }}>
        <span className="inline-flex items-center gap-2 text-[13px] font-medium">
          <HardDrive size={14} style={{ color: "var(--ink-2)" }} />
          {t(locale, "admin.storage.total", { size: bytes(storage.totalBytes, locale) })}
        </span>
        <span className="mono text-[12px] text-label-3">{t(locale, "admin.storage.count", { count: storage.count })}</span>
      </div>

      <div className="border-t px-4 py-3" style={{ borderColor: "var(--separator)" }}>
        {!storage.readable ? (
          <p className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: "var(--warning)" }}>
            <AlertTriangle size={14} />{t(locale, "admin.storage.unreadable")}
          </p>
        ) : clean ? (
          <p className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: "var(--success)" }}>
            <CheckCircle2 size={14} />{t(locale, "admin.storage.clean")}
          </p>
        ) : (
          <div className="grid gap-1">
            {storage.orphanCount > 0 && (
              <p className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: "var(--warning)" }}>
                <AlertTriangle size={14} />
                {t(locale, "admin.storage.orphans", { count: storage.orphanCount, size: bytes(storage.orphanBytes, locale) })}
              </p>
            )}
            {storage.missingCount > 0 && (
              <p className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: "var(--warning)" }}>
                <AlertTriangle size={14} />{t(locale, "admin.storage.missing", { count: storage.missingCount })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border-t px-4 py-3" style={{ borderColor: "var(--separator)" }}>
        <p className="caption text-label-3">{t(locale, "admin.storage.largest")}</p>
        {storage.largest.length === 0 ? (
          <EmptyState title={t(locale, "admin.storage.none")} />
        ) : (
          <ul className="mt-2 grid gap-1.5">
            {storage.largest.map((file) => (
              <li key={file.id} className="flex flex-wrap items-baseline gap-x-2.5 text-[12.5px]">
                <Link href={`/orders/${file.issueKey}`} className="link mono">#{file.orderNumber}</Link>
                <span className="min-w-0 truncate text-label" title={file.filename}>{file.filename}</span>
                <span className="mono ml-auto text-label-3">{bytes(file.size, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
