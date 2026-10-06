"use client";

import { useEffect } from "react";
import { markIssueNotificationsRead } from "@/lib/actions/preferences";

export function MarkIssueRead({ issueId }: { issueId: number }) {
  useEffect(() => { void markIssueNotificationsRead(issueId); }, [issueId]);
  return null;
}
