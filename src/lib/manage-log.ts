import "server-only";

import { db } from "./db";
import type { Permission } from "./permissions";

/**
 * Zapis spremembe na strani »Urejanje«. Ko ureja več ljudi, mora biti mogoče
 * ugotoviti, kdo je hlače prestavil v napačno skupino. Zapis ne sme ustaviti
 * spremembe, ki je že narejena — napaka gre samo v dnevnik strežnika.
 */
export async function logManage(area: Permission, action: string, detail: string, authorId: string): Promise<void> {
  await db.manageLog
    .create({ data: { area, action, detail: detail.slice(0, 200), authorId } })
    .catch((error) => console.error("[Urejanje] zapis spremembe ni uspel", error));
}
