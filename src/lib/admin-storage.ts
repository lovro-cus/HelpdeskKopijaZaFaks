import "server-only";

import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { db } from "./db";
import { UPLOAD_DIR } from "./uploads";

export type StorageSummary = {
  count: number;
  totalBytes: number;
  /** Datoteke na disku, ki jim v bazi ne pripada noben zapis. */
  orphanCount: number;
  orphanBytes: number;
  /** Zapisi v bazi, ki jim na disku ni datoteke. */
  missingCount: number;
  /** Ali je mapo sploh bilo mogoče prebrati (na svežem sistemu še ne obstaja). */
  readable: boolean;
  largest: { id: number; filename: string; size: number; issueKey: string; orderNumber: string }[];
};

/**
 * Pregled porabe prostora s prilogami.
 *
 * Priloge ležijo na trajnem volumnu zunaj `public/`, zato jih ni videti nikjer v
 * vmesniku. Ko se volumen napolni, nalaganje odpove — ta pregled to ujame prej.
 * Osirotele datoteke nastanejo, kadar se zapis izbriše, datoteka pa ne.
 */
export async function collectStorage(): Promise<StorageSummary> {
  const [aggregate, largest, stored] = await Promise.all([
    db.attachment.aggregate({ _count: { _all: true }, _sum: { size: true } }),
    db.attachment.findMany({
      orderBy: { size: "desc" },
      take: 10,
      select: { id: true, filename: true, size: true, issue: { select: { key: true, orderNumber: true } } },
    }),
    db.attachment.findMany({ select: { storedName: true } }),
  ]);

  const known = new Set(stored.map((row) => row.storedName));
  let files: string[] = [];
  let readable = true;
  try {
    files = await readdir(UPLOAD_DIR);
  } catch {
    readable = false;
  }

  let orphanCount = 0;
  let orphanBytes = 0;
  const onDisk = new Set(files);
  for (const name of files) {
    if (known.has(name)) continue;
    orphanCount += 1;
    try {
      orphanBytes += (await stat(path.join(UPLOAD_DIR, name))).size;
    } catch {
      // Datoteka je izginila med branjem — pri štetju je ne upoštevamo.
    }
  }

  return {
    count: aggregate._count._all,
    totalBytes: aggregate._sum.size ?? 0,
    orphanCount,
    orphanBytes,
    missingCount: readable ? stored.filter((row) => !onDisk.has(row.storedName)).length : 0,
    readable,
    largest: largest.map((row) => ({
      id: row.id,
      filename: row.filename,
      size: row.size,
      issueKey: row.issue.key,
      orderNumber: row.issue.orderNumber,
    })),
  };
}
