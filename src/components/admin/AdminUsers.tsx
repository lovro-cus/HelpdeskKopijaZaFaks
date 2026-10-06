"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Plus, Trash2 } from "lucide-react";

import {
  createUser,
  deleteUser,
  resetPassword,
  updateUser,
  type FormState,
} from "@/lib/actions/admin";
import { MAX_LEVEL, MIN_CLOSE_LEVEL } from "@/lib/domain";
import { parsePermissions, PERMISSIONS, type Permission } from "@/lib/permissions";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { formatDateTime } from "@/lib/format";
import { MIN_PASSWORD_LENGTH, failedRules } from "@/lib/password-rules";
import { PasswordRequirements } from "../PasswordRequirements";
import { Sheet } from "../Sheet";
import { Avatar, Notice } from "../ui";
import { NotifyMatrixFields } from "../NotifyMatrixFields";
import { notifyMatrix } from "@/lib/notify-prefs";
import { useLocale, useT } from "@/lib/i18n/client";

const initial: FormState = {};

export type AdminUser = {
  id: string;
  username: string;
  name: string;
  level: number;
  isAdmin: boolean;
  active: boolean;
  mustChangePw: boolean;
  color: string;
  locale: string;
  email: string | null;
  notifyEmail: boolean;
  notifyOutsider: boolean;
  notifyKinds: string | null;
  notifyDigest: boolean;
  /** Področja strani »Urejanje«, zapisana kot v bazi ("products,rules"). */
  permissions: string;
  lastLogin: Date | null;
  createdAt: Date;
  _count: { assigned: number; events: number };
};

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

export function AdminUsers({ users, meId, readOnly = false }: { users: AdminUser[]; meId: string; readOnly?: boolean }) {
  const t = useT();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-label-2">
          {t("admin.counts", { active: users.filter((u) => u.active).length, total: users.length })}
        </p>
        {readOnly ? (
          <span className="text-[12px] text-label-3">Samo ogled — računa za ogled ni mogoče urejati.</span>
        ) : (
          <button onClick={() => setAdding(true)} className="btn btn-primary btn-sm">
            <Plus size={15} />
            {t("admin.add")}
          </button>
        )}
      </div>

      <div className="grid gap-2.5">
        {users.map((u) => (
          <UserRow key={u.id} user={u} isMe={u.id === meId} readOnly={readOnly} />
        ))}
      </div>

      {adding && !readOnly && <CreateSheet onClose={() => setAdding(false)} />}
    </>
  );
}

// --- vrstica ---------------------------------------------------------------

function UserRow({ user, isMe, readOnly }: { user: AdminUser; isMe: boolean; readOnly: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [state, action] = useActionState(updateUser, initial);
  const [dirty, setDirty] = useState(false);
  const [panel, setPanel] = useState<null | "password" | "delete">(null);
  const [admin, setAdmin] = useState(user.isAdmin);

  useEffect(() => {
    if (state.ok) setDirty(false);
  }, [state]);

  return (
    <div className="card overflow-hidden" style={{ opacity: user.active ? 1 : 0.62 }}>
      <form action={action} onChange={() => setDirty(true)}>
        {/* Gost (samo ogled): vsa polja onemogočena, brez gumbov za geslo in brisanje. */}
        <fieldset disabled={readOnly} className="contents">
        <input type="hidden" name="userId" value={user.id} />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 p-3.5">
          <Avatar name={user.name} color={user.color} size={34} />

          <div className="min-w-[150px] flex-1">
            <input
              name="name"
              defaultValue={user.name}
              maxLength={80}
              aria-label={t("admin.name")}
              className="field h-[32px] font-medium"
            />
            <input type="email" name="email" defaultValue={user.email ?? ""} placeholder="email@example.com" className="field mt-1 h-[30px] text-[12px]" />
            <p className="mt-1 text-[11.5px] text-label-3">
              @{user.username}
              {isMe && ` · ${t("admin.thisIsYou")}`}
              {user.mustChangePw && ` · ${t("admin.mustChange")}`}
            </p>
          </div>

          <label className="flex items-center gap-2 text-[12.5px] text-label-2">
            {t("common.level")}
            <select
              name="level"
              defaultValue={user.level}
              aria-label={t("common.level")}
              className="field h-[32px] w-[74px] text-[13px]"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[12.5px]">
            <input
              type="checkbox"
              name="isAdmin"
              defaultChecked={user.isAdmin}
              onChange={(event) => setAdmin(event.target.checked)}
              className="h-[15px] w-[15px] accent-[var(--blue)]"
            />
            Admin
          </label>

          <label className="flex items-center gap-1.5 text-[12.5px]">
            {t("admin.language")}
            <select name="locale" defaultValue={user.locale} className="field h-[32px] w-[70px] text-[13px]">
              <option value="en">EN</option><option value="sl">SL</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[12.5px]">
            <input
              type="checkbox"
              name="active"
              defaultChecked={user.active}
              className="h-[15px] w-[15px] accent-[var(--blue)]"
            />
            {t("admin.active")}
          </label>

          {!readOnly && <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPanel(panel === "password" ? null : "password")}
              className="btn btn-sm px-2"
              title={t("admin.resetPassword")}
            >
              <KeyRound size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel === "delete" ? null : "delete")}
              className="btn btn-sm btn-destructive px-2"
              title={t("admin.delete")}
              disabled={isMe}
            >
              <Trash2 size={14} />
            </button>
          </div>}

          {dirty && !readOnly && <Save />}
        </div>

        <PermissionBoxes granted={parsePermissions(user.permissions)} admin={admin} />

        {/* Katera obvestila dobi ta oseba — enaka tabela kot v njenem profilu. */}
        <details className="border-t px-3.5 py-2.5" style={{ borderColor: "var(--separator)" }}>
          <summary className="cursor-pointer text-[12px] text-label-2">{t("notifyPrefs.title")}</summary>
          <p className="mb-2.5 mt-1.5 max-w-[70ch] text-[11.5px] text-label-3">{t("notifyPrefs.intro")}</p>
          <NotifyMatrixFields matrix={notifyMatrix(user)} />
          <label className="mt-2.5 flex items-center gap-1.5 text-[12.5px]">
            <input type="checkbox" name="notifyDigest" defaultChecked={user.notifyDigest} className="h-[15px] w-[15px] accent-[var(--blue)]" />
            {t("settings.digest")}
          </label>
        </details>

        {(state.error || state.ok) && (
          <div className="px-3.5 pb-3.5">
            <Notice kind={state.error ? "error" : "ok"}>{state.error ?? state.ok}</Notice>
          </div>
        )}
        </fieldset>
      </form>

      <div
        className="border-t px-3.5 py-2 text-[11.5px] text-label-3"
        style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}
      >
        {user.level >= MIN_CLOSE_LEVEL || user.isAdmin
          ? t("admin.mayClose")
          : t("admin.cannotClose")}
        {" · "}{t("admin.activity", { assigned: user._count.assigned, events: user._count.events, date: user.lastLogin ? formatDateTime(user.lastLogin, locale) : t("common.never") })}
      </div>

      {panel === "password" && <PasswordPanel user={user} onDone={() => setPanel(null)} />}
      {panel === "delete" && <DeletePanel user={user} onDone={() => setPanel(null)} />}
    </div>
  );
}

/**
 * Kaj sme oseba urejati na strani »Urejanje«. Admin ureja vse, zato kljukic
 * zanj ni — napis pove, zakaj.
 */
function PermissionBoxes({ granted, admin }: { granted: Permission[]; admin: boolean }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 pb-3 text-[12.5px]">
      <span className="field-label mb-0">{t("admin.permissions")}</span>
      {admin ? (
        <>
          <span className="text-label-3">{t("admin.permissions.admin")}</span>
          {/* Dodeljena področja ostanejo, če admin kdaj ne bo več admin. */}
          {granted.map((permission) => <input key={permission} type="hidden" name="perm" value={permission} />)}
        </>
      ) : (
        PERMISSIONS.map((permission) => (
          <label key={permission} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              name="perm"
              value={permission}
              defaultChecked={granted.includes(permission)}
              className="h-[15px] w-[15px] accent-[var(--blue)]"
            />
            {t(`manage.view.${permission}` as TranslationKey)}
          </label>
        ))
      )}
    </div>
  );
}

function PasswordPanel({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const t = useT();
  const [state, action] = useActionState(resetPassword, initial);
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={action}
      className="animate-in border-t p-3.5"
      style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}
    >
      <input type="hidden" name="userId" value={user.id} />
      <label className="field-label" htmlFor={`pw-${user.id}`}>
        {t("admin.newPasswordFor", { name: user.name })}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={`pw-${user.id}`}
          name="password"
          type="text"
          minLength={MIN_PASSWORD_LENGTH}
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field max-w-[280px] flex-1"
        />
        <SubmitBtn idle={t("admin.reset")} busy="…" disabled={failedRules(password).length > 0} />
        <button type="button" onClick={onDone} className="btn btn-sm">
          {t("common.cancel")}
        </button>
      </div>

      <div className="mt-2.5">
        <PasswordRequirements value={password} />
      </div>

      <p className="mt-2 text-[11.5px] text-label-3">
        {t("admin.resetHelp")}
      </p>
      {state.error && (
        <div className="mt-2.5">
          <Notice kind="error">{state.error}</Notice>
        </div>
      )}
    </form>
  );
}

function DeletePanel({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const t = useT();
  const [state, action] = useActionState(deleteUser, initial);

  return (
    <form
      action={action}
      className="animate-in border-t p-3.5"
      style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}
    >
      <input type="hidden" name="userId" value={user.id} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px]">{t("admin.confirmDelete", { name: user.name })}</span>
        <SubmitBtn idle={t("admin.delete")} busy="…" destructive />
        <button type="button" onClick={onDone} className="btn btn-sm">
          {t("common.cancel")}
        </button>
      </div>
      {state.error && (
        <div className="mt-2.5">
          <Notice kind="error">{state.error}</Notice>
        </div>
      )}
    </form>
  );
}

// --- dodajanje -------------------------------------------------------------

function CreateSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [state, action] = useActionState(createUser, initial);
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Sheet
      title={t("admin.newUser")}
      subtitle={t("admin.newUserHelp")}
      onClose={onClose}
      width={520}
    >
      <form action={action}>
          <div className="grid gap-3.5 px-6 pb-5">
          <div>
            <label className="field-label" htmlFor="new-name">
              {t("admin.fullName")}
            </label>
            <input id="new-name" name="name" required maxLength={80} className="field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="new-email">E-mail</label>
              <input id="new-email" name="email" type="email" className="field" />
            </div>
            <div>
              <label className="field-label" htmlFor="new-locale">{t("admin.language")}</label>
              <select id="new-locale" name="locale" defaultValue="en" className="field">
                <option value="en">English</option><option value="sl">Slovenščina</option>
              </select>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="new-username">
              {t("auth.username")}
            </label>
            <input
              id="new-username"
              name="username"
              required
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9._\-]{3,32}"
              autoCapitalize="none"
              spellCheck={false}
              className="field"
            />
            <p className="mt-1 text-[11.5px] text-label-3">{t("admin.usernameHelp")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="new-level">
                {t("common.level")}
              </label>
              <select id="new-level" name="level" defaultValue={1} className="field">
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {t("nav.level", { level: l })}
                  </option>
                ))}
              </select>
            </div>
            <label className="mt-6 flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                name="isAdmin"
                className="h-[15px] w-[15px] accent-[var(--blue)]"
              />
              Administrator
            </label>
          </div>
          <div>
            <label className="field-label" htmlFor="new-password">
              {t("admin.initialPassword")}
            </label>
            <input
              id="new-password"
              name="password"
              type="text"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
            <div
              className="mt-2.5 px-3 py-2.5"
              style={{ background: "var(--surface-2)", border: "1px solid var(--separator)" }}
            >
              <PasswordRequirements value={password} />
            </div>
          </div>

          {state.error && <Notice kind="error">{state.error}</Notice>}
        </div>

        <div
          className="flex justify-end gap-2 border-t px-6 py-3.5"
          style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}
        >
          <button type="button" onClick={onClose} className="btn btn-sm">
            {t("common.cancel")}
          </button>
          <SubmitBtn
            idle={t("admin.create")}
            busy={t("admin.creating")}
            primary
            disabled={failedRules(password).length > 0}
          />
        </div>
      </form>
    </Sheet>
  );
}

function Save() {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
      {pending ? "…" : t("common.save")}
    </button>
  );
}

function SubmitBtn({
  idle,
  busy,
  primary,
  destructive,
  disabled,
}: {
  idle: string;
  busy: string;
  primary?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`btn btn-sm ${primary ? "btn-primary" : ""} ${destructive ? "btn-destructive" : ""}`}
    >
      {pending ? busy : idle}
    </button>
  );
}
