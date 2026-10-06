import "server-only";

import { db } from "./db";
import { channelFor, notifyMatrix } from "./notify-prefs";
import { asLocale } from "./i18n/shared";
import { t } from "./i18n/server";

/**
 * Obvestilo o samodejno zaključeni odpremi (zvonček v Desku).
 *
 * Namenoma brez mailerja: to kliče urnik, ta pa se prek instrumentacije prevaja
 * tudi za edge okolje, kjer nodemailerjevih vozliščnih modulov ni — statični
 * uvoz bi podrl gradnjo. Zapis v Desku je tudi tisto, kar mora priti do človeka;
 * poštna kopija bi bila zgolj dodatek.
 */
export async function notifyOutboundFulfilled(input: {
  recipientId: string;
  orderNumber: string;
  tracking: string;
}) {
  const recipient = await db.user.findUnique({
    where: { id: input.recipientId },
    select: { active: true, locale: true, notifyKinds: true, notifyEmail: true, notifyOutsider: true },
  });
  if (!recipient?.active) return;
  if (channelFor(notifyMatrix(recipient), "outbound") === "off") return;

  const locale = asLocale(recipient.locale);
  await db.notification.create({
    data: {
      userId: input.recipientId,
      issueId: null,
      outboundOrderNumber: input.orderNumber,
      kind: "outbound",
      actorName: t(locale, "notification.system"),
      preview: t(locale, "notification.outboundPreview", { tracking: input.tracking }).slice(0, 240),
    },
  });
}
