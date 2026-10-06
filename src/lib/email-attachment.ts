export type EmailAttachmentPreview = "image" | "pdf" | "text" | "none";
export const MAX_TEXT_ATTACHMENT_PREVIEW_BYTES = 512 * 1024;

const SAFE_IMAGE_TYPES = new Set([
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function emailAttachmentPreview(mimeType: string, size = 0): EmailAttachmentPreview {
  const normalized = mimeType.toLowerCase().split(";", 1)[0].trim();
  if (SAFE_IMAGE_TYPES.has(normalized)) return "image";
  if (normalized === "application/pdf") return "pdf";
  if (normalized === "text/plain") return size > MAX_TEXT_ATTACHMENT_PREVIEW_BYTES ? "none" : "text";
  return "none";
}

export function safeAttachmentFilename(filename: string): string {
  const cleaned = filename.replace(/[\r\n\0]/g, " ").trim();
  return cleaned.slice(0, 240) || "attachment";
}

export function gmailAttachmentReference(partId?: string, attachmentId?: string): string {
  const part = partId?.trim();
  if (part) return `part:${part}`;
  return attachmentId?.trim() || "";
}
