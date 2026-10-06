"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveItems, type FormState } from "@/lib/actions/issues";
import { selectionOf } from "@/lib/catalog";
import { ItemsEditor, newItem, type EditableItem } from "./ItemsEditor";
import { Notice } from "./ui";
import { useLocale, useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { pluralSuffix } from "@/lib/i18n/shared";

const initial: FormState = {};

export type CardItem = {
  id: number;
  name: string;
  variant: string | null;
  replacementVariant: string | null;
  replacementName: string | null;
  priceDiffSettled: boolean;
  wrongItemSent: boolean;
  orderedName: string | null;
  orderedVariant: string | null;
  qty: number;
  amount: number | null;
  resolution: string;
};

/** Postavke iz baze v obliko, ki jo ureja obrazec. */
function toEditable(items: CardItem[]): EditableItem[] {
  return items.map((item) => ({
    uid: `db${item.id}`,
    name: item.name,
    variant: item.variant ?? "",
    selection: selectionOf(item.name, item.variant ?? ""),
    replacementVariant: item.replacementVariant ?? "",
    replacementName: item.replacementName ?? "",
    replacementSelection: selectionOf(item.replacementName || item.name, item.replacementVariant ?? ""),
    priceDiffSettled: item.priceDiffSettled,
    wrongItemSent: item.wrongItemSent,
    orderedName: item.orderedName ?? "",
    orderedVariant: item.orderedVariant ?? "",
    qty: String(item.qty),
    amount: item.amount == null ? "" : String(item.amount),
    resolution: item.resolution,
  }));
}

export function ItemsCard({
  issueId,
  items,
  currency,
}: {
  issueId: number;
  items: CardItem[];
  currency: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [state, action] = useActionState(saveItems, initial);
  const [rows, setRows] = useState<EditableItem[]>(() => toEditable(items));
  const [dirty, setDirty] = useState(false);

  // Ob spremembi na strežniku stran komponento ponovno vgradi (glej `key` v
  // strani naročila), zato tu ne sinhroniziramo — sicer bi vsak nepovezan
  // revalidate med tipkanjem povozil vrstice.
  useEffect(() => {
    if (state.ok) setDirty(false);
  }, [state]);

  function change(next: EditableItem[]) {
    setRows(next);
    setDirty(true);
  }

  return (
    <form action={action} className="card overflow-hidden">
      <input type="hidden" name="issueId" value={issueId} />

      <div className="flex items-center justify-between gap-3 px-4 pb-2.5 pt-3.5">
        <h3 className="caption" style={{ color: "var(--ink)" }}>{t("items.title")}</h3>
        {rows.length > 0 && (
          <span className="text-[12px] text-label-3">
            {t(`items.count.${pluralSuffix(locale, rows.length)}` as TranslationKey, {
              count: rows.length,
            })}
          </span>
        )}
      </div>

      <div className="px-4 pb-3.5">
        {rows.length === 0 && !dirty ? (
          <button
            type="button"
            onClick={() => change([newItem()])}
            className="w-full border border-dashed py-4 text-[12.5px] text-label-2 transition-colors hover:text-label"
            style={{ borderColor: "var(--separator-strong)" }}
          >
            {t("items.empty")} {t("items.add")}
          </button>
        ) : (
          <ItemsEditor items={rows} onChange={change} currency={currency} />
        )}
      </div>

      {state.error && (
        <div className="px-4 pb-3.5">
          <Notice kind="error">{state.error}</Notice>
        </div>
      )}

      {dirty && (
        <div
          className="animate-in flex items-center justify-between gap-2 border-t px-4 py-2.5"
          style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}
        >
          <span className="text-[12px] text-label-2">{t("items.unsaved")}</span>
          <Save />
        </div>
      )}
    </form>
  );
}

function Save() {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
      {pending ? t("common.saving") : t("common.save")}
    </button>
  );
}
