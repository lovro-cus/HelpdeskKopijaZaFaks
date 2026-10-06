import "server-only";

/**
 * Sistemska pošta ekipi (predaje, zunanji vnosi, dnevni povzetek).
 *
 * Kopija za faks ne pošilja ničesar: obvestila ostanejo v zvoncu v aplikaciji.
 */

export const mailConfigured = (): boolean => false;

export async function sendSystemMail(_input: { to: string; subject: string; text: string; html?: string }): Promise<boolean> {
  return false;
}
