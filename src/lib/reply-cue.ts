/**
 * Rdeči klicaj na listu: stranka je odgovorila, ticket se je sam vrnil iz
 * čakanja na odgovor (dogodek `reply_received`), od takrat pa na njem še nihče
 * ni nič naredil. Prvi vnos, predaja, sprememba stanja ali pismo stranki —
 * karkoli z avtorjem — klicaj pogasi; brez tega bi ostal za vedno in nehal
 * kaj pomeniti.
 */
export function replyCue(status: string, replyAt: Date | null | undefined, lastHumanAt: Date | null | undefined): boolean {
  if (status !== "open" || !replyAt) return false;
  return !lastHumanAt || lastHumanAt.getTime() < replyAt.getTime();
}

type Latest = { issueId: number; _max: { createdAt: Date | null } };

/**
 * Isto pravilo velja za ticket, ki ga je znova odprl mail po zaključku
 * (dogodek `reply_after_close`): ikona ovojnice s klicajem, dokler se nihče
 * ne odzove. Kadar veljata oba, se pokaže samo ta — je močnejši signal.
 */
export const REOPEN_FIELD = "reply_after_close";

/** Ticketi s klicajem iz dveh skupinskih poizvedb nad dogodki. */
export function replyCueIds(issues: { id: number; status: string }[], replies: Latest[], human: Latest[]): Set<number> {
  const replyAt = new Map(replies.map((row) => [row.issueId, row._max.createdAt]));
  const humanAt = new Map(human.map((row) => [row.issueId, row._max.createdAt]));
  return new Set(issues.filter((issue) => replyCue(issue.status, replyAt.get(issue.id), humanAt.get(issue.id))).map((issue) => issue.id));
}
