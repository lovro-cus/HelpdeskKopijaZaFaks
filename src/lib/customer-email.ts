/**
 * Besedila, ki jih pišemo STRANKI (ne uporabniku aplikacije), zato ne živijo v
 * i18n slovarju: ta prevaja vmesnik za zaposlene, tukaj pa gre za pismo v
 * jeziku kupca.
 *
 * Jezike in njihova besedila ureja admin (Admin → Jeziki); tu se sestavi pismo
 * iz posnetka jezikov (language-registry.ts). Vgrajenih šest velja, dokler
 * baze ni.
 */

import {
  activeLanguages,
  DRAFT_KINDS,
  languageByCode,
  languageCodeOfCountry,
  type DraftKind,
  type LanguageTemplates,
} from "./language-registry";
import { ENGLISH_TEMPLATES } from "./language-seed";
import { capitalizeName } from "./letter-greeting";

export { DRAFT_KINDS, type DraftKind };

/** Koda jezika (de, it, nl …) iz šifranta jezikov. */
export type CustomerLanguage = string;

/** Jeziki, v katerih lahko pišemo, v vrstnem redu šifranta. */
export function customerLanguages(): CustomerLanguage[] {
  return activeLanguages().map((language) => language.code);
}

export function isCustomerLanguage(value: string | null | undefined): value is CustomerLanguage {
  return Boolean(value) && customerLanguages().includes(value!);
}

export function isDraftKind(value: string | null | undefined): value is DraftKind {
  return DRAFT_KINDS.includes((value ?? "") as DraftKind);
}

/** Država → predlagani jezik. Švica je večjezična; nemščina je najpogostejša,
 *  zato je predlog, ne sklep — pregledovalec ga v kartici zamenja z enim klikom. */
export function customerLanguage(countryCode: string | null | undefined): CustomerLanguage {
  return languageCodeOfCountry(countryCode) ?? (isCustomerLanguage("en") ? "en" : customerLanguages()[0] ?? "en");
}

type LanguageMessage = {
  direction?: string;
  subject?: string | null;
  body?: string | null;
  detectedLanguage?: string | null;
};

function languageCode(value: string | null | undefined): CustomerLanguage | null {
  const code = (value ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return isCustomerLanguage(code) ? code! : null;
}

/** Črke, ki jezik skoraj izdajo — dodatna teža k besedam, ne sklep. */
const LETTER_HINTS: [string, RegExp][] = [
  ["de", /[ßäöü]/u],
  ["sl", /[čšž]/u],
  ["es", /[ñ¿¡]/u],
  ["fr", /[œàâçèêëîïôùûÿ]/u],
];

function languageFromText(text: string): CustomerLanguage | null {
  const normalized = text.normalize("NFC").toLowerCase();
  const words = normalized.match(/\p{L}+/gu) ?? [];
  const languages = activeLanguages();
  const scores = new Map<CustomerLanguage, number>(languages.map((language) => [language.code, 0]));

  for (const language of languages) {
    const markers = new Set(language.markers.map((marker) => marker.toLowerCase()));
    for (const word of words) if (markers.has(word)) scores.set(language.code, (scores.get(language.code) ?? 0) + 1);
  }
  for (const [code, pattern] of LETTER_HINTS) {
    if (scores.has(code) && pattern.test(normalized)) scores.set(code, (scores.get(code) ?? 0) + 2);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked[0] || ranked[0][1] === 0 || ranked[0][1] === ranked[1]?.[1]) return null;
  return ranked[0][0];
}

/**
 * Jezik odgovora določi vsebina strankinega maila, ne država dostave. Gremo od
 * zadnjega prejetega sporočila nazaj, da kratek "OK" ne povozi jezika celotnega
 * pogovora. Država je samo rezervni signal, kadar besedilo ni dovolj povedno.
 */
export function customerLanguageForReply(
  messages: LanguageMessage[],
  fallbackCountryCode?: string | null,
): CustomerLanguage {
  const incoming = messages.filter((message) => message.direction === "incoming").reverse();
  for (const message of incoming) {
    const detected = languageCode(message.detectedLanguage);
    if (detected) return detected;
    const fromText = languageFromText(`${message.subject ?? ""}\n${message.body ?? ""}`);
    if (fromText) return fromText;
  }
  return customerLanguage(fallbackCountryCode);
}

export type ExchangeLine = { qty: number; name: string; variant: string | null };

const SENDER = "Ana";
const COMPANY = "Kroj";
const RETURN_ADDRESS = [
  "Kroj Info",
  "c/o Skladišče Kroj",
  "Testna ulica 1",
  "1000 Ljubljana",
];

/** Država na naslovu: domača oblika za nemško pismo, sicer mednarodna. */
function returnAddress(language: CustomerLanguage): string[] {
  return [...RETURN_ADDRESS, language === "de" ? "Slowenien" : language === "sl" ? "Slovenija" : "Slovenia"];
}

/** Besedila jezika; neznan jezik piše angleško. */
function templatesOf(language: CustomerLanguage): LanguageTemplates {
  return languageByCode(language)?.templates ?? languageByCode("en")?.templates ?? ENGLISH_TEMPLATES;
}

const fill = (text: string, token: string, value: string) => text.split(token).join(value);

/** Samo ime, brez priimka — pismo naj zveni kot pismo, ne kot izpis iz baze. */
function firstName(customerName: string | null | undefined): string | null {
  const trimmed = (customerName ?? "").trim();
  if (!trimmed) return null;
  const first = trimmed.split(/\s+/)[0];
  return first ? capitalizeName(first) : null;
}

/** Artikel zapišemo z imenom in varianto iz Shopifyja — točno tako, kot ju
 *  stranka vidi na svojem naročilu, v jeziku svojega trga. Prevod imena izdelka
 *  bi kupca samo zmedel. */
export function exchangeItemLine(line: ExchangeLine): string {
  const variant = (line.variant ?? "").trim();
  const label = variant ? `${line.name} – ${variant}` : line.name;
  return line.qty > 1 ? `${line.qty}× ${label}` : label;
}

export type DraftContent = { subject: string; body: string };

export type DraftInput = {
  kind: DraftKind;
  language: CustomerLanguage;
  customerName: string | null;
  orderNumber: string;
  lines: ExchangeLine[];
  /** Številke za sledenje odposlanega nadomestka (samo pri exchangeShipped). */
  trackings?: string[];
};

/**
 * Vrstica s številko za sledenje. Ni v urejanih predlogah jezika, ker je samo
 * oznaka pred številko — jezik, ki je tu ni, dobi angleško.
 */
const TRACKING_LABEL: Record<string, [one: string, many: string]> = {
  en: ["Tracking number:", "Tracking numbers:"],
  de: ["Sendungsnummer:", "Sendungsnummern:"],
  it: ["Numero di tracking:", "Numeri di tracking:"],
  fr: ["Numéro de suivi :", "Numéros de suivi :"],
  es: ["Número de seguimiento:", "Números de seguimiento:"],
  sl: ["Številka za sledenje:", "Številke za sledenje:"],
  nl: ["Trackingnummer:", "Trackingnummers:"],
};

export function trackingLine(language: CustomerLanguage, trackings: string[]): string | null {
  if (trackings.length === 0) return null;
  const [one, many] = TRACKING_LABEL[language] ?? TRACKING_LABEL.en!;
  return `${trackings.length > 1 ? many : one} ${trackings.join(", ")}`;
}

export const orderLabel = (orderNumber: string) =>
  orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;

/**
 * Sredina pisma — vse med nagovorom in podpisom. Pri skupinskem pismu je to
 * edini del, ki je vsem prejemnikom istega jezika skupen, zato gre v pregled
 * ločeno od ovoja, ki se sestavi vsakemu posebej.
 */
export function customerEmailMiddle(
  kind: DraftKind,
  language: CustomerLanguage,
  lines: ExchangeLine[] = [],
  trackings: string[] = [],
): string[] {
  const text = templatesOf(language).kinds[kind];
  const middle: string[] = [];
  if (text.lead) middle.push(text.lead, "");
  if (text.address) middle.push(...returnAddress(language), "");
  if (text.note) middle.push(text.note, "");
  if (text.options?.length) middle.push(...text.options.map((option) => `– ${option}`), "");
  else if (lines.length > 0) middle.push(...lines.map(exchangeItemLine), "");
  const tracking = kind === "exchangeShipped" ? trackingLine(language, trackings) : null;
  if (tracking) middle.push(tracking, "");
  if (text.close) middle.push(text.close, "");
  // Prazno ogrodje: nagovor, prostor za besedilo, podpis. Človek piše v sredino.
  if (middle.length === 0) middle.push("", "");
  return middle;
}

/** Zadeva pisma v jeziku stranke. */
export function customerEmailSubject(kind: DraftKind, language: CustomerLanguage, orderNumber: string): string {
  return fill(templatesOf(language).kinds[kind].subject, "{order}", orderLabel(orderNumber));
}

export function greetingFor(language: CustomerLanguage, customerName: string | null): string {
  const templates = templatesOf(language);
  const name = firstName(customerName);
  return name ? fill(templates.greeting, "{name}", name) : templates.greetingAnonymous;
}

/** Ovoj okoli pregledane sredine: nagovor s prvim imenom, besedilo, podpis. */
export function wrapCustomerLetter(
  language: CustomerLanguage,
  customerName: string | null,
  middle: string[],
): string {
  // Podpis stoji za prazno vrstico, tudi kadar sredino napiše človek in je ne
  // konča s presledkom — pismo z "Ana" prilepljeno na zadnji stavek ni pismo.
  const text = [...middle];
  while (text.length > 0 && text[text.length - 1]!.trim() === "") text.pop();
  text.push("");

  return [greetingFor(language, customerName), "", ...text, templatesOf(language).signOff, SENDER, COMPANY].join("\n");
}

/** Nagovor in podpis sta enaka pri vseh pismih; razlikuje se sredina. */
export function customerEmailDraft(input: DraftInput): DraftContent {
  return {
    subject: customerEmailSubject(input.kind, input.language, input.orderNumber),
    body: wrapCustomerLetter(
      input.language,
      input.customerName,
      customerEmailMiddle(input.kind, input.language, input.lines, input.trackings),
    ),
  };
}

/** Obvestilo o odpremi nadomestka — najpogostejše pismo, zato ima svoje ime. */
export function exchangeShippedDraft(input: Omit<DraftInput, "kind">): DraftContent {
  return customerEmailDraft({ ...input, kind: "exchangeShipped" });
}

/** Podpis, ki ga mora spoštovati tudi AI različica — pismo je vedno od iste osebe. */
export function signature(language: CustomerLanguage): string {
  return [templatesOf(language).signOff, SENDER, COMPANY].join("\n");
}

/** Angleško ime jezika za AI pozive ("Dutch"). */
export function languageName(language: CustomerLanguage): string {
  return languageByCode(language)?.englishName ?? "English";
}
