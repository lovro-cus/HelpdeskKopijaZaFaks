"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useTypes } from "@/lib/config/client";
import { labelOf } from "@/lib/config/shared";
import { getStatus, SYSTEM_LEVEL } from "@/lib/domain";
import { useT } from "@/lib/i18n/client";
import { looksLikeOrderNumber, orderNumberKey } from "@/lib/order-number";
import { ALL_SCOPES, SEARCH_SCOPES, scopeParam, type SearchScope } from "@/lib/search-scope";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { StateMark } from "./ui";

type SearchResult = {
  id: number;
  key: string;
  orderNumber: string;
  title: string | null;
  type: string;
  status: string;
  level: number;
  customerName: string | null;
  assigneeName: string | null;
};

type SearchPhase = "idle" | "loading" | "ready" | "error";

/** Izbrana polja iskanja — udobje enega brskalnika, ne skupna nastavitev. */
const SCOPE_STORAGE = "helpdesk.searchScopes";

/**
 * Iskalnik v glavi. Kadar zadetkov ni, ponudi odpiranje ticketa za iskano
 * številko: največkrat se išče prav zato, ker naročilo še nima ticketa, in
 * prepisovanje številke v nov obrazec je odveč.
 */
export function OrderSearch({ onCreate }: { onCreate?: (orderNumber: string) => void }) {
  const t = useT();
  const types = useTypes();
  const router = useRouter();
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [scopes, setScopes] = useState<SearchScope[]>(ALL_SCOPES);
  const [filterOpen, setFilterOpen] = useState(false);

  const trimmed = query.trim();
  const narrowed = scopes.length < SEARCH_SCOPES.length;
  const scopeQuery = scopeParam(scopes);

  // Izbor je udobje tega brskalnika, ne podatek: če ga ni ali se ne da brati,
  // se išče po vsem, kakor doslej.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SCOPE_STORAGE);
      if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        const valid = Array.isArray(parsed)
          ? (parsed.filter((item) => SEARCH_SCOPES.includes(item as SearchScope)) as SearchScope[])
          : [];
        if (valid.length > 0) setScopes(valid);
      }
    } catch {
      // Zasebno okno ali zavrnjena shramba: privzetek je že nastavljen.
    }
  }, []);

  function toggleScope(scope: SearchScope) {
    setScopes((current) => {
      // Brez enega samega polja iskanje ne bi vrnilo nikoli ničesar in bi bilo
      // videti kot okvara — zadnje kljukice zato ni mogoče odstraniti.
      const next = current.includes(scope)
        ? current.length > 1 ? current.filter((item) => item !== scope) : current
        : [...current, scope];
      try {
        window.localStorage.setItem(SCOPE_STORAGE, JSON.stringify(next));
      } catch {
        // Izbor obvelja za to sejo, tudi kadar shramba ni na voljo.
      }
      return next;
    });
  }

  useEffect(() => {
    function onGlobalKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setPhase("idle");
      setOpen(false);
      setActive(-1);
      return;
    }

    const controller = new AbortController();
    setOpen(true);
    setPhase("loading");
    setActive(-1);

    const timer = window.setTimeout(async () => {
      try {
        const url = `/api/orders/search?q=${encodeURIComponent(trimmed)}${scopeQuery ? `&in=${scopeQuery}` : ""}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Search failed");
        const body = (await response.json()) as { results?: SearchResult[] };
        setResults(body.results ?? []);
        setPhase("ready");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setResults([]);
        setPhase("error");
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, scopeQuery]);

  function close() {
    setOpen(false);
    setActive(-1);
    setFilterOpen(false);
  }

  function clear() {
    setQuery("");
    setResults([]);
    setPhase("idle");
    setOpen(false);
    inputRef.current?.focus();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const target = results[active] ?? results[0];
    if (!target) return;
    close();
    inputRef.current?.blur();
    router.push(`/orders/${target.key}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      inputRef.current?.blur();
      return;
    }
    if (results.length === 0 || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
    event.preventDefault();
    setOpen(true);
    const step = event.key === "ArrowDown" ? 1 : -1;
    setActive((current) => {
      if (current === -1) return step === 1 ? 0 : results.length - 1;
      return (current + step + results.length) % results.length;
    });
  }

  return (
    <form
      ref={rootRef}
      onSubmit={submit}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) close();
      }}
      className="relative ml-auto max-w-[300px] flex-1"
      role="search"
    >
      <Search
        size={13}
        className="pointer-events-none absolute left-2 top-[14px] -translate-y-1/2 text-label-3"
      />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => trimmed && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t("nav.search")}
        aria-label={t("nav.searchLabel")}
        aria-expanded={open}
        aria-controls="order-search-popup"
        aria-haspopup="listbox"
        aria-activedescendant={active >= 0 ? `order-search-result-${results[active]?.id}` : undefined}
        aria-autocomplete="list"
        role="combobox"
        autoComplete="off"
        className="field h-[28px] text-[12.5px]"
        style={{ paddingLeft: 26, paddingRight: query ? 28 : 9 }}
      />

      {query && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-[25px] top-[3px] inline-flex h-[22px] w-[22px] items-center justify-center text-label-3 hover:text-label"
          aria-label={t("nav.clearSearch")}
        >
          <X size={13} />
        </button>
      )}

      {/* Filter stoji v polju, ne ob njem: pove, kaj bo to polje prebrskalo,
          in zožen izbor mora biti viden, sicer prazen zadetek zavaja. */}
      <button
        type="button"
        onClick={() => setFilterOpen((value) => !value)}
        aria-expanded={filterOpen}
        aria-haspopup="true"
        aria-label={t("nav.searchScope")}
        title={t("nav.searchScope")}
        className="absolute right-1 top-[3px] inline-flex h-[22px] w-[22px] items-center justify-center hover:text-label"
        style={{ color: narrowed ? "var(--petrol)" : "var(--ink-3)" }}
      >
        <SlidersHorizontal size={13} />
      </button>

      {filterOpen && (
        <div className="search-popover card animate-in overflow-hidden" style={{ boxShadow: "var(--shadow-3)" }}>
          <div className="border-b px-3 py-2">
            <span className="caption" style={{ color: "var(--ink-2)" }}>{t("nav.searchScope")}</span>
          </div>
          <div className="grid p-1">
            {SEARCH_SCOPES.map((scope) => (
              <label key={scope} className="flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] hover:bg-fill">
                <input
                  type="checkbox"
                  checked={scopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                />
                {t(`nav.searchScope.${scope}` as TranslationKey)}
              </label>
            ))}
          </div>
          <div className="hairline flex justify-end px-2.5 py-2">
            <button
              type="button"
              onClick={() => {
                setScopes(ALL_SCOPES);
                try {
                  window.localStorage.removeItem(SCOPE_STORAGE);
                } catch {
                  // Brez shrambe izbor velja samo za to sejo.
                }
              }}
              disabled={!narrowed}
              className="btn btn-sm"
            >
              {t("nav.searchScopeAll")}
            </button>
          </div>
        </div>
      )}

      {open && trimmed && !filterOpen && (
        <div
          id="order-search-popup"
          className="search-popover card animate-in overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="caption" style={{ color: "var(--ink-2)" }}>
              {t("nav.searchOrders")}
            </span>
            {phase === "ready" && (
              <span className="mono text-[10px] text-label-3">{results.length}</span>
            )}
          </div>

          {phase === "loading" && <SearchMessage>{t("nav.searchLoading")}</SearchMessage>}
          {phase === "error" && <SearchMessage error>{t("nav.searchError")}</SearchMessage>}
          {phase === "ready" && results.length === 0 && (
            <div className="px-4 py-5 text-center">
              <p role="status" className="text-[12px]" style={{ color: "var(--ink-2)" }}>
                {t("nav.searchEmpty", { query: trimmed })}
              </p>
              {onCreate && looksLikeOrderNumber(trimmed) && (
                <button
                  type="button"
                  // onMouseDown: klik ne sme najprej sprožiti onBlur obrazca, ki
                  // bi seznam zaprl, preden gumb sploh dobi klik.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const order = orderNumberKey(trimmed);
                    clear();
                    inputRef.current?.blur();
                    onCreate(order);
                  }}
                  className="btn btn-primary btn-sm mt-3"
                >
                  <Plus size={13} />
                  {t("nav.searchCreate", { order: orderNumberKey(trimmed) })}
                </button>
              )}
            </div>
          )}

          {phase === "ready" && results.length > 0 && (
            <div
              id="order-search-results"
              className="max-h-[360px] overflow-y-auto p-1 scroll-thin"
              role="listbox"
              aria-label={t("nav.searchResults")}
            >
              {results.map((result, index) => {
                const typeLabel = labelOf(types, result.type);
                const status = getStatus(result.status);
                const title =
                  result.title ??
                  `${typeLabel} — ${t("issue.order")} #${result.orderNumber}`;
                const meta = [
                  result.customerName,
                  result.assigneeName,
                  result.level === SYSTEM_LEVEL ? t("level.system") : t("nav.searchLevel", { level: result.level }),
                  result.key,
                ].filter(Boolean);

                return (
                  <Link
                    key={result.id}
                    id={`order-search-result-${result.id}`}
                    href={`/orders/${result.key}`}
                    role="option"
                    aria-selected={active === index}
                    data-active={active === index}
                    onMouseEnter={() => setActive(index)}
                    onClick={close}
                    className="search-result flex items-start gap-2.5 px-2.5 py-2"
                  >
                    <StateMark status={status.id} />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <strong className="mono shrink-0 text-[12.5px]">#{result.orderNumber}</strong>
                        <span className="truncate text-[12.5px] font-medium">{title}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-label-2">
                        {meta.join(" · ")}
                      </span>
                    </span>
                    <span className="pill shrink-0" style={{ color: status.color, borderColor: status.color }}>
                      {t(`status.${status.id}` as TranslationKey)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </form>
  );
}

function SearchMessage({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p
      role={error ? "alert" : "status"}
      className="px-4 py-6 text-center text-[12px]"
      style={{ color: error ? "var(--stamp)" : "var(--ink-2)" }}
    >
      {children}
    </p>
  );
}
