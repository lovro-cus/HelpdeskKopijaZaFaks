import { LogOut, Trash2 } from "lucide-react";

import { pruneExpiredSessions, revokeSession, revokeUserSessions } from "@/lib/actions/admin-sessions";
import { EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/shared";

export type AdminSession = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  userAgent: string | null;
  user: { id: string; name: string };
};

/** Kratek opis naprave iz User-Agenta. Cel niz je nečitljiv in za odločitev
 *  "je to moja naprava?" pove manj kot brskalnik in sistem. */
function device(agent: string | null): string | null {
  if (!agent) return null;
  const browser = /Edg\//.test(agent) ? "Edge"
    : /OPR\//.test(agent) ? "Opera"
    : /Firefox\//.test(agent) ? "Firefox"
    : /Chrome\//.test(agent) ? "Chrome"
    : /Safari\//.test(agent) ? "Safari" : null;
  const os = /Windows/.test(agent) ? "Windows"
    : /Android/.test(agent) ? "Android"
    : /iPhone|iPad/.test(agent) ? "iOS"
    : /Mac OS X/.test(agent) ? "macOS"
    : /Linux/.test(agent) ? "Linux" : null;
  return [browser, os].filter(Boolean).join(" · ") || null;
}

export function AdminSessions({ sessions, locale }: { sessions: AdminSession[]; locale: Locale }) {
  const now = Date.now();
  const expiredCount = sessions.filter((session) => session.expiresAt.getTime() < now).length;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <div>
          <h2 className="caption" style={{ color: "var(--ink)" }}>{t(locale, "admin.sessions.title")}</h2>
          <p className="mt-1 max-w-[80ch] text-[12px] text-label-2">{t(locale, "admin.sessions.intro")}</p>
        </div>
        {expiredCount > 0 && (
          <form action={pruneExpiredSessions}>
            <button className="btn btn-sm"><Trash2 size={13} />{t(locale, "admin.sessions.prune")}</button>
          </form>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="border-t" style={{ borderColor: "var(--separator)" }}>
          <EmptyState title={t(locale, "admin.sessions.none")} />
        </div>
      ) : sessions.map((session) => {
        const expired = session.expiresAt.getTime() < now;
        return (
          <div key={session.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t px-4 py-2.5" style={{ borderColor: "var(--separator)" }}>
            <span className="text-[13px] font-medium">{session.user.name}</span>
            <span className="text-[12px] text-label-2">{device(session.userAgent) ?? t(locale, "admin.sessions.unknownDevice")}</span>
            <span className="mono text-[11.5px] text-label-3">
              {t(locale, "admin.sessions.since")}: {formatDateTime(session.createdAt, locale)}
            </span>
            {expired
              ? <span className="pill" style={{ borderColor: "var(--ink-3)", color: "var(--ink-3)" }}>{t(locale, "admin.sessions.expired")}</span>
              : <span className="mono text-[11.5px] text-label-3">{t(locale, "admin.sessions.expires")}: {formatDateTime(session.expiresAt, locale)}</span>}

            <div className="ml-auto flex items-center gap-2">
              <form action={revokeSession}>
                <input type="hidden" name="sessionId" value={session.id} />
                <button className="btn btn-sm"><LogOut size={13} />{t(locale, "admin.sessions.revoke")}</button>
              </form>
              <form action={revokeUserSessions}>
                <input type="hidden" name="userId" value={session.user.id} />
                <button className="btn btn-sm btn-plain">{t(locale, "admin.sessions.revokeAll")}</button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
