import type { ShipgReturnView } from "@/components/ShipgReturnRow";

/** Masovno potrdimo le čiste zapise: paket čaka pregled, postavke so znane in
 *  nič ne kaže na združitev, podvojitev ali že odposlan paket. */
export function isBulkEligible(record: ShipgReturnView) {
  return (record.status === "check" || record.status === "expected")
    && record.items.length > 0
    && record.reconcile.length === 0
    && !record.alreadyShipped
    && !record.duplicate;
}
