"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { login, type FormState } from "@/lib/actions/auth";
import { Notice } from "./ui";
import { useT } from "@/lib/i18n/client";

const initial: FormState = {};

export function LoginForm() {
  const t = useT();
  const [state, action] = useActionState(login, initial);

  return (
    // Obrazec nima lastnega okvirja: list, na katerem stoji, je že list.
    <form action={action}>
      <div className="grid gap-4">
        <div>
          <label className="field-label" htmlFor="username">
            {t("auth.username")}
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            autoFocus
            required
            spellCheck={false}
            autoCapitalize="none"
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="password">
            {t("auth.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field"
          />
        </div>

        {state.error && <Notice kind="error">{state.error}</Notice>}

        <Submit />
      </div>
    </form>
  );
}

function Submit() {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary h-[38px] w-full">
      {pending ? t("auth.signingIn") : t("auth.signIn")}
    </button>
  );
}
