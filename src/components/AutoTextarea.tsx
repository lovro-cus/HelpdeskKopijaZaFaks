"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/**
 * Večvrstično polje, ki raste z besedilom do `maxRows`, potem se pomika.
 * Za kratka navodila, kjer enovrstični input skrije pol napisanega.
 * Enter doda novo vrstico; `onSubmit` (če je podan) sproži Ctrl/⌘+Enter.
 */
export function AutoTextarea({
  value,
  minRows = 2,
  maxRows = 8,
  onSubmit,
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  minRows?: number;
  maxRows?: number;
  onSubmit?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const style = getComputedStyle(element);
    const line = Number.parseFloat(style.lineHeight) || 18;
    const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
    const border = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth);
    element.style.height = "auto";
    // scrollHeight vsebuje notranji rob, ne pa obrobe.
    const content = element.scrollHeight - padding;
    const height = Math.min(Math.max(content, line * minRows), line * maxRows) + padding + border;
    element.style.height = `${height}px`;
    element.style.overflowY = content > line * maxRows ? "auto" : "hidden";
  }, [value, minRows, maxRows]);

  return (
    <textarea
      {...rest}
      ref={ref}
      value={value}
      rows={minRows}
      onKeyDown={(event) => {
        if (onSubmit && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          onSubmit();
        }
        rest.onKeyDown?.(event);
      }}
      // Višino določa vsebina, ne privzeta najmanjša višina textarea.field.
      style={{ ...rest.style, minHeight: 0, resize: "none" }}
      className={className}
    />
  );
}
