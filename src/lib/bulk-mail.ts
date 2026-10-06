import {
  customerLanguage,
  customerLanguages,
  orderLabel,
  type CustomerLanguage,
} from "./customer-email";

/**
 * Eno pismo, poslano celemu kupu naročil — vsakemu v njegovem jeziku.
 *
 * Pregled ostane, kar je bil: pismo gre skozi človeka, preden odide. Le da se
 * pri kupu pregleda enkrat na jezik in ne enkrat na naročilo — nagovor,
 * številka naročila in podpis se sestavijo vsakemu posebej, sredina je skupna.
 */

/** Vrste pisem, ki jih je smiselno pisati kupu: tiste, katerih besedilo ne visi
 *  na artiklih posameznega naročila. Obvestilo o odpremi in vprašanje o
 *  velikosti naštevata artikle, zato ostaneta pismi enega naročila. */
export const BULK_MAIL_KINDS = ["custom", "refundOrExchange"] as const;
export type BulkMailKind = (typeof BULK_MAIL_KINDS)[number];

/** Koliko pisem gre lahko v eni potezi. Meja ni tehnična, ampak človeška:
 *  toliko naslovnikov še preletiš, preden potrdiš. */
export const BULK_MAIL_LIMIT = 60;

export function isBulkMailKind(value: string | null | undefined): value is BulkMailKind {
  return BULK_MAIL_KINDS.includes((value ?? "") as BulkMailKind);
}

export type MailCandidate = {
  id: number;
  key: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  customerCountryCode: string | null;
};

export type MailRecipient = MailCandidate & {
  customerEmail: string;
  language: CustomerLanguage;
};

export type MailGroup = { language: CustomerLanguage; recipients: MailRecipient[] };

export type MailPlan = {
  groups: MailGroup[];
  /** Naročila brez e-naslova — pisma ni komu poslati. */
  noEmail: MailCandidate[];
  /** Naslovi, ki bi dobili več kot eno pismo (stranka z dvema naročiloma). */
  repeatedAddresses: number;
};

/**
 * Kdo dobi pismo in v katerem jeziku. Jezik je predlog iz države naročila —
 * isti predlog kot pri pismu enega naročila, da se kup in posamični primer ne
 * razideta.
 */
export function planBulkMail(candidates: MailCandidate[]): MailPlan {
  const noEmail: MailCandidate[] = [];
  const byLanguage = new Map<CustomerLanguage, MailRecipient[]>();
  const seen = new Map<string, number>();

  for (const candidate of candidates) {
    const email = (candidate.customerEmail ?? "").trim();
    if (!email) {
      noEmail.push(candidate);
      continue;
    }
    const language = customerLanguage(candidate.customerCountryCode);
    const group = byLanguage.get(language) ?? [];
    group.push({ ...candidate, customerEmail: email, language });
    byLanguage.set(language, group);
    seen.set(email.toLowerCase(), (seen.get(email.toLowerCase()) ?? 0) + 1);
  }

  // Vrstni red jezikov je vrstni red šifranta, ne vrstni red naročil: seznam v
  // pregledu mora biti med dvema kupoma enak.
  const groups = customerLanguages().map((language) => ({
    language,
    recipients: byLanguage.get(language) ?? [],
  })).filter((group) => group.recipients.length > 0);

  let repeatedAddresses = 0;
  for (const count of seen.values()) if (count > 1) repeatedAddresses += 1;

  return { groups, noEmail, repeatedAddresses };
}

/** Oznaka, ki jo človek vpiše v besedilo, mi pa jo zamenjamo vsakemu posebej. */
export const ORDER_TOKEN = "{order}";

/**
 * Vstavi številko naročila na mesta, kjer jo je pisec označil.
 *
 * Predloga zadeve nosi lojtro že pred oznako, človek pa jo pogosto napiše sam;
 * ker jo prinese tudi številka, bi sicer ostala dvojna.
 */
export function fillOrderToken(text: string, orderNumber: string): string {
  return text
    .split(`#${ORDER_TOKEN}`)
    .join(ORDER_TOKEN)
    .split(ORDER_TOKEN)
    .join(orderLabel(orderNumber));
}
