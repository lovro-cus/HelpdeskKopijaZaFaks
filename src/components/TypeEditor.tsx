"use client";

import { useActionState, useEffect, useState } from "react";

import { updateIssue, type FormState } from "@/lib/actions/issues";
import { useTypeLabel, useTypeOptions } from "@/lib/config/client";
import { useT } from "@/lib/i18n/client";

const initial: FormState = {};

/** Značka vrste naročila, ki jo je mogoče naknadno spremeniti. Sprememba se
 *  zabeleži v niti kot vsako drugo polje (prek updateIssue). */
export function TypeEditor({ issueId, type }: { issueId: number; type: string }) {
  const t = useT();
  const options = useTypeOptions();
  const label = useTypeLabel(type);
  const [state, action] = useActionState(updateIssue, initial);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title={t("type.edit")}
        className="pill"
        style={{ cursor: "pointer" }}
      >
        {label}
      </button>
    );
  }

  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name="issueId" value={issueId} />
      <select
        name="type"
        autoFocus
        defaultValue={type}
        onKeyDown={(event) => event.key === "Escape" && setEditing(false)}
        className="field"
        style={{ height: 24, width: "auto", padding: "0 6px", fontSize: 11 }}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>{option.label}</option>
        ))}
      </select>
      <button type="submit" className="btn btn-sm btn-primary">{t("common.save")}</button>
      <button type="button" onClick={() => setEditing(false)} className="btn btn-sm">{t("common.cancel")}</button>
    </form>
  );
}
