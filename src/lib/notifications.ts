import "server-only";

import { db } from "./db";
import { channelFor, notifyMatrix } from "./notify-prefs";
import { loadConfig, loadSettings } from "./config/server";
import { labelOf, meetsThreshold } from "./config/shared";
import type { TranslationKey } from "./i18n/dictionaries";
import { asLocale } from "./i18n/shared";
import { t } from "./i18n/server";
import { systemMailHtml } from "./mail-layout";
import { mailConfigured, sendSystemMail } from "./mailer";

// Kdo pošilja, določa mailer; tu nas zanima samo, ali sploh kdo lahko.
export { mailConfigured };

type NotificationInput = {
  /// parcel = pošiljka je prispela ali zahteva človeka; delivery = Shopify javlja
  /// neuspešno dostavo; deadline = rok čakanja je potekel in naročilo je spet v delu;
  /// satisfaction = AI je zaprtemu ticketu dal nizko oceno zadovoljstva (samo v zvoncu)
  /// reply = stranka je pisala na odprt ali zaprt ticket (samo v zvoncu)
  /// stock = v zalogo je prišel paket, ki pokrije menjavo ticketa
  kind: "handoff" | "outsider" | "parcel" | "stock" | "delivery" | "deadline" | "satisfaction" | "reply";
  recipientId: string;
  issueId: number;
  issueKey: string;
  orderNumber: string;
  actorName: string;
  preview?: string | null;
  /** Samo v aplikaciji: skupinska dodelitev bi sicer poslala mail za vsak ticket. */
  inAppOnly?: boolean;
  parcelReason?: string | null;
  parcelNumber?: string | null;
};

const appUrl = () => process.env.APP_URL || "http://localhost:3000";
const ticketUrl = (key: string) => `${appUrl()}/orders/${encodeURIComponent(key)}`;

export async function notify(input: NotificationInput) {
  const recipient = await db.user.findUnique({
    where: { id: input.recipientId },
    select: { active: true, email: true, notifyEmail: true, notifyOutsider: true, notifyKinds: true, notifyPriority: true, locale: true },
  });
  if (!recipient?.active) return;
  // Kaj dobi, nastavi admin ali uporabnik sam (lib/notify-prefs.ts).
  const channel = channelFor(notifyMatrix(recipient), input.kind);
  if (channel === "off") return;

  const locale = asLocale(recipient.locale);
  const preview =
    input.kind === "parcel" && input.parcelReason === "stale"
      ? t(locale, "notification.parcelStalePreview", {
          number: input.parcelNumber ?? "—",
          hours: (await loadSettings()).parcelStaleHours,
        })
      : input.kind === "delivery"
        ? t(locale, "notification.deliveryPreview", { tracking: input.parcelNumber ?? "—" })
        : input.kind === "deadline"
          ? t(locale, "notification.deadlinePreview")
          : input.preview;

  await db.notification.create({
    data: {
      userId: input.recipientId,
      issueId: input.issueId,
      kind: input.kind,
      actorName: input.actorName,
      preview: preview?.slice(0, 240) || null,
    },
  });

  if (input.inAppOnly || channel !== "mail" || !recipient.email || !mailConfigured()) return;

  // Prag velja samo za pošto: obvestilo v aplikaciji je že zapisano zgoraj in
  // ostane, kakršenkoli je prag. Prioriteto preberemo tu, da je klicnim mestom
  // ni treba nositi s sabo in je ni mogoče pozabiti.
  const issue = await db.issue.findUnique({ where: { id: input.issueId }, select: { priority: true } });
  const { priorities } = await loadConfig(locale);
  if (issue && !meetsThreshold(priorities, issue.priority, recipient.notifyPriority)) return;

  const subjectKey =
    input.kind === "handoff"
      ? "notification.handoffSubject"
      : input.kind === "parcel"
        ? "notification.parcelSubject"
      : input.kind === "stock"
        ? "notification.stockSubject"
        : input.kind === "delivery"
          ? "notification.deliverySubject"
          : input.kind === "deadline"
            ? "notification.deadlineSubject"
            : input.kind === "reply"
              ? "notification.replySubject"
              : input.kind === "satisfaction"
                ? "notification.satisfactionSubject"
                : "notification.outsiderSubject";
  const subject = t(locale, subjectKey, { order: input.orderNumber });
  const url = ticketUrl(input.issueKey);
  // Žig nosita samo prioriteti, ki terjata pogled; ostali dve bi bili šum.
  const badge =
    issue && (issue.priority === "urgent" || issue.priority === "high")
      ? { label: labelOf(priorities, issue.priority), tone: issue.priority as "urgent" | "high" }
      : null;

  // Pošta gre v ozadju: vnos ali predaja ne sme čakati na SMTP (pri več
  // prejemnikih je to sekunda in več). Obvestilo v zvoncu je že zapisano.
  void sendSystemMail({
    to: recipient.email,
    subject,
    text: [subject, input.actorName, preview || "", url].filter(Boolean).join("\n\n"),
    html: systemMailHtml({
      kicker: t(locale, `mail.kind.${input.kind}` as TranslationKey),
      headline: subject,
      meta: input.actorName,
      badge,
      quote: preview || null,
      cta: { label: t(locale, "mail.openTicket"), href: url },
      footer: t(locale, "mail.footer"),
    }),
  }).catch((error) => console.error("[Notify] Mail failed", error instanceof Error ? error.message : error));
}

export async function sendDailyDigests(): Promise<number> {
  if (!mailConfigured()) return 0;
  const users = await db.user.findMany({
    where: { active: true, notifyDigest: true, email: { not: null } },
    select: {
      email: true, locale: true,
      assigned: { where: { status: { not: "closed" } }, select: { key: true, orderNumber: true, status: true, waitingUntil: true } },
    },
  });
  let sent = 0;
  for (const user of users) {
    if (!user.email || user.assigned.length === 0) continue;
    const locale = asLocale(user.locale);
    const overdue = user.assigned.filter((issue) => issue.status === "waiting" && issue.waitingUntil && issue.waitingUntil < new Date());
    const subject = t(locale, "digest.subject");
    const lines = [
      t(locale, "digest.open", { count: user.assigned.length }),
      t(locale, "digest.overdue", { count: overdue.length }), "",
      ...user.assigned.map((issue) => `#${issue.orderNumber} — ${ticketUrl(issue.key)}`),
    ];
    const html = systemMailHtml({
      kicker: t(locale, "mail.kind.digest"),
      headline: subject,
      meta: `${t(locale, "digest.open", { count: user.assigned.length })} · ${t(locale, "digest.overdue", { count: overdue.length })}`,
      rows: user.assigned.map((issue) => ({
        label: `#${issue.orderNumber}`,
        value: t(locale, `status.${issue.status}` as TranslationKey),
        href: ticketUrl(issue.key),
      })),
      cta: { label: t(locale, "mail.openList"), href: `${appUrl()}/orders` },
      footer: t(locale, "mail.footer"),
    });
    if (await sendSystemMail({ to: user.email, subject, text: lines.join("\n"), html })) sent++;
  }
  return sent;
}
