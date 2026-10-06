import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getEmailConversation, GmailError } from "@/lib/gmail";
import { emailConversationFingerprint } from "@/lib/email-fingerprint";
import { translateEmailConversation, translationConfigured } from "@/lib/translation";

export const dynamic = "force-dynamic";

function lookup(request: Request) {
  const params = new URL(request.url).searchParams;
  const customerEmail = (params.get("customerEmail") ?? "").trim().slice(0, 254);
  const orderNumber = (params.get("orderNumber") ?? "").trim().replace(/^#/, "").slice(0, 40);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || !orderNumber) return null;
  return { customerEmail, customerName: null, orderNumber };
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const input = lookup(request);
  if (!input) return NextResponse.json({ error: "invalid_lookup" }, { status: 422 });

  try {
    const conversation = await getEmailConversation(input);
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
        summaryAvailable: true,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof GmailError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "auth" ? 502 : 503 });
    }
    console.error("Pre-order email preview failed", error);
    const code = error instanceof Error && error.message.startsWith("translation_") ? "translation_failed" : "unavailable";
    return NextResponse.json({ error: code }, { status: 503 });
  }
}
