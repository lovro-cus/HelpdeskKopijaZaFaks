import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { ensureCatalog } from "@/lib/catalog-server";
import { customerEmailDraft, customerLanguageForReply, greetingFor, languageName, signature } from "@/lib/customer-email";
import { db } from "@/lib/db";
import { getEmailConversation, getEmailThread, GmailError } from "@/lib/gmail";

export const dynamic = "force-dynamic";

async function context(id: string) {
  // Jezik odgovora in predloge pisem pridejo iz šifranta jezikov.
  await ensureCatalog();
  return db.inboxConversation.findUnique({
    where: { id: id.slice(0, 40) },
    include: { issue: { include: { items: { orderBy: { position: "asc" } }, parcels: { orderBy: { createdAt: "asc" } } } } },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSessionUser()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const item = await context(id);
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Pogovor brez ticketa beremo po stranki iz maila; naročila še ne poznamo.
  const customerEmail = item.issue?.customerEmail ?? item.customerEmail;
  const customerName = item.issue ? item.issue.customerName : item.customerName;
  const orderNumber = item.issue?.orderNumber ?? "";
  if (!customerEmail) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const searchParams = new URL(request.url).searchParams;
    // Pogovor odpremo v celoti: ena nit je pogosto samo zadnji del
    // korespondence (npr. naš odgovor na Shopifyjev kontaktni obrazec začne
    // novo nit). Brez ticketa iščemo po e-naslovu stranke. "all=0" pokaže
    // samo to nit.
    const loadAll = searchParams.get("all") !== "0";
    const thread = () => getEmailThread({ threadId: item.gmailThreadId, customerEmail, customerName, orderNumber });
    const conversation = loadAll
      ? await getEmailConversation({ customerEmail, customerName, orderNumber, threadIds: [item.gmailThreadId] })
        // Široko iskanje je dražje od ene niti; ko spodleti, naj pogovor kljub
        // temu pokaže to, kar zanesljivo imamo.
        .catch(() => thread())
      : await thread();
    const messages = conversation.messages;
    const replyLanguage = customerLanguageForReply(messages, item.issue?.customerCountryCode ?? null);
    const draftBase = {
      language: replyLanguage,
      customerName,
      orderNumber,
      lines: [],
    };
    return NextResponse.json(
      {
        ...conversation,
        messages,
        scope: loadAll && conversation.messages.length > 0 ? "all" : "thread",
        replyLanguage,
        initialBody: customerEmailDraft({ ...draftBase, kind: "custom" }).body,
        quickReplies: {
          returnInstructions: customerEmailDraft({ ...draftBase, kind: "returnInstructions" }).body,
          returnInstructionsWithChoice: customerEmailDraft({ ...draftBase, kind: "returnInstructionsWithChoice" }).body,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof GmailError ? error.code : "unavailable" }, { status: 503 });
  }
}
