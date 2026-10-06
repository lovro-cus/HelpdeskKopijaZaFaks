export type InboxIssueCandidate = { id: number; orderNumber: string };

function mentionsOrder(text: string, orderNumber: string): boolean {
  const order = orderNumber.replace(/^#/, "").trim().toLowerCase();
  if (!order) return false;
  const escaped = order.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
  return new RegExp(`(?:^|[^a-z0-9])#?\\s*${escaped}(?=$|[^a-z0-9])`, "i").test(text);
}

/** Samodejna povezava je dovoljena samo pri enem nedvoumnem kandidatu. */
export function chooseInboxIssue<T extends InboxIssueCandidate>(issues: T[], threadText: string): T | null {
  const exact = issues.filter((issue) => mentionsOrder(threadText, issue.orderNumber));
  if (exact.length === 1) return exact[0];
  return issues.length === 1 ? issues[0] : null;
}

/** Številke naročil iz običajnih in Shopify contact-form zapisov. */
/** Zakaj Desk za mail ni odprl ticketa — prikaže se v pogledu »Brez ticketa«. */
export const UNLINKED_REASONS = ["no_order", "many_orders", "many_tickets", "order_not_found", "email_mismatch"] as const;
export type UnlinkedReason = (typeof UNLINKED_REASONS)[number];

/**
 * Razlog, kadar mail ni dobil ticketa že pred klicem Shopifyja: brez številke
 * naročila (ali z več številkami) Desk ne ugiba, h kateremu naročilu sodi.
 */
export function unlinkedReasonFor(orderNumbers: string[], ticketsByEmail: number): UnlinkedReason {
  if (orderNumbers.length > 1) return "many_orders";
  if (orderNumbers.length === 0 && ticketsByEmail > 1) return "many_tickets";
  return "no_order";
}

/** Ime iz glave "Ime Priimek <naslov>"; brez imena null. */
export function senderName(from: string): string | null {
  const match = from.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);
  const name = match?.[1]?.trim();
  return name && !name.includes("@") ? name.slice(0, 120) : null;
}

export function inboxOrderNumbers(text: string): string[] {
  const found = new Set<string>();
  // Številka naročila je vedno število. Za besedo »order«/»Bestellung« pogosto
  // stoji navadna beseda (»your order is…«, »die Bestellung ist…«) — ta ni
  // številka, sicer mail dobi lažno »več naročil« in ticket ne nastane.
  const labelled = /(?:order|bestell(?:ung|nummer|nr)?|bestel(?:ling|nummer)?|ordine|commande|pedido|naročil[oa]?)[\s:#.-]*(?:(?:number|nummer|numero|número|num|no|nr|n°|n)[\s:#.°-]*)?#?\s*([0-9]{3,10})(?![0-9])/gi;
  for (const match of text.matchAll(labelled)) found.add(match[1]!);
  // »numero d'ordine è 3305«, »número de pedido 3366«: oznaka pred besedo naročilo.
  const phrased = /(?:numero|número|nummer|number)\s+(?:d['’]\s*ordine|dell['’]\s*ordine|de\s+(?:pedido|commande))\s*(?:è|e|es|:|-)?\s*#?\s*([0-9]{3,10})(?![0-9])/gi;
  for (const match of text.matchAll(phrased)) found.add(match[1]!);
  // Shopifyjeve zadeve pogosto nosijo samo lojtro in številko.
  // Tudi v oblikovanem besedilu (»*#3610*«, »(#3610)«).
  for (const match of text.matchAll(/(?:^|[\s*_(\[])#([0-9]{3,20})(?=$|[\s),.:;!?*_\]-])/g)) found.add(match[1]!);
  return [...found];
}

/**
 * Telefon in ime iz polj Shopifyjevega kontaktnega obrazca (»Phone Number:«,
 * »Numero Di Telefono:«, »Nome:« …). Vrednost je lahko v isti ali naslednji
 * vrstici. Iz prostega besedila ne ugibamo.
 */
export function contactDetails(text: string): { phones: string[]; names: string[] } {
  const phones = new Set<string>();
  const names = new Set<string>();
  const phoneLabel = /(?:phone(?:\s+number)?|numero\s+di\s+telefono|telefono|telefonnummer|telefon|t[ée]l[ée]phone|tel\.?)\s*:[ \t]*\n?[ \t]*(\+?[0-9][0-9 ()\/.-]{5,22}[0-9])/gi;
  for (const match of text.matchAll(phoneLabel)) {
    if (phoneKey(match[1]!)) phones.add(match[1]!.trim());
  }
  const nameLabel = /(?:^|\n)[ \t]*(?:name|nome|nom|vorname und nachname|nombre)[ \t]*:[ \t]*\n?[ \t]*([^\n@:]{3,80})/gi;
  for (const match of text.matchAll(nameLabel)) {
    const name = match[1]!.trim();
    if (nameKey(name).includes(" ")) names.add(name);
  }
  return { phones: [...phones], names: [...names] };
}

/** Zadnjih 9 števk — primerja »3750000001« in »+39 375 000 0001«. */
export function phoneKey(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-9) : null;
}

/** Ime brez velikih črk, naglasov in vrstnega reda besed (»Rossi Mario« = »Mario Rossi«). */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .sort()
    .join(" ");
}

export type ContactIdentity = { emails: string[]; phones: string[]; names: string[] };

/** Javni ponudniki pošte: ista domena tu ne pove, da gre za isto osebo. */
const PUBLIC_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.de", "hotmail.it", "hotmail.fr", "outlook.com", "outlook.de", "outlook.it",
  "live.com", "live.de", "live.it", "live.fr", "msn.com", "yahoo.com", "yahoo.de", "yahoo.it", "yahoo.fr", "yahoo.es", "ymail.com",
  "icloud.com", "me.com", "mac.com", "aol.com", "aol.de", "gmx.de", "gmx.at", "gmx.ch", "gmx.net", "gmx.com", "web.de", "t-online.de",
  "freenet.de", "posteo.de", "mail.de", "bluewin.ch", "libero.it", "virgilio.it", "tiscali.it", "alice.it", "tim.it", "email.it",
  "orange.fr", "free.fr", "sfr.fr", "laposte.net", "wanadoo.fr", "proton.me", "protonmail.com", "mail.com", "a1.net", "chello.at",
  "siol.net", "telemach.net", "amis.net", "seznam.cz", "wp.pl", "o2.pl", "interia.pl", "onet.pl", "telenet.be", "skynet.be", "ziggo.nl",
  "kpnmail.nl", "planet.nl", "xs4all.nl", "hetnet.nl", "home.nl",
]);

const domainOf = (email: string) => email.trim().toLowerCase().split("@")[1] ?? "";

/**
 * Ali naročilo pripada pošiljatelju: isti e-naslov, ista lastna domena
 * (podjetje: thomas@firma.ch in thomas.muster@firma.ch), isti telefon ali
 * isto polno ime. Ime samo velja, ker ga preverjamo le pri naročilu, ki ga je
 * našla številka iz maila ali edini zadetek iskanja.
 */
export function orderMatchesContact(
  order: { emails: (string | null)[]; phones: (string | null)[]; names: (string | null)[] },
  contact: ContactIdentity,
): boolean {
  const emails = new Set(contact.emails.map((email) => email.trim().toLowerCase()));
  if (order.emails.some((email) => email && emails.has(email.trim().toLowerCase()))) return true;
  const domains = new Set([...emails].map(domainOf).filter((domain) => domain.includes(".") && !PUBLIC_MAIL_DOMAINS.has(domain)));
  if (order.emails.some((email) => email && domains.has(domainOf(email)))) return true;
  const phones = new Set(contact.phones.flatMap((phone) => phoneKey(phone) ?? []));
  if (order.phones.some((phone) => { const key = phone && phoneKey(phone); return Boolean(key && phones.has(key)); })) return true;
  const names = new Set(contact.names.map(nameKey).filter((key) => key.includes(" ")));
  return order.names.some((name) => { const key = name && nameKey(name); return Boolean(key && names.has(key)); });
}
