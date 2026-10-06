import { NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";

import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseScopes, type SearchScope } from "@/lib/search-scope";

export const dynamic = "force-dynamic";

/** Hiter, prijavljen iskalnik za globalni dropdown v glavi aplikacije. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim().slice(0, 80) ?? "";
  if (!query) return NextResponse.json({ results: [] });

  const orderQuery = query.replace(/^#/, "") || query;
  const compact = query.replace(/\s+/g, "");
  // Polja po skupinah, kakor jih ponuja filter v iskalniku (lib/search-scope.ts).
  const fields: Record<SearchScope, Prisma.IssueWhereInput[]> = {
    order: [{ orderNumber: { contains: orderQuery } }, { key: { contains: query } }],
    email: [{ customerEmail: { contains: query } }],
    customer: [
      { customerName: { contains: query } },
      { customerPhone: { contains: query } },
      { customerAddress: { contains: query } },
    ],
    tracking: [
      { returnTracking: { contains: compact } },
      { replacementTracking: { contains: compact } },
      { parcels: { some: { number: { contains: compact } } } },
    ],
    items: [{ items: { some: { name: { contains: query } } } }],
    title: [{ title: { contains: query } }],
  };
  const scopes = parseScopes(params.get("in"));

  const results = await db.issue.findMany({
    where: {
      OR: scopes.flatMap((scope) => fields[scope]),
    },
    orderBy: { updatedAt: "desc" },
    take: 32,
    select: {
      id: true,
      key: true,
      orderNumber: true,
      title: true,
      type: true,
      status: true,
      level: true,
      customerName: true,
      updatedAt: true,
      assignee: { select: { name: true } },
    },
  });

  return NextResponse.json(
    {
      results: results
        .sort((a, b) => {
          const needle = orderQuery.toLowerCase();
          const queryLower = query.toLowerCase();
          const exact = (issue: typeof a) =>
            issue.orderNumber.toLowerCase() === needle || issue.key.toLowerCase() === queryLower ? 0 :
            issue.orderNumber.toLowerCase().startsWith(needle) || issue.key.toLowerCase().startsWith(queryLower) ? 1 : 2;
          const status = (value: string) =>
            value === "manual" ? 0 : value === "open" ? 1 : value === "waiting" ? 2 : 3;
          return exact(a) - exact(b) || status(a.status) - status(b.status) || +b.updatedAt - +a.updatedAt;
        })
        .slice(0, 8)
        .map(({ assignee, updatedAt: _updatedAt, ...issue }) => ({
          ...issue,
          assigneeName: assignee?.name ?? null,
        })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
