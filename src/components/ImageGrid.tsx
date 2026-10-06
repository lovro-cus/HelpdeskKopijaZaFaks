"use client";

import { useEffect, useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export type Att = { id: number; filename: string; mime: string; size: number };

const src = (id: number) => `/api/files/${id}`;
/** Sličica za nit: 84×84 kvadratek ne potrebuje izvirnika (glej lib/uploads.ts). */
const thumbSrc = (id: number) => `/api/files/${id}?thumb=1`;

export function ImageGrid({ attachments }: { attachments: Att[] }) {
  const t = useT();
  const [open, setOpen] = useState<Att | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {attachments.map((a) =>
          a.mime.startsWith("image/") ? (
            <button
              key={a.id}
              onClick={() => setOpen(a)}
              className="overflow-hidden border transition-transform hover:scale-[1.02]"
              style={{ borderColor: "var(--separator)" }}
              title={a.filename}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbSrc(a.id)}
                alt={a.filename}
                width={84}
                height={84}
                // Nit ima lahko desetine slik; tiste izven pogleda naj počakajo.
                loading="lazy"
                decoding="async"
                className="h-[84px] w-[84px] object-cover"
              />
            </button>
          ) : (
            <a
              key={a.id}
              href={src(a.id)}
              target="_blank"
              rel="noreferrer"
              className="flex h-[84px] w-[118px] flex-col items-center justify-center gap-1 border bg-surface-2 px-2 text-center text-[10.5px] text-label-2"
              style={{ borderColor: "var(--separator)" }}
            >
              <FileText size={17} />
              <span className="line-clamp-2">{a.filename}</span>
            </a>
          ),
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-6"
          style={{
            background: "rgba(0,0,0,0.86)",
            backdropFilter: "blur(8px)",
            animation: "overlay-in .16s ease-out",
          }}
          onClick={() => setOpen(null)}
        >
          <div className="mb-3 flex w-full max-w-[920px] items-center gap-3 text-[13px] text-white/80">
            <span className="truncate">{open.filename}</span>
            <a
              href={src(open.id)}
              download={open.filename}
              onClick={(e) => e.stopPropagation()}
              className="ml-auto flex items-center gap-1.5 hover:text-white"
            >
              <Download size={14} /> {t("common.download")}
            </a>
            <button onClick={() => setOpen(null)} aria-label={t("common.close")} className="hover:text-white">
              <X size={18} />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src(open.id)}
            alt={open.filename}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[calc(80vh_/_var(--ui-zoom))] max-w-[920px] object-contain"
            style={{ boxShadow: "var(--shadow-3)" }}
          />
        </div>
      )}
    </>
  );
}
