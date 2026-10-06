"use client";

import { Fragment, useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRightLeft, CheckCircle2, Clock, Hand, RotateCcw, Trash2 } from "lucide-react";

import {
  claim,
  closeIssue,
  deleteIssue,
  handoff,
  resume,
  setWaiting,
  type FormState,
} from "@/lib/actions/issues";
import type { SessionUser } from "@/lib/auth";
import { useReturnTypes } from "@/lib/config/client";
import { MIN_CLOSE_LEVEL, SYSTEM_LEVEL, canClose, hasPendingResolution, requiresReturnProof, unresolvedMessage } from "@/lib/domain";
import { AttachmentPicker } from "./AttachmentPicker";
import { Avatar, LevelPill, Notice, StatusPill, WaitDeadlineField } from "./ui";
import { useT } from "@/lib/i18n/client";

const initial: FormState = {};

type Issue = {
  id: number;
  type: string;
  status: string;
  level: number;
  waitingUntil: Date | null;
  waitingReplySince: Date | null;
  customerEmail: string | null;
  assignee: { id: string; name: string; color: string; level: number } | null;
  items: { name: string; variant: string | null; resolution: string }[];
  /** Zakaj teče tekoči krog menjave; "ours" pomeni, da stranka kos obdrži. */
  exchangeFault: string | null;
};

type PickUser = { id: string; name: string; level: number; color: string };

export function ActionBar({
  issue,
  me,
  users,
}: {
  issue: Issue;
  me: SessionUser;
  users: PickUser[];
}) {
  const t = useT();
  const [panel, setPanel] = useState<null | "handoff" | "wait" | "close" | "delete">(null);
  const isMine = issue.assignee?.id === me.id;
  const closed = issue.status === "closed";
  const mayClose = canClose(me);
  // Artikel brez izbrane rešitve: ticket ne gre naprej, dokler je človek ne izbere.
  const unresolved = hasPendingResolution(issue.items);

  const [claimState, claimAction] = useActionState(claim, initial);
  const [resumeState, resumeAction] = useActionState(resume, initial);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar name={issue.assignee?.name} color={issue.assignee?.color} size={32} />
          <div className="leading-tight">
            <p className="text-[13.5px] font-semibold">
              {issue.assignee?.name ?? (issue.level === SYSTEM_LEVEL ? t("action.systemQueue") : t("action.levelQueue", { level: issue.level }))}
              {isMine && <span className="ml-1.5 text-[12px] font-normal text-label-3">{t("common.you")}</span>}
            </p>
            <p className="text-[12px] text-label-2">
              {issue.assignee
                ? t("action.handling", { level: issue.assignee.level })
                : t(issue.level === SYSTEM_LEVEL ? "action.awaitingTriage" : "action.awaitingClaim")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <StatusPill status={issue.status} waitingUntil={issue.waitingUntil} waitingReply={Boolean(issue.waitingReplySince)} />
          <LevelPill level={issue.level} muted={closed} />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!isMine && !closed && (
            <form action={claimAction}>
              <input type="hidden" name="issueId" value={issue.id} />
              <SubmitBtn className="btn btn-sm" idle={t("action.claim")} busy="…">
                <Hand size={14} />
              </SubmitBtn>
            </form>
          )}

          {closed ? (
            <>
              <form action={resumeAction}>
                <input type="hidden" name="issueId" value={issue.id} />
                <SubmitBtn className="btn btn-sm" idle={t("action.reopen")} busy="…">
                  <RotateCcw size={14} />
                </SubmitBtn>
              </form>
              {me.isAdmin && (
                <button
                  type="button"
                  onClick={() => setPanel(panel === "delete" ? null : "delete")}
                  className="btn btn-sm btn-destructive"
                  aria-expanded={panel === "delete"}
                >
                  <Trash2 size={14} />
                  {t("action.deletePermanently")}
                </button>
              )}
            </>
          ) : (
            <>
              {issue.status === "waiting" || issue.status === "manual" ? (
                <form action={resumeAction}>
                  <input type="hidden" name="issueId" value={issue.id} />
                  <SubmitBtn className="btn btn-sm" idle={t("action.resume")} busy="…">
                    <RotateCcw size={14} />
                  </SubmitBtn>
                </form>
              ) : (
                <button
                  onClick={() => setPanel(panel === "wait" ? null : "wait")}
                  className="btn btn-sm"
                >
                  <Clock size={14} />
                  {t("action.wait")}
                </button>
              )}

              <button
                onClick={() => setPanel(panel === "handoff" ? null : "handoff")}
                className="btn btn-sm"
                disabled={unresolved}
                title={unresolved ? t(unresolvedMessage(issue.items)) : undefined}
              >
                <ArrowRightLeft size={14} />
                {t("action.handoff")}
              </button>

              {mayClose && (
                <button
                  onClick={() => setPanel(panel === "close" ? null : "close")}
                  className="btn btn-primary btn-sm"
                  disabled={unresolved}
                  title={unresolved ? t(unresolvedMessage(issue.items)) : undefined}
                >
                  <CheckCircle2 size={14} />
                  {t("action.close")}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {(claimState.error || resumeState.error) && (
        <div className="px-3.5 pb-3.5">
          <Notice kind="error">{claimState.error ?? resumeState.error}</Notice>
        </div>
      )}

      {unresolved && !closed && (
        <p
          className="border-t px-3.5 py-2.5 text-[12.5px]"
          style={{ borderColor: "var(--separator)", background: "var(--surface-2)", color: "var(--warning)" }}
        >
          {t(unresolvedMessage(issue.items) === "error.resolutionPending" ? "action.resolutionPending" : "action.resolutionUndecided")}
        </p>
      )}

      {!mayClose && !closed && (
        <p
          className="border-t px-3.5 py-2.5 text-[12.5px] text-label-2"
          style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}
        >
          {t("action.closeHelp", { level: MIN_CLOSE_LEVEL })}
        </p>
      )}

      {panel === "handoff" && (
        <HandoffPanel issue={issue} me={me} users={users} onDone={() => setPanel(null)} />
      )}
      {panel === "wait" && <WaitPanel issue={issue} onDone={() => setPanel(null)} />}
      {panel === "close" && <ClosePanel issue={issue} onDone={() => setPanel(null)} />}
      {panel === "delete" && <DeletePanel issue={issue} onDone={() => setPanel(null)} />}
    </div>
  );
}

// --- paneli ----------------------------------------------------------------

/** Panel se zapre šele, ko strežnik potrdi uspeh. */
function useCloseOnSuccess(state: FormState, onDone: () => void) {
  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="animate-in border-t p-3.5"
      style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}
    >
      {children}
    </div>
  );
}

function HandoffPanel({
  issue,
  me,
  users,
  onDone,
}: {
  issue: Issue;
  me: SessionUser;
  users: PickUser[];
  onDone: () => void;
}) {
  const t = useT();
  const [state, action] = useActionState(handoff, initial);
  useCloseOnSuccess(state, onDone);

  const others = users.filter((u) => u.id !== issue.assignee?.id);
  const suggested = others.find((u) => u.level === (issue.assignee?.level ?? me.level) + 1);
  const byLevel = [...new Set(users.map((u) => u.level))].sort((a, b) => a - b);
  const nextLevel = (issue.assignee?.level ?? issue.level) + 1;
  const suggestedLevel = byLevel.find((level) => level >= nextLevel) ?? byLevel[0];

  return (
    <Panel>
      <form action={action}>
        <input type="hidden" name="issueId" value={issue.id} />

        <label className="field-label" htmlFor="handoffTarget">
          {t("action.handoffTo")}
        </label>
        <select
          id="handoffTarget"
          name="handoffTarget"
          defaultValue={suggestedLevel ? `level:${suggestedLevel}` : suggested?.id ?? others[0]?.id ?? ""}
          className="field"
          required
        >
          <optgroup label={t("action.handoffLevels")}>
            {byLevel.map((lvl) => (
              <option key={`level:${lvl}`} value={`level:${lvl}`}>
                {t("action.handoffLevelOption", { level: lvl })}
              </option>
            ))}
          </optgroup>
          <optgroup label={t("action.handoffPeople")}>
          {byLevel.map((lvl) => (
            <Fragment key={lvl}>
              {others
                .filter((u) => u.level === lvl)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    L{lvl} · {u.name}
                    {u.id === me.id ? ` (${t("common.you")})` : ""}
                  </option>
                ))}
            </Fragment>
          ))}
          </optgroup>
        </select>
        <p className="mt-1 text-[11.5px] text-label-3">{t("action.handoffLevelHelp")}</p>

        <textarea
          name="note"
          rows={2}
          maxLength={5000}
          placeholder={t("action.handoffPlaceholder")}
          className="field mt-2.5"
        />

        <div className="mt-2.5">
          <AttachmentPicker />
        </div>

        {state.error && (
          <div className="mt-2.5">
            <Notice kind="error">{state.error}</Notice>
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onDone} className="btn btn-sm">
            {t("common.cancel")}
          </button>
          <SubmitBtn className="btn btn-primary btn-sm" idle={t("action.handoff")} busy={t("action.handingOff")} />
        </div>
      </form>
    </Panel>
  );
}

function WaitPanel({ issue, onDone }: { issue: Issue; onDone: () => void }) {
  const t = useT();
  const [state, action] = useActionState(setWaiting, initial);
  useCloseOnSuccess(state, onDone);

  return (
    <Panel>
      <form action={action}>
        <input type="hidden" name="issueId" value={issue.id} />
        <div className="grid gap-2.5 sm:grid-cols-[250px_1fr]">
          <WaitDeadlineField
            id="waitingUntil"
            label={t(issue.customerEmail ? "action.waitUntilOptional" : "action.waitUntil")}
          />
          <div>
            <label className="field-label" htmlFor="wait-note">
              {t("action.waitFor")}
            </label>
            <input
              id="wait-note"
              name="note"
              maxLength={2000}
              placeholder={t("action.waitPlaceholder")}
              className="field"
            />
          </div>
        </div>

        {/* Naročilo brez prevzemnika ob uspavanju dobi lastnika — povej to prej,
            ne šele z zapisom v niti. */}
        {!issue.assignee && (
          <p className="mt-2.5 text-[12px] text-label-3">{t("action.waitClaims")}</p>
        )}

        {/* Čakanje na odgovor: ticket se vrne sam, ko prispe pošta stranke, zato
            datum ni več obvezen — je le varovalo, če odgovora ni. */}
        <label className="mt-2.5 flex items-start gap-2 text-[12.5px]">
          <input
            type="checkbox"
            name="waitForReply"
            disabled={!issue.customerEmail}
            className="mt-0.5 shrink-0"
          />
          <span className={issue.customerEmail ? undefined : "text-label-3"}>
            {t("action.waitForReply")}
            <span className="mt-0.5 block text-[11.5px] text-label-3">
              {issue.customerEmail
                ? t("action.waitForReplyHint", { email: issue.customerEmail })
                : t("action.waitForReplyNoEmail")}
            </span>
          </span>
        </label>

        {state.error && (
          <div className="mt-2.5">
            <Notice kind="error">{state.error}</Notice>
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onDone} className="btn btn-sm">
            {t("common.cancel")}
          </button>
          <SubmitBtn className="btn btn-primary btn-sm" idle={t("action.wait")} busy={t("common.saving")} />
        </div>
      </form>
    </Panel>
  );
}

function ClosePanel({ issue, onDone }: { issue: Issue; onDone: () => void }) {
  const t = useT();
  const returnTypes = useReturnTypes();
  const [state, action] = useActionState(closeIssue, initial);
  const needsReturn = requiresReturnProof(issue.type, issue.items, returnTypes, issue.exchangeFault);
  useCloseOnSuccess(state, onDone);

  // Pri delnem vračilu pove, kateri artikli morajo priti nazaj. Kos menjave, ki
  // ga stranka zaradi naše napake obdrži, ne pride.
  const returning = issue.items
    .filter((item) => item.resolution !== "none")
    .filter((item) => !(item.resolution === "exchange" && issue.exchangeFault === "ours"))
    .map((item) => [item.name, item.variant].filter(Boolean).join(" "));

  return (
    <Panel>
      <form action={action}>
        <input type="hidden" name="issueId" value={issue.id} />

        {needsReturn && (
          <label className="mb-2.5 flex items-start gap-2.5 text-[13px]">
            <input
              type="checkbox"
              name="returnConfirmed"
              className="mt-0.5 h-[15px] w-[15px] accent-[var(--blue)]"
            />
            <span>
              {t("action.returnConfirm")}
              <span className="block text-[12px] text-label-3">
                {returning.length > 0
                  ? t("action.returnItems", { items: returning.join(", ") })
                  : t("action.returnHelp")}
              </span>
            </span>
          </label>
        )}

        <textarea
          name="note"
          rows={2}
          maxLength={5000}
          placeholder={t("action.resolutionPlaceholder")}
          className="field"
        />

        <div className="mt-2.5">
          <AttachmentPicker label={t("action.proof")} />
        </div>

        {state.error && (
          <div className="mt-2.5">
            <Notice kind="error">{state.error}</Notice>
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onDone} className="btn btn-sm">
            {t("common.cancel")}
          </button>
          <SubmitBtn
            className="btn btn-primary btn-sm"
            idle={t("action.closeArchive")}
            busy={t("action.closing")}
          />
        </div>
      </form>
    </Panel>
  );
}

function DeletePanel({ issue, onDone }: { issue: Issue; onDone: () => void }) {
  const t = useT();
  const [state, action] = useActionState(deleteIssue, initial);

  return (
    <Panel>
      <form action={action}>
        <input type="hidden" name="issueId" value={issue.id} />
        <p className="text-[13px] font-medium">{t("action.deleteConfirm")}</p>
        <p className="mt-1 text-[12px] text-label-2">{t("action.deleteWarning")}</p>

        {state.error && (
          <div className="mt-2.5">
            <Notice kind="error">{state.error}</Notice>
          </div>
        )}

        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onDone} className="btn btn-sm">
            {t("common.cancel")}
          </button>
          <SubmitBtn
            className="btn btn-sm btn-destructive"
            idle={t("action.confirmDelete")}
            busy={t("action.deleting")}
          >
            <Trash2 size={14} />
          </SubmitBtn>
        </div>
      </form>
    </Panel>
  );
}

function SubmitBtn({
  className,
  idle,
  busy,
  children,
}: {
  className: string;
  idle: string;
  busy: string;
  children?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {!pending && children}
      {pending ? busy : idle}
    </button>
  );
}
