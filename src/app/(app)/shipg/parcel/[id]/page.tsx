import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessShipg } from "@/lib/domain";

export const dynamic = "force-dynamic";

/**
 * Razreši, kje paket trenutno je, in tja preusmeri. Ločena pot obstaja zato,
 * ker se odgovor s časom spremeni: paket, ki je bil ob izrisu niti še v zalogi,
 * je ob kliku lahko že odposlan. Preverjanje ob kliku zato pelje na pravo mesto,
 * ne v prazno zalogo.
 */
export default async function ShipgParcelRedirect({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  if (!canAccessShipg(me)) redirect("/orders");

  const { id } = await params;
  const parcelId = decodeURIComponent(id).trim().slice(0, 100);
  if (!parcelId) redirect("/shipg?view=stock");

  // Odposlano ima prednost: ko paket zapusti skladišče, ga v zalogi ni več.
  // Obakrat preusmerimo z iskanjem, da je oba pogleda mogoče počistiti z ✕ in
  // da je vidno, zakaj je seznam filtriran.
  const shipped = await db.shipGermanCachedShipment.findFirst({
    where: { parcelId, status: { in: ["Shipped", "ReadyForProcessing"] } },
    select: { id: true },
  });
  if (shipped) redirect(`/shipg?view=shipped&q=${encodeURIComponent(parcelId)}`);

  redirect(`/shipg?view=stock&q=${encodeURIComponent(parcelId)}`);
}
