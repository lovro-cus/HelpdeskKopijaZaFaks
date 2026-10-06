const DECODERS = ["windows-1250", "windows-1252"] as const;

function reverseSingleByteEncoding(value: string, encoding: (typeof DECODERS)[number]): string | null {
  const decoder = new TextDecoder(encoding);
  const reverse = new Map<string, number>();
  for (let byte = 0; byte < 256; byte++) reverse.set(decoder.decode(Uint8Array.of(byte)), byte);

  const bytes: number[] = [];
  for (const character of value) {
    const byte = reverse.get(character);
    if (byte == null) return null;
    bytes.push(byte);
  }
  const repaired = Buffer.from(bytes).toString("utf8");
  return repaired.includes("�") ? null : repaired;
}

const corruptionScore = (value: string) =>
  (value.match(/[ÃÂâĂĹÄÅď]/g)?.length || 0) * 3 + (value.match(/�/g)?.length || 0) * 10;

/** Popravi UTF-8, ki ga je poštni odjemalec pred Gmailom pomotoma prebral kot Windows-1250/1252. */
export function repairEmailEncoding(value: string): string {
  let best = value;
  let bestScore = corruptionScore(value);
  if (bestScore === 0) return value.replace(/^\uFEFF/, "");

  for (const encoding of DECODERS) {
    const candidate = reverseSingleByteEncoding(value, encoding);
    if (!candidate) continue;
    const score = corruptionScore(candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best.replace(/^\uFEFF/, "");
}

// Odjemalec uvodno vrstico citata prelomi, kjer pač nanese — tudi sredi fraze
// ("… <podpora@kroj.example> ha\nscritto:"), zato so presledki v frazi \s+. Yahoo
// vrstico še zamakne in napiše "… hat Ana <…> Folgendes geschrieben:".
const REPLY_SEPARATORS = [
  /\n[ \t]*On [^\n]{0,500}?(?:\n[^\n]{0,300}?)?\bwrote:\s*\n/i,
  /\n[ \t]*Il giorno [\s\S]{0,500}?\bha\s+scritto:\s*\n/i,
  /\n[ \t]*Le [\s\S]{0,500}?\ba\s+écrit\s*:\s*\n/i,
  /\n[ \t]*Am [\s\S]{0,500}?\b(?:schrieb\s[\s\S]{0,200}?|geschrieben\s*):\s*\n/i,
  /\n[ \t]*El [\s\S]{0,500}?\bescribió:\s*\n/i,
  /\n-{2,}\s*(?:Original Message|Messaggio originale|Mensaje original|Message d'origine)\s*-{2,}\s*\n/i,
  /\n(?:From|Da|De|Von):\s*[^\n]+\n(?:Sent|Inviato|Envoyé|Gesendet):/i,
];

function trimTrailingQuoteBlock(value: string): string {
  const lines = value.split("\n");
  const firstQuoted = lines.findIndex((line) => /^\s*>/.test(line));
  if (firstQuoted < 0) return value;
  const remaining = lines.slice(firstQuoted).filter((line) => line.trim());
  return remaining.every((line) => /^\s*>/.test(line)) ? lines.slice(0, firstQuoted).join("\n") : value;
}

/** Obdrži samo nov del odgovora; prejšnja sporočila so že ločene postavke v kronološki niti. */
export function stripQuotedReply(value: string): string {
  const normalized = repairEmailEncoding(value).replace(/\r\n?/g, "\n");
  let cutAt = normalized.length;
  for (const pattern of REPLY_SEPARATORS) {
    const match = pattern.exec(normalized);
    if (match && match.index < cutAt) cutAt = match.index;
  }

  return trimTrailingQuoteBlock(normalized.slice(0, cutAt))
    // Samo \s: ta \u017ee zajame nedeljivi presledek. "(?:\s|\u00a0)*" je vsak tak
    // presledek ujel na dva na\u010dina in mail z vrsto &nbsp; je obesil stre\u017enik.
    .replace(/\s*(?:Inviato da iPhone|Sent from my iPhone|Sent from my iPad|Get Outlook for (?:iOS|Android))\s*$/i, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
