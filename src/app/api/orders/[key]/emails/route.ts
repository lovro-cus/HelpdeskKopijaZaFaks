import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEmailConversation, GmailError } from "@/lib/gmail";
import { emailConversationFingerprint } from "@/lib/email-fingerprint";
import { translateEmailConversation, translationConfigured } from "@/lib/translation";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { key } = await params;
  const issue = await db.issue.findUnique({
    where: { key: decodeURIComponent(key).slice(0, 40) },
    select: {
      customerEmail: true,
      customerName: true,
      orderNumber: true,
      inboxConversations: { select: { gmailThreadId: true } },
    },
  });
  if (!issue) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!issue.customerEmail) return NextResponse.json({ error: "missing_customer_email" }, { status: 422 });

  try {
    const conversation = await getEmailConversation({
      customerEmail: issue.customerEmail,
      customerName: issue.customerName,
      orderNumber: issue.orderNumber,
      threadIds: issue.inboxConversations.map((conversation) => conversation.gmailThreadId),
    });
    const shouldTranslate = new URL(request.url).searchParams.get("translate") === "1";
    const messages = shouldTranslate
      ? await translateEmailConversation(conversation.messages)
      : conversation.messages;
    return NextResponse.json(
      {
        ...conversation,
        messages,
        fingerprint: emailConversationFingerprint(conversation.messages),
        translated: shouldTranslate,
        translationAvailable: translationConfigured(),
        // Povzetek je zmožnost tega endpointa, ne rezultat ločenega config
        // preizkusa. Dejanski summary endpoint vrne natančno napako ponudnika.
        // Tako napačen/starejši runtime check ne izklopi funkcije v odjemalcu.
        summaryAvailable: true,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof GmailError) {
      const status = error.code === "auth" ? 502 : 503;
      return NextResponse.json({ error: error.code }, { status });
    }
    console.error("Email conversation failed", error);
    const code = error instanceof Error && error.message.startsWith("translation_") ? "translation_failed" : "unavailable";
    return NextResponse.json({ error: code }, { status: 503 });
  }
}
