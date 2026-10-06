/**
 * Zadeva maila brez predpon odgovorov in posredovanj ("Re: Aw: Wg: …"). Ticket,
 * odprt iz Prejeto, dobi za naslov zadevo niti; po nekaj krogih dopisovanja so
 * predpone daljše od vsebine in naslov zapisa postane šum.
 */
const PREFIX = /^\s*(?:re|aw|wg|fwd?|sv|vs|tr|wtr|antw|rif|r|i)\s*(?:\[\d+\]|\(\d+\))?\s*:\s*/i;

export function cleanSubject(subject: string | null | undefined): string {
  let text = (subject ?? "").trim();
  for (let guard = 0; guard < 20 && PREFIX.test(text); guard += 1) {
    const next = text.replace(PREFIX, "");
    // Zadeva, ki je samo predpona ("Re:"), ostane, kakor je.
    if (!next.trim()) break;
    text = next.trim();
  }
  return text;
}
