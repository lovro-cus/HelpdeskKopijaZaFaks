"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CheckSquare2, Clock, Flag, Hand, Mail, RotateCcw, Square, Tag, Users } from "lucide-react";
import { useFormStatus } from "react-dom";

import { bulkCloseIssues, bulkUpdateIssues, type FormState } from "@/lib/actions/issues";
import { usePriorityOptions, useReturnTypes, useTypeOptions } from "@/lib/config/client";
import { requiresReturnProof } from "@/lib/domain";
import { useT } from "@/lib/i18n/client";
import { BulkMailPanel } from "./BulkMailPanel";
import { Notice, WaitDeadlineField } from "./ui";
import { OrderTile, type TileIssue } from "./OrderTile";
import { Sheet } from "./Sheet";

const initial: FormState = {};

/** Kdo lahko dobi kup naročil v roke. */
export type PickUser = { id: string; name: string; level: number };

/** Kaj je zadnja poteza naredila — obvestilo nad kupom. */
type Done = { kind: "closed" | "updated" | "mail"; count: number; failed?: string[] };

type Panel = "wait" | "resume" | "claim" | "assign" | "priority" | "type" | "mail" | "close";

export function BulkOrderGrid({
  issues,
  meId,
  users,
  mayClose,
  showMineCue,
  filters,
  empty,
}: {
  issues: TileIssue[];
  meId: string;
  users: PickUser[];
  /** Zaključevanje je vezano na nivo; ostala skupinska dejanja niso. */
  mayClose: boolean;
  showMineCue: boolean;
  /** Filter po vrsti stoji v isti vrstici kot gumb za izbiranje — tik nad listi. */
  filters?: React.ReactNode;
  /** Kaj stoji namesto mreže, kadar kupa ni. Skupinska poteza kup pogosto
   *  izprazni (na čakanje, v arhiv) in obvestilo o njej mora ostati vidno,
   *  zato prazno stanje riše ta komponenta in ne stran nad njo. */
  empty?: React.ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [panel, setPanel] = useState<Panel | null>(null);
  const [completed, setCompleted] = useState<Done | null>(null);
  const submittedCount = useRef(0);
  const [closeState, closeAction] = useActionState(bulkCloseIssues, initial);
  const [updateState, updateAction] = useActionState(bulkUpdateIssues, initial);

  const openIssues = useMemo(() => issues.filter((issue) => issue.status !== "closed"), [issues]);
  const chosen = useMemo(() => issues.filter((issue) => selected.has(issue.id)), [issues, selected]);
  const returnTypes = useReturnTypes();
  const needsReturn = chosen.some((issue) => requiresReturnProof(issue.type, issue.items, returnTypes));
  const allSelected = openIssues.length > 0 && openIssues.every((issue) => selected.has(issue.id));
  // Gumba, ki nimata česa premakniti, ni: kup na čakanju se vrača v delo, kup v
  // delu gre na čakanje — oboje hkrati bi bilo dvoje nasprotnih potez na istem.
  const resumable = chosen.filter((issue) => issue.status === "waiting" || issue.status === "manual").length;

  const finish = (done: Done) => {
    setCompleted(done);
    setPanel(null);
    setSelecting(false);
    setSelected(new Set());
    // Seznam je force-dynamic: revalidatePath sam ne prebarva tega, kar je že
    // na zaslonu, zato ga po skupinski potezi zahtevamo nazaj.
    router.refresh();
  };

  useEffect(() => {
    if (closeState.ok) finish({ kind: "closed", count: closeState.count ?? submittedCount.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeState]);

  useEffect(() => {
    if (updateState.ok) finish({ kind: "updated", count: updateState.count ?? 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateState]);

  const begin = () => {
    setCompleted(null);
    setSelecting(true);
    setSelected(new Set());
  };
  const cancel = () => {
    setSelecting(false);
    setPanel(null);
    setSelected(new Set());
  };
  const toggle = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(openIssues.map((issue) => issue.id)));
  };

  const none = selected.size === 0;

  return (
    <>
      <div className={selecting ? "sticky top-[58px] z-20 mb-4" : "mb-4 flex flex-wrap items-center justify-between gap-2"}>
        {selecting ? (
          <div className="card flex min-h-[42px] flex-wrap items-center gap-2 px-2.5 py-2" style={{ borderTop: "2px solid var(--petrol)" }}>
            <button type="button" className="btn btn-sm" onClick={toggleAll}>
              {allSelected ? <CheckSquare2 size={14} /> : <Square size={14} />}
              {allSelected ? t("orders.bulkClearAll") : t("orders.bulkSelectAll")}
            </button>
            <span className="mono text-[11px] text-label-2">
              {t("orders.bulkSelected", { count: selected.size })}
            </span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-sm" disabled={none} onClick={() => setPanel("wait")}>
                <Clock size={14} />
                {t("orders.bulkWait")}
              </button>
              {resumable > 0 && (
                <button type="button" className="btn btn-sm" onClick={() => setPanel("resume")}>
                  <RotateCcw size={14} />
                  {t("orders.bulkResume")}
                </button>
              )}
              <button type="button" className="btn btn-sm" disabled={none} onClick={() => setPanel("claim")}>
                <Hand size={14} />
                {t("orders.bulkClaim")}
              </button>
              <button type="button" className="btn btn-sm" disabled={none} onClick={() => setPanel("assign")}>
                <Users size={14} />
                {t("orders.bulkAssign")}
              </button>
              <button type="button" className="btn btn-sm" disabled={none} onClick={() => setPanel("mail")}>
                <Mail size={14} />
                {t("orders.bulkMail")}
              </button>
              <button type="button" className="btn btn-sm" disabled={none} onClick={() => setPanel("priority")}>
                <Flag size={14} />
                {t("orders.bulkPriority")}
              </button>
              <button type="button" className="btn btn-sm" disabled={none} onClick={() => setPanel("type")}>
                <Tag size={14} />
                {t("orders.bulkType")}
              </button>

              {/* Ločnica: levo se naročila premikajo, desno se odložijo. */}
              <span aria-hidden className="mx-0.5 h-[20px] w-px" style={{ background: "var(--rule-strong)" }} />

              <button type="button" className="btn btn-sm" onClick={cancel}>
                {t("common.cancel")}
              </button>
              {mayClose && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={none}
                  onClick={() => setPanel("close")}
                >
                  <Archive size={14} />
                  {t("orders.bulkClose")}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {filters}
            {openIssues.length > 0 && (
              // ml-auto drži gumb ob desnem robu tudi, kadar filtrov ni.
              <button type="button" className="btn btn-sm ml-auto" onClick={begin}>
                <CheckSquare2 size={14} />
                {t("orders.bulkSelect")}
              </button>
            )}
          </>
        )}
      </div>

      {completed !== null && (
        <div className="mb-4">
          <Notice kind={completed.kind === "mail" && completed.failed?.length ? "error" : "ok"}>
            {completed.kind === "closed"
              ? t("orders.bulkDone", { count: completed.count })
              : completed.kind === "mail"
                ? completed.failed?.length
                  ? t("bulkMail.doneFailed", {
                      sent: completed.count,
                      count: completed.failed.length,
                      orders: completed.failed.map((order) => `#${order}`).join(" · "),
                    })
                  : t("bulkMail.done", { count: completed.count })
                : completed.count === 0
                  ? t("orders.bulkNothing")
                  : t("orders.bulkUpdated", { count: completed.count })}
          </Notice>
        </div>
      )}

      {issues.length === 0 ? (
        empty
      ) : (
      <div className="grid-settle grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-4">
        {issues.map((issue) => (
          <OrderTile
            key={issue.id}
            issue={issue}
            meId={meId}
            showMineCue={showMineCue}
            selecting={selecting && issue.status !== "closed"}
            selected={selected.has(issue.id)}
            onToggle={() => toggle(issue.id)}
          />
        ))}
      </div>
      )}

      {panel === "close" && (
        <BulkSheet
          title={t("orders.bulkConfirmTitle", { count: selected.size })}
          subtitle={t("orders.bulkConfirmBody")}
          chosen={chosen}
          error={closeState.error}
          action={closeAction}
          onClose={() => setPanel(null)}
          onSubmit={() => { submittedCount.current = selected.size; }}
          submit={<BulkSubmit idle={t("orders.bulkConfirm", { count: selected.size })} busy={t("action.closing")} icon={<Archive size={14} />} />}
        >
          {needsReturn && (
            <label className="mt-4 flex items-start gap-2.5 text-[13px]">
              <input
                type="checkbox"
                name="returnConfirmed"
                className="mt-0.5 h-[15px] w-[15px] accent-[var(--petrol)]"
              />
              <span>
                {t("action.returnConfirm")}
                <span className="mt-0.5 block text-[12px] text-label-3">
                  {t("orders.bulkReturnHelp")}
                </span>
              </span>
            </label>
          )}
        </BulkSheet>
      )}

      {panel === "mail" && (
        <BulkMailPanel
          issueIds={chosen.map((issue) => issue.id)}
          onClose={() => setPanel(null)}
          onSent={(sent, failed) => finish({ kind: "mail", count: sent, failed })}
        />
      )}

      {panel !== null && panel !== "close" && panel !== "mail" && (
        <UpdatePanel
          op={panel}
          chosen={chosen}
          users={users}
          meId={meId}
          resumable={resumable}
          error={updateState.error}
          action={updateAction}
          onClose={() => setPanel(null)}
        />
      )}
    </>
  );
}

/**
 * Skupno ohišje za skupinsko potezo: naslov, seznam prizadetih naročil, napaka
 * in gumba. Vsaka poteza doda samo svoja polja — sicer bi bilo šest listov, ki
 * se razhajajo v malenkostih.
 */
function BulkSheet({
  title,
  subtitle,
  chosen,
  error,
  action,
  onClose,
  onSubmit,
  submit,
  children,
}: {
  title: string;
  subtitle: string;
  chosen: TileIssue[];
  error?: string;
  action: (fd: FormData) => void;
  onClose: () => void;
  onSubmit?: () => void;
  submit: React.ReactNode;
  children?: React.ReactNode;
}) {
  const t = useT();
  return (
    <Sheet title={title} subtitle={subtitle} onClose={onClose} width={480}>
      <form
        action={action}
        className="border-t px-5 py-4"
        style={{ borderColor: "var(--rule)" }}
        onSubmit={onSubmit}
      >
        {chosen.map((issue) => (
          <input key={issue.id} type="hidden" name="issueId" value={issue.id} />
        ))}

        <p className="mono text-[12px] leading-relaxed text-label-2">
          {chosen.slice(0, 8).map((issue) => `#${issue.orderNumber}`).join(" · ")}
          {chosen.length > 8 ? ` · +${chosen.length - 8}` : ""}
        </p>

        {children}

        {error && (
          <div className="mt-4">
            <Notice kind="error">{error}</Notice>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            {t("common.cancel")}
          </button>
          {submit}
        </div>
      </form>
    </Sheet>
  );
}

function UpdatePanel({
  op,
  chosen,
  users,
  meId,
  resumable,
  error,
  action,
  onClose,
}: {
  op: Exclude<Panel, "close" | "mail">;
  chosen: TileIssue[];
  users: PickUser[];
  meId: string;
  resumable: number;
  error?: string;
  action: (fd: FormData) => void;
  onClose: () => void;
}) {
  const t = useT();
  const types = useTypeOptions();
  const priorities = usePriorityOptions();
  const count = op === "resume" ? resumable : chosen.length;
  const titles = {
    wait: t("orders.bulkWaitTitle", { count }),
    resume: t("orders.bulkResumeTitle", { count }),
    claim: t("orders.bulkClaimTitle", { count }),
    assign: t("orders.bulkAssignTitle", { count }),
    priority: t("orders.bulkPriorityTitle", { count }),
    type: t("orders.bulkTypeTitle", { count }),
  } as const;
  const bodies = {
    wait: t("orders.bulkWaitBody"),
    resume: t("orders.bulkResumeBody"),
    claim: t("orders.bulkClaimBody"),
    assign: t("orders.bulkAssignBody"),
    priority: t("orders.bulkValueBody"),
    type: t("orders.bulkValueBody"),
  } as const;

  const options = op === "type" ? types : priorities;

  return (
    <BulkSheet
      title={titles[op]}
      subtitle={bodies[op]}
      chosen={chosen}
      error={error}
      action={action}
      onClose={onClose}
      submit={<BulkSubmit idle={t("orders.bulkApply", { count })} busy={t("common.saving")} />}
    >
      <input type="hidden" name="op" value={op} />

      {op === "wait" && (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-[250px_1fr]">
          <WaitDeadlineField id="bulk-until" label={t("action.waitUntilOptional")} />
          <div>
            <label className="field-label" htmlFor="bulk-note">
              {t("action.waitFor")}
            </label>
            <input
              id="bulk-note"
              name="note"
              maxLength={2000}
              placeholder={t("action.waitPlaceholder")}
              className="field"
            />
          </div>
        </div>
      )}

      {op === "wait" && chosen.some((issue) => !issue.assignee) && (
        <p className="mt-2.5 text-[12px] text-label-3">
          {t("orders.bulkWaitClaims", { count: chosen.filter((issue) => !issue.assignee).length })}
        </p>
      )}

      {op === "wait" && (
        <label className="mt-2.5 flex items-start gap-2 text-[12.5px]">
          <input type="checkbox" name="waitForReply" className="mt-0.5 shrink-0" />
          <span>
            {t("action.waitForReply")}
            <span className="mt-0.5 block text-[11.5px] text-label-3">
              {t("orders.bulkWaitEmails")}
            </span>
          </span>
        </label>
      )}

      {op === "assign" && (
        <div className="mt-4">
          <label className="field-label" htmlFor="bulk-user">
            {t("orders.bulkAssignTo")}
          </label>
          <select id="bulk-user" name="toUserId" className="field" defaultValue={users[0]?.id}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} · L{user.level}
                {user.id === meId ? ` (${t("common.you")})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {(op === "priority" || op === "type") && (
        <div className="mt-4">
          <label className="field-label" htmlFor="bulk-value">
            {t(op === "type" ? "orders.type" : "orders.priority")}
          </label>
          <select id="bulk-value" name="value" className="field" defaultValue={options[0]?.key}>
            {options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {(op === "claim" || op === "assign") && (
        <div className="mt-4">
          <label className="field-label" htmlFor="bulk-hand-note">
            {t("orders.bulkNote")}
          </label>
          <input id="bulk-hand-note" name="note" maxLength={2000} className="field" />
        </div>
      )}
    </BulkSheet>
  );
}

function BulkSubmit({ idle, busy, icon }: { idle: string; busy: string; icon?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
      {icon}
      {pending ? busy : idle}
    </button>
  );
}
