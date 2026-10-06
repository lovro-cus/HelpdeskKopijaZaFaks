import { deepRefreshShipGermanShipments, refreshShipGermanShipments } from "@/lib/actions/shipgerman-sync";
import { ShipGermanRefreshButton } from "./ShipGermanRefreshButton";
import { ShipgShippedRow, type ShippedRow } from "./ShipgShippedRow";
import { ShipgDeepRefreshButton } from "./ShipgDeepRefreshButton";
import { EmptyState } from "./ui";
import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/shared";


const rightAlign = { textAlign: "right" as const };

/** Toliko stolpcev ima tabela — razprta vrstica se mora raztegniti čez vse. */
const COLUMNS = 9;

/** Odposlane pošiljke iz ShipGermana (/user/shipments, status Shipped). Vsaka
 *  pošiljka je vrstica; sistemske so navezane na naročilo, pošiljke izpred
 *  sistema pa označene: "pred sistemom" (nastale, ko Deska še ni bilo) ali
 *  "zunaj sistema" (odpremljene mimo njega). */
export type { ShippedRow };

export function ShipgShippedTable({ rows, locale, query }: { rows: ShippedRow[]; locale: Locale; query?: string }) {
  const dash = <span className="text-label-3">—</span>;
  return (
    <div className="shipgerman-register mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5">
        <p className="text-[11.5px] text-label-2">{t(locale, "shipg.shipped.caption")}</p>
        <div className="flex items-center gap-2">
          <form action={refreshShipGermanShipments}><ShipGermanRefreshButton /></form>
          <form action={deepRefreshShipGermanShipments}><ShipgDeepRefreshButton /></form>
        </div>
      </div>
      {rows.length === 0 ? (
        // Prazno iskanje ni isto kot prazen seznam — povej, kaj se ni našlo.
        query
          ? <EmptyState title={t(locale, "shipg.shipped.noResults", { query })} hint={t(locale, "shipg.shipped.noResultsHint")} />
          : <EmptyState title={t(locale, "shipg.empty.shipped")} />
      ) : (
      <div className="overflow-x-auto">
        <table className="shipgerman-table">
          <thead><tr>
            <th>{t(locale, "shipg.shipped.parcel")}</th>
            <th>{t(locale, "shipg.shipped.contents")}</th>
            <th>{t(locale, "shipg.shipped.source")}</th>
            <th>{t(locale, "shipg.shipped.exchange")}</th>
            <th>{t(locale, "shipg.shipped.by")}</th>
            <th>{t(locale, "shipg.shipped.status")}</th>
            <th>{t(locale, "shipg.shipped.tracking")}</th>
            <th style={rightAlign}>{t(locale, "shipg.shipped.price")}</th>
            <th style={rightAlign}>{t(locale, "shipg.shipped.receipt")}</th>
          </tr></thead>
          <tbody>
            {rows.map((row) => (
              <ShipgShippedRow key={row.id} row={row} columns={COLUMNS} />
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
