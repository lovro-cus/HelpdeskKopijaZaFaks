"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/client";

const sheetStack: symbol[] = [];

/**
 * List, dvignjen nad ostale. Miza pod njim potemni, list dobi pravo senco in
 * lastno glavo — enako kot vsak drug zapis v tem sistemu, le da leži zgoraj.
 */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  width = 660,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  const t = useT();
  const sheetId = useRef(Symbol("sheet")).current;
  useEffect(() => {
    sheetStack.push(sheetId);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sheetStack.at(-1) === sheetId) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      const index = sheetStack.lastIndexOf(sheetId);
      if (index >= 0) sheetStack.splice(index, 1);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, sheetId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto p-4 pt-[calc(8vh_/_var(--ui-zoom))]"
      style={{
        background: "rgba(10, 10, 14, 0.45)",
        animation: "overlay-in .12s ease-out",
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full overflow-hidden border bg-surface"
        style={{
          maxWidth: width,
          borderColor: "var(--rule-strong)",
          borderTop: "2px solid var(--rule-ink)",
          boxShadow: "var(--lift-high)",
          animation: "sheet-in .18s var(--ease)",
        }}
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
          <div>
            <h2 className="text-[15px] font-semibold leading-tight tracking-[-0.012em]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-label-2">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn btn-sm px-1.5" aria-label={t("common.close")}>
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
