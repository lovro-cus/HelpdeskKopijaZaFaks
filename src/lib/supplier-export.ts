import "server-only";

import { buildSupplierWorkbook, loadSupplierOrders, markExported, PENDING_STATUSES, supplierOrdersCoveredByStock } from "./supplier-orders";

/**
 * Odgovor z Excelom za dobavitelja. "new" = samo še neizvožene zahteve (kar je
 * treba naročiti na novo), "pending" = vse, ki še čakajo na tracking.
 */
export async function supplierExportResponse(scope: string | null): Promise<Response> {
  // Zahteve, ki jih lahko pokrijemo iz ShipG zaloge, dobavitelj ne dobi.
  // Že prenesene ostanejo — tiste ima že v rokah, preklic je dogovor z njim.
  const covered = await supplierOrdersCoveredByStock();
  const orders = (await loadSupplierOrders(scope === "pending" ? PENDING_STATUSES : ["open"]))
    .filter((order) => !(order.status === "open" && covered.has(order.id)));
  const file = await buildSupplierWorkbook(orders);
  await markExported(orders.map((order) => order.id));
  const day = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kroj-supplier-${day}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
