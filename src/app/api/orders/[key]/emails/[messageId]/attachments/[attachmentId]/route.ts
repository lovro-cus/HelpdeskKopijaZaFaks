import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailAttachmentPreview } from "@/lib/email-attachment";
import { getEmailAttachment, GmailAttachmentError, GmailError } from "@/lib/gmail";

export const dynamic = "force-dynamic";

function contentDisposition(filename: string, inline: boolean): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string; messageId: string; attachmentId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { key, messageId, attachmentId } = await params;
  const issue = await db.issue.findUnique({
    where: { key: decodeURIComponent(key).slice(0, 40) },
    select: {
      customerEmail: true,
      customerName: true,
      orderNumber: true,
      inboxConversations: { select: { gmailThreadId: true } },
    },
  });
  if (!issue || !issue.customerEmail) return Response.json({ error: "not_found" }, { status: 404 });

  try {
    const attachment = await getEmailAttachment({
      customerEmail: issue.customerEmail,
      customerName: issue.customerName,
      orderNumber: issue.orderNumber,
      messageId: decodeURIComponent(messageId),
      attachmentRef: decodeURIComponent(attachmentId),
      // Priloga iz niti, ki visi na tem ticketu, je njegova — tudi če je pisal
      // kdo drug kot stranka (prevoznik, druga stranka iz istega gospodinjstva).
      threadIds: issue.inboxConversations.map((conversation) => conversation.gmailThreadId),
    });
    const download = new URL(request.url).searchParams.get("download") === "1";
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
    console.error("Email attachment failed", error);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
