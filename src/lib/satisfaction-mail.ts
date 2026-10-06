export const SATISFACTION_MAIL_KEY = "satisfaction.thankYou";
export type ThankYouTemplate = { subject: string; body: string };

export function validThankYouTemplate(value: ThankYouTemplate): boolean {
  return !!value.subject.trim() && value.subject.length <= 300 && !/[\r\n]/.test(value.subject)
    && !!value.body.trim() && value.body.length <= 3000;
}

export function readThankYouTemplate(raw?: string | null): ThankYouTemplate {
  try {
    const value = JSON.parse(raw ?? "null");
    if (typeof value?.subject === "string" && typeof value?.body === "string") {
      return { subject: value.subject, body: value.body };
    }
  } catch { /* An unset or invalid template is shown as empty. */ }
  return { subject: "", body: "" };
}

export function satisfactionCloseKey(issueId: number, closedAt: Date): string {
  return `${issueId}:${closedAt.toISOString()}`;
}

export function canThankCustomer(issue: {
  status: string; closedAt: Date | null; customerEmail: string | null;
  satisfaction: { status: string; score: number | null; forClosedAt: Date } | null;
}): boolean {
  return issue.status === "closed" && !!issue.closedAt && !!issue.customerEmail
    && issue.satisfaction?.status === "scored" && issue.satisfaction.score !== null
    && issue.satisfaction.forClosedAt.getTime() === issue.closedAt.getTime();
}
