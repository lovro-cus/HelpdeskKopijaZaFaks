import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "./db";
import { ALLOWED_UPLOADS, MAX_UPLOADS_PER_EVENT, MAX_UPLOAD_BYTES } from "./domain";
import { translate } from "./i18n/dictionaries";
import type { Locale } from "./i18n/shared";

/**
 * Priloge NISO v public/ — do njih se pride samo skozi /api/files/[id],
 * ki najprej preveri sejo.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "uploads");

/** Ime za prikaz — brez poti, brez krmilnih znakov. */
function safeDisplayName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "priloga";
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\x00-\x1f<>:"|?*]/g, "").slice(0, 120) || "priloga";
}

export function uploadProblem(file: File, locale: Locale = "en"): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return translate(locale, "upload.tooLarge", { name: file.name });
  const exts = ALLOWED_UPLOADS[file.type];
  if (!exts) return translate(locale, "upload.type", { type: file.type || translate(locale, "upload.unknown") });
  const ext = path.extname(file.name).toLowerCase();
  if (!exts.includes(ext)) return translate(locale, "upload.extension", { extension: ext });
  return null;
}

/** Shrani priloge in vrne morebitne napake (brez metanja izjem). */
export async function saveAttachments(
  files: File[],
  issueId: number,
  eventId: number | null,
  locale: Locale = "en",
): Promise<string[]> {
  const usable = files.filter((f) => f instanceof File && f.size > 0).slice(0, MAX_UPLOADS_PER_EVENT);
  if (usable.length === 0) return [];

  const errors: string[] = [];
  await mkdir(UPLOAD_DIR, { recursive: true });

  for (const file of usable) {
    const problem = uploadProblem(file, locale);
    if (problem) {
      errors.push(problem);
      continue;
    }
    const ext = path.extname(file.name).toLowerCase();
    const storedName = `${randomUUID()}${ext}`;
    const target = path.join(UPLOAD_DIR, storedName);
    // Naključno ime + join z UPLOAD_DIR: pot ne more uiti iz mape.
    await writeFile(target, Buffer.from(await file.arrayBuffer()));
    // Sličica ni pogoj za shranjevanje: priloga obstaja tudi brez nje.
    await makeThumb(storedName, file.type);
    await db.attachment.create({
      data: {
        issueId,
        eventId,
        filename: safeDisplayName(file.name),
        storedName,
        mime: file.type,
        size: file.size,
      },
    });
  }

  return errors;
}

/**
 * Odstrani datoteke prilog, potem ko so njihovi zapisi že izbrisani iz baze.
 * Manjkajoča datoteka šteje kot že odstranjena; druge napake vrnemo klicatelju
 * za beleženje, ne da bi zaradi njih oživljali že izbrisano naročilo.
 */
export async function deleteStoredAttachments(storedNames: string[]): Promise<string[]> {
  const failed: string[] = [];

  for (const storedName of new Set(storedNames)) {
    const safeName = path.basename(storedName);
    const target = path.join(UPLOAD_DIR, safeName);
    if (safeName !== storedName || !target.startsWith(UPLOAD_DIR + path.sep)) {
      failed.push(storedName);
      continue;
    }

    try {
      await unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") failed.push(storedName);
    }
    // Sličica je izpeljanka izvirnika; brez njega nima kaj stati naprej.
    await unlink(thumbPathOf(safeName)).catch(() => {});
  }

  return failed;
}

/* --- sličice ---------------------------------------------------------------
 *
 * V niti se priloga prikaže kot kvadratek 84×84. Brez sličice brskalnik za
 * tisti kvadratek potegne izvirnik — telefonska fotografija torej tri megabajte
 * za 84 pik. Zato ob izvirniku živi pomanjšana različica; izvirnik ostane
 * nedotaknjen in se prenese šele, ko kdo sliko odpre.
 */

/** Največja stranica sličice; 320 pokrije tudi zaslone z dvojno gostoto. */
const THUMB_EDGE = 320;

export const thumbPathOf = (storedName: string) => path.join(UPLOAD_DIR, `${storedName}.thumb.webp`);

/**
 * Ustvari sličico ob izvirniku. Ni bistvena: če spodleti (pokvarjena slika,
 * nepodprt zapis), se v niti pokaže izvirnik, kakor doslej.
 */
export async function makeThumb(storedName: string, mime: string): Promise<boolean> {
  if (!mime.startsWith("image/")) return false;
  try {
    const { default: sharp } = await import("sharp");
    await sharp(path.join(UPLOAD_DIR, storedName), { failOn: "none" })
      .rotate() // upošteva EXIT zasuk telefonskih fotografij
      .resize(THUMB_EDGE, THUMB_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(thumbPathOf(storedName));
    return true;
  } catch (error) {
    console.error("Sličice ni bilo mogoče ustvariti", error);
    return false;
  }
}
