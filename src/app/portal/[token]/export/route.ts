import { NextResponse } from "next/server";

import { supplierExportResponse } from "@/lib/supplier-export";
import { validPortalToken } from "@/lib/supplier-orders";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await validPortalToken(token))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return supplierExportResponse(new URL(request.url).searchParams.get("scope"));
}
