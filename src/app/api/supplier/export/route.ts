import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { canAccessShipg } from "@/lib/domain";
import { supplierExportResponse } from "@/lib/supplier-export";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canAccessShipg(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return supplierExportResponse(new URL(request.url).searchParams.get("scope"));
}
