"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { updateIssue, type FormState } from "@/lib/actions/issues";
import { useT } from "@/lib/i18n/client";
import { cleanSubject } from "@/lib/subject";

const initial: FormState = {};

export function TitleEditor({
  issueId,
  title,
  fallback,
}: {
  issueId: number;
  title: string | null;
  fallback: string;
}) {
  const t = useT();
  const [state, action] = useActionState(updateIssue, initial);
  const [editing, setEditing] = useState(false);
  // Naslov iz zadeve maila brez "Re: Aw: Wg:"; ob shranjevanju ostane očiščen.
  const shown = cleanSubject(title) || fallback;

  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div className="group flex items-start gap-2">
        <h1 className="text-[15px] font-semibold leading-snug tracking-[-0.012em]">
          {shown}
        </h1>
        <button
          onClick={() => setEditing(true)}
          aria-label={t("title.edit")}
          className="btn btn-sm mt-0.5 px-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Pencil size={13} />
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="issueId" value={issueId} />
      <input
        name="title"
        autoFocus
        maxLength={200}
        defaultValue={shown}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        className="field max-w-[520px] flex-1 text-[15px] font-semibold"
      />
      <button type="submit" className="btn btn-primary btn-sm">
        {t("common.save")}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="btn btn-sm">
        {t("common.cancel")}
      </button>
    </form>
  );
}
