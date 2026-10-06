import { getSessionUser } from "@/lib/auth";
import { emailAttachmentPreview } from "@/lib/email-attachment";
import { getEmailAttachment, GmailAttachmentError, GmailError } from "@/lib/gmail";

export const dynamic = "force-dynamic";

function contentDisposition(filename: string, inline: boolean): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ messageId: string; attachmentId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const query = new URL(request.url).searchParams;
  const customerEmail = (query.get("customerEmail") ?? "").trim().slice(0, 254);
  const orderNumber = (query.get("orderNumber") ?? "").trim().replace(/^#/, "").slice(0, 40);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || !orderNumber) {
    return Response.json({ error: "invalid_lookup" }, { status: 422 });
  }

  const { messageId, attachmentId } = await params;
  try {
    const attachment = await getEmailAttachment({
      customerEmail,
      customerName: null,
      orderNumber,
      messageId: decodeURIComponent(messageId),
      attachmentRef: decodeURIComponent(attachmentId),
    });
    const download = query.get("download") === "1";
    const requestedPreview = emailAttachmentPreview(attachment.mimeType);
    if (!download && requestedPreview !== "none" && attachment.preview === "none") {
      return Response.json({ error: "preview_too_large" }, { status: 413 });
    }
    const inline = !download && attachment.preview !== "none";
    return new Response(new Uint8Array(attachment.data), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": contentDisposition(attachment.filename, inline),
        "Content-Length": String(attachment.size),
        "Content-Type": attachment.mimeType,
        "Cross-Origin-Resource-Policy": "same-origin",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof GmailAttachmentError) {
      return Response.json({ error: error.code }, { status: error.code === "too_large" ? 413 : 404 });
    }
    if (error instanceof GmailError) {
      return Response.json({ error: error.code }, { status: error.code === "auth" ? 502 : 503 });
    }
    console.error("Pre-order email attachment failed", error);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
