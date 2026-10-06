"use client";

import { useState } from "react";

import { usePriority, useTypeLabel } from "@/lib/config/client";
import { getStatus, SYSTEM_LEVEL, WAIT_PRESETS, waitDeadline } from "@/lib/domain";
import { initials } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

/**
 * Oznake v tem sistemu niso barvne pilule, ampak natisnjene rubrike: mono
 * majuskula v tankem okvirju. Vrsta težave, stanje in nivo se med sabo ločijo
 * po besedi in obliki, ne po odtenku — sedem barv za sedem vrst je bilo
 * ravno tisto, zaradi česar ni izstopalo nič.
 */

export function TypePill({ type }: { type: string }) {
  return <span className="pill">{useTypeLabel(type)}</span>;
}

/** Tudi brez barve oblika pove stanje: poln = v delu, prazen = čaka, pikčast = zaprto. */
export function StateMark({ status }: { status: string }) {
  const t = useT();
  const s = getStatus(status);
  return (
    <span
      className="state"
      data-state={s.id}
      style={{ color: s.color }}
      title={t(`status.${s.id}` as TranslationKey)}
      aria-hidden
    />
  );
}

export function StatusPill({ status, waitingUntil, waitingReply }: { status: string; waitingUntil?: Date | null; waitingReply?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const s = getStatus(status);
  const day = (value: Date) => new Date(value).toLocaleDateString(locale, { day: "numeric", month: "short" });
  // Čakanje na odgovor je drugačna obljuba kot rok: pove, kaj ga bo zbudilo.
  // Datum ob njem je le varovalo, zato stoji za oznako, ne namesto nje.
  const label =
    status !== "waiting"
      ? t(`status.${s.id}` as TranslationKey)
      : waitingReply
        ? (waitingUntil ? t("issue.waitReplyBy", { date: day(waitingUntil) }) : t("issue.waitReply"))
        : waitingUntil
          ? t("issue.waitUntil", { date: day(waitingUntil) })
          : t(`status.${s.id}` as TranslationKey);
  return (
    <span className="pill" style={{ color: s.color, borderColor: s.color }}>
      <span className="state" data-state={s.id} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

/** Nivo je usmeritvena rubrika — kam gre list naprej. Odprt nivo je odtisnjen. */
export function LevelPill({ level, muted }: { level: number; muted?: boolean }) {
  const t = useT();
  if (level === SYSTEM_LEVEL) {
    return (
      <span className="pill" title={t("level.systemHint")}>
        {t("level.system")}
      </span>
    );
  }
  return (
    <span className={muted ? "pill" : "pill pill-ink"} title={t("nav.level", { level })}>
      L{level}
    </span>
  );
}

export function PriorityDot({ priority, withLabel }: { priority: string; withLabel?: boolean }) {
  const t = useT();
  const p = usePriority(priority);
  const label = p?.label ?? priority;
  // Na listu se poteza pojavi samo nad normalo. Nizka in srednja prioriteta
  // nista sporočilo — če bi ju risali, bi poteza pomenila "prioriteta obstaja",
  // ne "tole je pred ostalimi".
  if ((priority === "medium" || priority === "low") && !withLabel) return null;

  // Prioriteta je poteza ob robu, ne kvadratek: kvadratek že nosi stanje in
  // dve enaki obliki ob isti številki se berejo kot ista stvar. Nujno je
  // edino, kar dobi rdeče pero.
  const urgent = priority === "urgent";
  return (
    <span className="inline-flex items-center gap-1.5" title={t("issue.priorityTitle", { priority: label })}>
      <span
        aria-hidden
        className="inline-block h-[11px] w-[2px] shrink-0"
        style={{ background: p?.color ?? "var(--ink-3)" }}
      />
      {withLabel && (
        <span className="text-[13px]" style={{ color: urgent ? "var(--stamp)" : "var(--ink-2)" }}>
          {label}
        </span>
      )}
    </span>
  );
}

/**
 * Nosilec primera, odtisnjen kot inicialki v kvadratku. Barve uporabnikov se
 * v tem sistemu ne izrisujejo — `color` ostaja v podpisu, ker ga hrani baza in
 * ga klicatelji podajajo, a znak je povsod isto črnilo.
 */
export function Avatar({
  name,
  color: _color,
  size = 26,
  ring,
  accent,
}: {
  name?: string | null;
  color?: string | null;
  size?: number;
  ring?: boolean;
  accent?: boolean;
}) {
  const t = useT();

  if (!name) {
    return (
      <span
        className="mono inline-flex shrink-0 items-center justify-center border border-dashed"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.4,
          borderColor: "var(--rule-strong)",
          color: "var(--ink-3)",
        }}
        title={t("common.unassigned")}
      >
        ·
      </span>
    );
  }

  // Poln odtis, ne okvir: prazen kvadratek z eno črko se je bral kot potrditveno
  // polje, ne kot človek, ki ima naročilo v rokah.
  return (
    <span
      className="mono inline-flex shrink-0 items-center justify-center font-medium"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        letterSpacing: "0.02em",
        background: accent ? "var(--petrol)" : "var(--ink)",
        color: "var(--sheet)",
        boxShadow: ring ? "0 0 0 2px var(--sheet)" : undefined,
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Rok čakanja: datum in predlogi ob njem. Rok ni samo zaznamek — ko poteče,
 * urnik naročilo sam vrne v delo (lib/waiting.ts), zato mora biti "čez teden
 * dni" en klik. Datum ostane viden in popravljiv, predlog ga samo napolni.
 */
export function WaitDeadlineField({ id, label }: { id: string; label: string }) {
  const t = useT();
  const [value, setValue] = useState("");

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name="waitingUntil"
        type="date"
        className="field"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="mt-1.5 flex flex-wrap gap-1">
        {WAIT_PRESETS.map((preset) => {
          const day = waitDeadline(preset.days);
          const active = value === day;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              // Ponoven klik na izbrani predlog rok umakne — brez iskanja, kako
              // izbiro razveljaviti.
              onClick={() => setValue(active ? "" : day)}
              className={active ? "btn btn-sm btn-primary" : "btn btn-sm"}
            >
              {t(`wait.preset.${preset.id}` as TranslationKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OutsiderTag() {
  const t = useT();
  return (
    <span className="pill pill-stamp" title={t("issue.externalHelp")}>
      {t("issue.external")}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-20 text-center">
      <p className="text-[15px] font-semibold tracking-[-0.012em]">{title}</p>
      {hint && <p className="max-w-[42ch] text-[13px] leading-relaxed text-label-2">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Obvestilo je zaznamek ob robu: navpična črta in besedilo, brez ploskve. */
export function Notice({ kind, children }: { kind: "error" | "ok"; children: React.ReactNode }) {
  const error = kind === "error";
  return (
    <p
      role={error ? "alert" : "status"}
      className="border-l-2 py-1 pl-2.5 text-[12.5px] font-medium"
      style={{
        borderColor: error ? "var(--stamp)" : "var(--success)",
        color: error ? "var(--stamp)" : "var(--success)",
      }}
    >
      {children}
    </p>
  );
}
