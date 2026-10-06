import { stripQuotedReply } from "./email-text";

export type GmailBodyCandidate = {
  mimeType: string;
  filename?: string;
  disposition?: string;
  content: string;
};

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß",
  agrave: "à", egrave: "è", igrave: "ì", ograve: "ò", ugrave: "ù",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  acirc: "â", ecirc: "ê", icirc: "î", ocirc: "ô", ucirc: "û",
  ccedil: "ç", ntilde: "ñ", euro: "€", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z][a-z0-9]+);/gi, (entity, name: string) => NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()] ?? entity);
}

export function htmlEmailToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(style|script|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\b[^>]*\/?\s*>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n• ")
      .replace(/<\/(p|div|li|tr|h[1-6]|blockquote|section|article)>\s*/gi, "\n")
      .replace(/<\/(td|th)>\s*/gi, " ")
      .replace(/<hr\b[^>]*\/?\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\n[ \t]+/g, "\n");
}

export function cleanEmailBody(value: string): string {
  return stripQuotedReply(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 100_000);
}

function best(values: string[]): string {
  return values.sort((left, right) => right.length - left.length)[0] || "";
}

/**
 * Gmailov multipart/alternative včasih vsebuje prazen ali okrnjen text/plain
 * pred popolnim HTML-delom. Priponke tipa text/plain niso telo sporočila.
 */
export function chooseEmailBody(candidates: GmailBodyCandidate[], snippet: string): string {
  const usable = candidates.filter((candidate) =>
    !candidate.filename?.trim() && !/\battachment\b/i.test(candidate.disposition || ""),
  );
  const plain = best(usable
    .filter((candidate) => candidate.mimeType.toLowerCase() === "text/plain")
    .map((candidate) => cleanEmailBody(candidate.content))
    .filter(Boolean));
  const html = best(usable
    .filter((candidate) => candidate.mimeType.toLowerCase() === "text/html")
    .map((candidate) => cleanEmailBody(htmlEmailToText(candidate.content)))
    .filter(Boolean));

  // Navadno besedilo je čistejše, vendar ga nekateri pošiljatelji izpolnijo le
  // z eno vrstico ali povezavo. Takrat je občutno bogatejši HTML pravi vir.
  if (plain && (!html || plain.length >= 80 || plain.length >= html.length * 0.4)) return plain;
  return html || plain || cleanEmailBody(snippet);
}

function charsetOf(contentType: string): string {
  const match = /charset\s*=\s*["']?([^;\s"']+)/i.exec(contentType);
  return match?.[1]?.trim() || "utf-8";
}

/** Gmail body.data je base64url; bajte nato dekodiramo s charsetom MIME dela. */
export function decodeGmailPart(data: string, contentType: string): string {
  const bytes = Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  try {
    return new TextDecoder(charsetOf(contentType)).decode(bytes);
  } catch {
    return bytes.toString("utf8");
  }
}

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Ali besedilo omenja številko naročila kot samostojno številko (1708, ne 17080). */
export function mentionsOrderNumber(text: string, orderNumber: string): boolean {
  const order = orderNumber.replace(/^#/, "").trim();
  if (!/^\d{3,}$/.test(order)) return false;
  return new RegExp(`(?:^|\\D)${order}(?:\\D|$)`).test(text);
}

/**
 * Stranka včasih piše z drugega naslova (službeni, bančni …). Tak naslov je
 * njen, kadar se ujema lokalni del ("heidi.muster@…") ali pa prikazno ime
 * vsebuje njeno ime in priimek. Kratki in splošni lokalni deli ("info", "mail")
 * ne štejejo — preveč naslovov jih deli.
 */
export function isCustomerAlias(
  participants: string,
  customerEmail: string,
  customerName: string | null,
  ownAccount: string,
): boolean {
  const own = ownAccount.toLowerCase();
  const ownDomain = own.split("@")[1] ?? "";
  const local = customerEmail.toLowerCase().split("@")[0] ?? "";
  const nameTokens = fold(customerName ?? "").split(/[^a-z]+/).filter((token) => token.length >= 2);
  const generic = /^(?:info|mail|office|kontakt|contact|admin|service|support|hello|noreply|no-reply)$/;

  return participants.split(/[,\n]/).some((segment) => {
    const address = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(segment)?.[0]?.toLowerCase();
    if (!address || address === own || address.endsWith(`@${ownDomain}`)) return false;
    const [addressLocal] = address.split("@");
    if (local.length >= 5 && !generic.test(local) && addressLocal === local) return true;
    if (nameTokens.length < 2) return false;
    const display = fold(segment.split("<")[0] ?? "");
    const words = new Set(display.split(/[^a-z]+/).filter(Boolean));
    return nameTokens.every((token) => words.has(token));
  });
}
