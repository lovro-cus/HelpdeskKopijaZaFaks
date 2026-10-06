import { MAIL_LOGO_CID, MAIL_LOGO_HEIGHT, MAIL_LOGO_WIDTH } from "./mail-logo";

/**
 * Ovoj sistemskih pisem — isti delovni list kot v aplikaciji, samo poslan.
 *
 * Pismo ne more brati DESIGN.md: v pošti ni spremenljivk, ni pisav z omrežja in
 * ni sloga v <head>, ki bi ga vsi odjemalci upoštevali. Zato so tu vrednosti
 * prepisane kot dobesedne barve in vsak slog visi na svojem elementu, postavitev
 * pa stoji na tabelah, ker jih zna tudi Outlook. Kadar se v DESIGN.md kaj
 * spremeni, je treba popraviti tudi ta prepis.
 */
const INK = "#1a1917";
const INK_2 = "#5c5a55";
const INK_3 = "#6f6d67";
const DESK = "#e3e2de";
const SHEET = "#fbfbf9";
const RULE = "rgba(26, 25, 23, 0.13)";
const WASH = "rgba(26, 25, 23, 0.055)";
const PETROL = "#1f6674";
const STAMP = "#a8271c";
const WARNING = "#9a6500";

const SANS = "'IBM Plex Sans','Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'IBM Plex Mono',SFMono-Regular,Consolas,'Liberation Mono',monospace";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** Prelome vrstic ohranimo, sicer se vnos v pismu zlije v eno kepo. */
function paragraph(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

export type MailRow = { label: string; value: string; href?: string | null };

export type MailContent = {
  /** Drobna oznaka nad naslovom — vrsta obvestila. */
  kicker: string;
  headline: string;
  /** Kdo je dejanje sprožil; stoji pod naslovom. */
  meta?: string | null;
  /** Prioriteta kot žig, samo kadar je vredna pogleda. */
  badge?: { label: string; tone: "urgent" | "high" } | null;
  /** Dobesedni vnos človeka — v pismu je citat, ne trditev pisma samega. */
  quote?: string | null;
  rows?: MailRow[];
  cta?: { label: string; href: string } | null;
  footer: string;
};

function badgeCell(badge: NonNullable<MailContent["badge"]>): string {
  const color = badge.tone === "urgent" ? STAMP : WARNING;
  return `<td align="right" style="font-family:${MONO};font-size:10px;font-weight:600;letter-spacing:0.09em;text-transform:uppercase;color:${color};white-space:nowrap;">${escapeHtml(badge.label)}</td>`;
}

function rowsTable(rows: MailRow[]): string {
  // Klikljiva je številka naročila, ne stanje: v aplikaciji se odpira prav ta.
  const cells = rows
    .map((row) => {
      const label = row.href
        ? `<a href="${escapeHtml(row.href)}" style="color:${PETROL};text-decoration:none;">${escapeHtml(row.label)}</a>`
        : escapeHtml(row.label);
      return `<tr>
              <td style="padding:9px 0;border-bottom:1px solid ${RULE};font-family:${MONO};font-size:13px;font-weight:600;color:${INK};white-space:nowrap;">${label}</td>
              <td align="right" style="padding:9px 0 9px 12px;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:12.5px;color:${INK_2};">${escapeHtml(row.value)}</td>
            </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:16px 0 0;">${cells}</table>`;
}

/** Sestavi celo pismo. Vrne HTML za `sendSystemMail`, ki znak pripne kot prilogo. */
export function systemMailHtml(content: MailContent): string {
  const head = content.badge
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr>
            <td style="font-family:${MONO};font-size:10px;font-weight:600;letter-spacing:0.09em;text-transform:uppercase;color:${PETROL};">${escapeHtml(content.kicker)}</td>
            ${badgeCell(content.badge)}
          </tr></table>`
    : `<p style="margin:0;font-family:${MONO};font-size:10px;font-weight:600;letter-spacing:0.09em;text-transform:uppercase;color:${PETROL};">${escapeHtml(content.kicker)}</p>`;

  const meta = content.meta
    ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:12.5px;line-height:1.4;color:${INK_2};">${escapeHtml(content.meta)}</p>`
    : "";

  // Citat nosi levo črto v petrolu — enako kot vnos človeka v aplikaciji.
  const quote = content.quote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:16px 0 0;"><tr>
            <td style="padding:12px 14px;background:${WASH};border-left:2px solid ${PETROL};font-family:${SANS};font-size:13px;line-height:1.5;color:${INK};">${paragraph(content.quote)}</td>
          </tr></table>`
    : "";

  const rows = content.rows?.length ? rowsTable(content.rows) : "";

  const cta = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;"><tr>
            <td bgcolor="${PETROL}" style="padding:11px 18px;">
              <a href="${escapeHtml(content.cta.href)}" style="display:inline-block;font-family:${SANS};font-size:12.5px;font-weight:600;letter-spacing:-0.003em;color:${SHEET};text-decoration:none;">${escapeHtml(content.cta.label)}</a>
            </td>
          </tr></table>`
    : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;background:${DESK};">
  <tr>
    <td align="center" style="padding:28px 12px;background:${DESK};">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:${SHEET};border:1px solid ${RULE};">
        <tr>
          <td style="padding:18px 24px 15px;border-bottom:1px solid ${RULE};">
            <img src="cid:${MAIL_LOGO_CID}" width="${MAIL_LOGO_WIDTH}" height="${MAIL_LOGO_HEIGHT}" alt="HelpDesk" style="display:block;border:0;outline:none;text-decoration:none;">
          </td>
        </tr>
        <tr>
          <td style="padding:22px 24px 26px;">
            ${head}
            <h1 style="margin:10px 0 0;font-family:${SANS};font-size:18px;font-weight:600;line-height:1.15;letter-spacing:-0.015em;color:${INK};">${escapeHtml(content.headline)}</h1>
            ${meta}
            ${quote}
            ${rows}
            ${cta}
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0;font-family:${SANS};font-size:11px;line-height:1.45;color:${INK_3};max-width:560px;">${escapeHtml(content.footer)}</p>
    </td>
  </tr>
</table>`;
}
