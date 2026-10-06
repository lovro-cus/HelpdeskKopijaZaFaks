import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { key } = await params;
  const issue = await db.issue.findUnique({
    where: { key: decodeURIComponent(key).slice(0, 40) },
    select: {
      events: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 3,
        select: {
          id: true,
          kind: true,
          body: true,
          field: true,
          fromValue: true,
          toValue: true,
          outsider: true,
          createdAt: true,
          author: { select: { name: true, color: true, level: true, isAdmin: true } },
        },
      },
    },
  });

  if (!issue) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(
    {
      events: issue.events.reverse().map((event) => ({ ...event, attachments: [] })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
