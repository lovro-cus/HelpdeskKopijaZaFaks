"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Check, Link2 } from "lucide-react";

import { linkShipGermanParcelFromIssue, type IssueLinkState } from "@/lib/actions/shipg-linking";
import { useT } from "@/lib/i18n/client";
import { Choice, type PackageOption } from "./AnotherReturnForm";
import { Sheet } from "./Sheet";
import { Notice } from "./ui";

export type OpenReturn = { id: number; round: number; added: string; contents: string };
export type LinkPackage = PackageOption & { trackingMatch: boolean };
type Packages = { suggested: LinkPackage[]; other: LinkPackage[] };

const OTHER = "__other";
const initial: IssueLinkState = {};

/** Gumb in list za povezavo paketa iz ShipGermana z vračilom ticketa. */
export function IssueParcelLinkForm({ label, issueId, returns, packages }: {
  label: string;
  issueId: number;
  returns: OpenReturn[];
  packages: Packages;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  // Stabilna referenca: list ob vsaki novi funkciji znova zaklene drsenje strani.
  const close = useCallback(() => setOpen(false), []);
  const finish = useCallback(() => {
    setOpen(false);
    setDone(true);
    // revalidatePath trenutne dinamične strani ne nariše znova.
    router.refresh();
  }, [router]);

  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => { setDone(false); setOpen(true); }}>
        <Link2 size={14} />
        {label}
      </button>
      {done && (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-label-2" role="status">
          <Check size={13} style={{ color: "var(--success)" }} />
          {t("issueLink.done")}
        </span>
      )}
      {open && (
        <Sheet title={t("issueLink.title")} subtitle={t("issueLink.subtitle")} onClose={close} width={640}>
          <LinkForm issueId={issueId} returns={returns} packages={packages} onCancel={close} onDone={finish} />
        </Sheet>
      )}
    </>
  );
}

function LinkForm({ issueId, returns, packages, onCancel, onDone }: {
  issueId: number;
  returns: OpenReturn[];
  packages: Packages;
  onCancel: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const [state, action] = useActionState(linkShipGermanParcelFromIssue, initial);
  const [record, setRecord] = useState(returns.length === 1 ? String(returns[0]!.id) : "");
  // En predlagan paket je skoraj zagotovo pravi; pri več predlogih izbere človek.
  const [choice, setChoice] = useState(packages.suggested.length === 1 ? packages.suggested[0]!.id : "");
  const [other, setOther] = useState("");
  const parcelId = choice === OTHER ? other : choice;

  const handled = useRef<IssueLinkState | null>(null);
  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    onDone();
  }, [state, onDone]);

  const nothing = packages.suggested.length === 0 && packages.other.length === 0;
  const single = returns.length === 1 ? returns[0]! : null;

  return (
    <form action={action} className="border-t" style={{ borderColor: "var(--rule)" }}>
      <input type="hidden" name="issueId" value={issueId} />
      <input type="hidden" name="shipgReturnId" value={record} />
      <input type="hidden" name="shipgermanParcelId" value={parcelId} />

      {!single && (
        <section className="grid gap-3 px-5 py-4">
          <h3 className="caption" style={{ color: "var(--ink)" }}>{t("issueLink.return")}</h3>
          <div role="radiogroup" aria-label={t("issueLink.return")} className="border" style={{ borderColor: "var(--rule-strong)" }}>
            {returns.map((item) => (
              <Choice key={item.id} value={String(item.id)} choice={record} onChoose={setRecord}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{item.contents || "—"}</span>
                  <span className="mono mt-0.5 block text-[11px] text-label-2">{t("issueLink.returnMeta", { round: item.round, date: item.added })}</span>
                </span>
              </Choice>
            ))}
          </div>
        </section>
      )}

      <section className={`grid gap-3 px-5 py-4${single ? "" : " border-t"}`} style={{ borderColor: "var(--rule)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="caption" style={{ color: "var(--ink)" }}>{t("round.return.package")}</h3>
          {packages.suggested.length > 0 && <p className="text-[11.5px] text-label-3">{t("issueLink.suggested")}</p>}
        </div>
        {single?.contents && <p className="text-[12px] text-label-2">{t("issueLink.forReturn", { contents: single.contents })}</p>}

        {nothing ? (
          <p className="text-[12.5px] text-label-2">{t("issueLink.none")}</p>
        ) : (
          <div role="radiogroup" aria-label={t("round.return.package")} className="border" style={{ borderColor: "var(--rule-strong)" }}>
            {packages.suggested.map((parcel) => (
              <Choice key={parcel.id} value={parcel.id} choice={choice} onChoose={setChoice}>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
                    <span className="truncate">{parcel.sender}</span>
                    {parcel.trackingMatch && (
                      <span className="caption shrink-0" style={{ color: "var(--success)" }}>{t("issueLink.trackingMatch")}</span>
                    )}
                  </span>
                  <span className="mono mt-0.5 block truncate text-[11px] text-label-2">
                    {[parcel.arrived, parcel.weight, parcel.tracking].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="mono shrink-0 text-[11px] text-label-3">ID {parcel.id}</span>
              </Choice>
            ))}
            {packages.other.length > 0 && (
              <Choice value={OTHER} choice={choice} onChoose={setChoice} label={t("round.return.packageOther")}>
                {choice === OTHER && (
                  <select value={other} required aria-label={t("round.return.packageOther")} onChange={(event) => setOther(event.target.value)} className="field">
                    <option value="">{t("round.return.packageOtherPick")}</option>
                    {packages.other.map((parcel) => (
                      <option key={parcel.id} value={parcel.id}>
                        {[parcel.sender, parcel.arrived, parcel.weight, parcel.tracking, `ID ${parcel.id}`].filter(Boolean).join(" · ")}
                      </option>
                    ))}
                  </select>
                )}
              </Choice>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: "var(--rule)" }}>
        {state.error && <div className="mr-auto"><Notice kind="error">{state.error}</Notice></div>}
        <button type="button" className="btn btn-sm" onClick={onCancel}>{t("common.cancel")}</button>
        <Submit disabled={nothing || !record || !parcelId} label={t("issueLink.submit")} busy={t("common.saving")} />
      </div>
    </form>
  );
}

function Submit({ disabled, label, busy }: { disabled: boolean; label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn btn-primary btn-sm">
      {pending ? busy : label}
    </button>
  );
}
