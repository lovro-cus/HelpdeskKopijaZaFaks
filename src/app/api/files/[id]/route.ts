import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { ReadableOptions } from "node:stream";

import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { makeThumb, thumbPathOf, UPLOAD_DIR } from "@/lib/uploads";

export const dynamic = "force-dynamic";

function toWebStream(nodePath: string, opts?: ReadableOptions) {
  const nodeStream = createReadStream(nodePath, opts);
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

/** Priloge so dostopne samo prijavljenim — mapa uploads/ ni javna. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Neavtoriziran dostop", { status: 401 });

  const { id } = await ctx.params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return new Response("Neveljaven zahtevek", { status: 400 });
  }

  const att = await db.attachment.findUnique({ where: { id: numeric } });
  if (!att) return new Response("Ni najdeno", { status: 404 });

  // storedName je vedno UUID + končnica, a pot vseeno preverimo.
  const safeName = path.basename(att.storedName);
  let filePath = path.join(UPLOAD_DIR, safeName);
  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return new Response("Ni najdeno", { status: 404 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new Response("Ni najdeno", { status: 404 });
  } catch {
    return new Response("Ni najdeno", { status: 404 });
  }

  // Sličica za nit (?thumb=1). Priloge, naložene pred sličicami, jo dobijo ob
  // prvem pogledu — brez ponovnega prenosa čez vso staro zalogo.
  let mime = att.mime;
  let size = att.size;
  if (new URL(_req.url).searchParams.get("thumb") === "1" && att.mime.startsWith("image/")) {
    const thumb = thumbPathOf(safeName);
    let ready = await stat(thumb).then((info) => info.isFile()).catch(() => false);
    if (!ready) ready = await makeThumb(safeName, att.mime);
    const info = ready ? await stat(thumb).catch(() => null) : null;
    if (info?.isFile()) {
      filePath = thumb;
      mime = "image/webp";
      size = info.size;
    }
  }

  const inline = att.mime.startsWith("image/");
  const asciiName = att.filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");

  return new Response(toWebStream(filePath), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(att.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
