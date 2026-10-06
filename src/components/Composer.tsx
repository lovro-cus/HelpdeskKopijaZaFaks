"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { addComment, type FormState } from "@/lib/actions/issues";
import type { SessionUser } from "@/lib/auth";
import type { EntryStance } from "@/lib/domain";
import { AttachmentPicker } from "./AttachmentPicker";
import { Avatar, Notice } from "./ui";
import { useT } from "@/lib/i18n/client";

const initial: FormState = {};

export function Composer({
  issueId,
  me,
  stance,
}: {
  issueId: number;
  me: SessionUser;
  /** Kaj vnos pomeni za to naročilo — lib/domain.ts, entryStance(). */
  stance: EntryStance;
}) {
  const t = useT();
  const [state, action] = useActionState(addComment, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex gap-3">
      <div className="shrink-0 pt-1">
        <Avatar name={me.name} color={me.color} size={30} />
      </div>

      <form ref={formRef} action={action} className="card flex-1 p-3">
        <input type="hidden" name="issueId" value={issueId} />

        {(stance === "outsider" || stance === "claim") && (
          <p className="mb-2 text-[12px] text-label-3">
            {t(stance === "claim" ? "composer.claims" : "composer.outsider")}
          </p>
        )}

        <textarea
          name="body"
          rows={2}
          maxLength={10000}
          placeholder={t("composer.placeholder")}
          aria-label={t("composer.label")}
          className="field border-0 bg-transparent p-1 focus:shadow-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />

        {state.error && (
          <div className="mb-2">
            <Notice kind="error">{state.error}</Notice>
          </div>
        )}

        <div className="hairline mt-1 flex flex-wrap items-end justify-between gap-2 pt-2.5">
          <AttachmentPicker />
          <Submit />
        </div>
      </form>
    </div>
  );
}

function Submit() {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
      {pending ? t("composer.publishing") : t("composer.publish")}
    </button>
  );
}
