"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";

import { MAX_UPLOADS_PER_EVENT } from "@/lib/domain";
import { useT } from "@/lib/i18n/client";

/**
 * Izbira slik za korak ali opombo: klik, drag & drop ali Ctrl+V.
 * Datoteke se sinhronizirajo v skrit <input name="files">, da jih
 * strežniška akcija dobi v FormData.
 */
export function AttachmentPicker({ label }: { label?: string }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const write = (next: File[]) => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    for (const f of next) dt.items.add(f);
    inputRef.current.files = dt.files;
  };

  const add = useCallback((incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const list = Array.from(incoming).filter((f) => f.size > 0);
    if (list.length === 0) return;
    setFiles((prev) => {
      const next = [...prev, ...list].slice(0, MAX_UPLOADS_PER_EVENT);
      write(next);
      return next;
    });
  }, []);

  // Prilepljen screenshot znotraj tega obrazca
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const form = zone.closest("form") ?? zone;
    function onPaste(e: Event) {
      const items = (e as ClipboardEvent).clipboardData?.items;
      if (!items) return;
      const picked: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) picked.push(f);
        }
      }
      if (picked.length) {
        e.preventDefault();
        add(picked);
      }
    }
    form.addEventListener("paste", onPaste);
    return () => form.removeEventListener("paste", onPaste);
  }, [add]);

  const remove = (idx: number) =>
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      write(next);
      return next;
    });

  return (
    <div
      ref={zoneRef}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        add(e.dataTransfer.files);
      }}
      className={`transition-colors ${dragOver ? "ring-2 ring-blue" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        name="files"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf"
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn btn-sm"
          title={t("attachment.help")}
        >
          <Paperclip size={13} />
          {label ?? t("attachment.image")}
        </button>
        {files.length === 0 && (
          <span className="text-[12px] text-label-3">{t("attachment.hint")}</span>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <Thumb key={`${f.name}-${i}`} file={f} onRemove={() => remove(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Thumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <div className="group relative">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={file.name}
          className="h-[62px] w-[62px] border object-cover"
          style={{ borderColor: "var(--separator)" }}
        />
      ) : (
        <div className="flex h-[62px] w-[104px] items-center justify-center border bg-surface-2 px-2 text-center text-[10.5px] leading-tight text-label-2">
          {file.name}
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Odstrani ${file.name}`}
        className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center border bg-surface text-label-2 hover:text-red"
        style={{ borderColor: "var(--separator)" }}
      >
        <X size={10} />
      </button>
    </div>
  );
}
