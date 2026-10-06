"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { changeOwnPassword, type FormState } from "@/lib/actions/auth";
import { MIN_PASSWORD_LENGTH, failedRules } from "@/lib/password-rules";
import { PasswordRequirements } from "./PasswordRequirements";
import { Notice } from "./ui";
import { useT } from "@/lib/i18n/client";

const initial: FormState = {};

export function PasswordForm() {
  const t = useT();
  const [state, action] = useActionState(changeOwnPassword, initial);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");

  const ready =
    failedRules(next).length === 0 &&
    next === repeat &&
    next.length > 0 &&
    current.length > 0 &&
    next !== current;

  return (
    <form action={action} className="card p-6" style={{ boxShadow: "var(--shadow-2)" }}>
      <div className="grid gap-4">
        <div>
          <label className="field-label" htmlFor="current">
            {t("auth.currentPassword")}
          </label>
          <input
            id="current"
            name="current"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="next">
            {t("auth.newPassword")}
          </label>
          <input
            id="next"
            name="next"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="repeat">
            {t("auth.repeatPassword")}
          </label>
          <input
            id="repeat"
            name="repeat"
            type="password"
            autoComplete="new-password"
            required
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className="field"
          />
        </div>

        <div
          className="px-3 py-2.5"
          style={{ background: "var(--surface-2)", border: "1px solid var(--separator)" }}
        >
          <PasswordRequirements value={next} repeat={repeat} current={current} />
        </div>

        {state.error && <Notice kind="error">{state.error}</Notice>}

        <Submit disabled={!ready} />
      </div>
    </form>
  );
}

function Submit({ disabled }: { disabled: boolean }) {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="btn btn-primary h-[38px] w-full"
    >
      {pending ? t("common.saving") : t("auth.savePassword")}
    </button>
  );
}
