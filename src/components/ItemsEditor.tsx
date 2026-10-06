"use client";

import { useId, useState } from "react";
import { ChevronDown, PackageX, Plus, X } from "lucide-react";

import {
  catalogGroupOptions,
  catalogTitles,
  groupIdOfTitle,
  groupVariantsOf,
  imageOf,
  representativeTitleOf,
  optionsOf,
  priceOf,
  selectionOf,
  variantTitleOf,
  variantsOf,
} from "@/lib/catalog";
import { canonicalKey, canonicalLabel, canonicalVariantLabel } from "@/lib/catalog-canonical";
import { DEFAULT_CURRENCY, ITEM_RESOLUTIONS, MAX_ITEMS, PENDING_RESOLUTION, refundTotal } from "@/lib/domain";
import { itemPriceDiff, type PriceDiff } from "@/lib/exchange-price";
import { formatMoney } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

/**
 * Urejevalnik postavk naročila.
 *
 * Naročilo ima pogosto več artiklov, težava pa se tiče samo enega — zato ima
 * vsaka vrstica svojo rešitev. Vrstice se pošljejo kot vzporedni seznami
 * (`item.name`, `item.variant`, …), kar zna prebrati src/lib/items.ts.
 */

export type EditableItem = {
  /** Samo za Reactov `key` — v obrazec ne gre. */
  uid: string;
  name: string;
  variant: string;
  replacementVariant: string;
  /** Drug izdelek, v katerega se menja. Prazno = menjava znotraj istega izdelka. */
  replacementName: string;
  replacementSelection: Record<string, string>;
  /** Razlika v ceni menjave v drug izdelek je urejena. */
  priceDiffSettled: boolean;
  /** Skladišče je poslalo drug kos. `name`/`variant` sta takrat prejeti kos,
   *  `orderedName`/`orderedVariant` pa to, kar je stranka naročila. */
  wrongItemSent: boolean;
  orderedName: string;
  orderedVariant: string;
  /** Imenovane Shopifyjeve opcije (barva, velikost, spol …). */
  selection: Record<string, string>;
  qty: string;
  amount: string;
  resolution: string;
};

let seq = 0;

export function newItem(fields: Partial<EditableItem> = {}): EditableItem {
  const name = fields.name ?? "";
  const variant = fields.variant ?? "";
  return {
    uid: `n${++seq}`,
    name,
    variant,
    selection: fields.selection ?? selectionOf(name, variant),
    replacementVariant: fields.replacementVariant ?? "",
    replacementName: fields.replacementName ?? "",
    replacementSelection:
      fields.replacementSelection ??
      selectionOf(fields.replacementName || name, fields.replacementVariant ?? ""),
    priceDiffSettled: fields.priceDiffSettled ?? false,
    wrongItemSent: false,
    orderedName: "",
    orderedVariant: "",
    qty: "1",
    amount: "",
    resolution: "refund",
    ...fields,
  };
}

export function ItemsEditor({
  items,
  onChange,
  currency = DEFAULT_CURRENCY,
  disabled,
}: {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  /** Valuta naročila; zneski se ne pretvarjajo. */
  currency?: string;
  disabled?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const productsId = useId();

  const patch = (uid: string, fields: Partial<EditableItem>) =>
    onChange(items.map((item) => (item.uid === uid ? { ...item, ...fields } : item)));

  // Ista pravila kot na strežniku (glej refundTotal v domain.ts).
  const total = refundTotal(
    items.map((item) => {
      const amount = Number(item.amount.replace(",", "."));
      return {
        resolution: item.resolution,
        amount: item.amount.trim() !== "" && Number.isFinite(amount) ? amount : null,
      };
    }),
  );

  return (
    <div>
      {/* Brez tega strežnik ne ve, ali obrazec postavke sploh ureja. */}
      <input type="hidden" name="itemsPresent" value="1" />

      <datalist id={productsId}>
        {catalogTitles().map((title) => (
          <option key={title} value={title} />
        ))}
      </datalist>

      {items.length === 0 ? (
        <p className="py-2 text-[12.5px] text-label-3">{t("items.emptyHint")}</p>
      ) : (
        // Vrstice loči črta, ne okvir: okvir v okvirju v okvirju je bil
        // tri škatle globoko za en artikel.
        <ul>
          {items.map((item, index) => (
            <Row
              key={item.uid}
              item={item}
              index={index}
              productsId={productsId}
              currency={currency}
              disabled={disabled}
              onPatch={(fields) => patch(item.uid, fields)}
              onRemove={() => onChange(items.filter((i) => i.uid !== item.uid))}
            />
          ))}
        </ul>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          type="button"
          onClick={() => onChange([...items, newItem()])}
          disabled={disabled || items.length >= MAX_ITEMS}
          className="btn btn-sm"
        >
          <Plus size={13} />
          {t("items.add")}
        </button>

        {total != null && (
          <span className="mono text-[12px] text-label-2">
            {t("items.refundTotal", { amount: formatMoney(total, currency, locale) })}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Sličica izdelka s Shopifyjevega CDN-ja (glej imageOf v catalog.ts).
 * Prostor zavzame tudi brez slike, da se vrstice poravnajo.
 */
function Thumb({ title, selection }: { title: string; selection: Record<string, string> }) {
  const src = imageOf(title, 96, selection);

  return (
    <span
      aria-hidden
      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden border"
      style={{ borderColor: "var(--separator)", background: "var(--surface)" }}
    >
      {src && (
        // Navaden <img>: CDN sliko že skalira, zato je optimizacija v Next.js
        // odveč, obenem pa ne pošiljamo prometa čez svoj strežnik.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

function Row({
  item,
  index,
  productsId,
  currency,
  disabled,
  onPatch,
  onRemove,
}: {
  item: EditableItem;
  index: number;
  productsId: string;
  currency: string;
  disabled?: boolean;
  onPatch: (fields: Partial<EditableItem>) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const options = optionsOf(item.name, item.variant);
  // Kanonične variante za izbiro nadomestka: iste fizične variante med IT in
  // DACH trgom (in oba spola pri TrailShield) se zložijo v eno vrstico. Shrani se
  // konkreten Shopify naziv, da ujemanje in slika delujeta naprej.
  // Nadomestek ni nujno isti izdelek: stranka lahko vrnjene hlače menja za
  // jeans. Privzeto je isti izdelek, zato je `replacementName` prazen.
  const replacementProduct = item.replacementName || item.name;
  // Izbira teče po skupinah iz admina — "TrailShield hlače", ne dvanajst nazivov
  // istih hlač po trgih in barvah. Shrani se konkreten Shopifyjev naziv, ki
  // izbrano varianto res nosi (glej catalog.ts).
  const replacementGroup = replacementProduct ? groupIdOfTitle(replacementProduct) : "";
  // Naziv gre tudi v pismo stranki, zato ima prednost trg, na katerem je
  // stranka naročila.
  const replacementOptions = replacementGroup ? groupVariantsOf(replacementGroup, item.name) : [];
  const selectedReplacement = item.replacementVariant
    ? replacementOptions.find((option) => option.key === canonicalKey(replacementProduct, item.replacementVariant))?.key ?? ""
    : "";
  // Izdelka se ne tipka: ime mora biti natanko Shopifyjevo, sicer ga ujemanje
  // zaloge in slike ne najdejo. Kar je v vrstici že zapisano, ostane na voljo
  // tudi, kadar tega v katalogu ni (ročni vnos, star zapis, umaknjen izdelek).
  const replacementChoices = (() => {
    const options = catalogGroupOptions();
    const known = new Set(options.map((option) => option.id));
    const extra = [item.name, item.replacementName]
      .filter((title): title is string => Boolean(title))
      .filter((title) => !known.has(groupIdOfTitle(title)))
      .map((title) => ({ id: groupIdOfTitle(title), label: title }));
    return [...new Map([...extra, ...options].map((option) => [option.id, option])).values()];
  })();
  const priceDiff = itemPriceDiff(
    { name: item.name, qty: Number(item.qty) || 1, resolution: item.resolution, replacementName: item.replacementName },
    currency,
  );
  const [expanded, setExpanded] = useState(!item.name);
  // Izbira prejetega kosa pri napačno poslanem artiklu.
  const [wrongOpen, setWrongOpen] = useState(false);
  const [wrongGroup, setWrongGroup] = useState("");
  const [wrongKey, setWrongKey] = useState("");
  const wrongOptions = wrongGroup ? groupVariantsOf(wrongGroup, item.name) : [];
  const detailsId = `${productsId}-details-${index}`;

  // Artikel brez ukrepa je v naročilu samo za kontekst — naj ne vleče pogleda.
  const muted = item.resolution === "none";
  const pending = item.resolution === PENDING_RESOLUTION;
  // "Še ne vemo" je odločitev, da počakamo stranko — vidna, da ne ostane pozabljena.
  const undecided = item.resolution === "undecided";
  const visibleSize = item.selection.size?.trim();

  function pickProduct(name: string) {
    // Katalog je izvožen v evrih. Pri naročilu v drugi valuti cene ne
    // predlagamo — 129 bi bilo videti kot znesek, v resnici pa bi bil frank
    // zamenjan za evro.
    const price = currency === DEFAULT_CURRENCY ? priceOf(name) : null;
    const qty = Number(item.qty) || 1;
    const selection = selectionOf(name, item.variant);
    onPatch({
      name,
      // Cena iz kataloga je predlog; kar je človek že vpisal, ostane.
      amount: !item.amount && price != null ? String(price * qty) : item.amount,
      variant: variantTitleOf(name, selection),
      selection,
      replacementVariant: "",
      replacementName: "",
      replacementSelection: {},
      priceDiffSettled: false,
    });
  }

  function pickOption(key: string, value: string) {
    const selection = { ...item.selection, [key]: value };
    onPatch({ selection, variant: variantTitleOf(item.name, selection) });
  }

  function pickResolution(resolution: string) {
    if (resolution === "exchange" && !item.replacementVariant) {
      onPatch({
        resolution,
        replacementVariant: item.variant,
        replacementSelection: { ...item.selection },
      });
      return;
    }
    onPatch({ resolution });
  }

  /** Izbrana varianta pove tudi izdelek: barva je pri nas varianta, v Shopifyju
   *  pa pogosto svoj izdelek. Zapiše se tisti, ki varianto res nosi. */
  function pickReplacementVariant(key: string) {
    const chosen = replacementOptions.find((option) => option.key === key);
    if (!chosen) {
      onPatch({ replacementVariant: "", replacementSelection: {} });
      return;
    }
    const sameAsReturned = groupIdOfTitle(chosen.title) === groupIdOfTitle(item.name);
    onPatch({
      replacementName: sameAsReturned ? "" : chosen.title,
      replacementVariant: chosen.variant,
      replacementSelection: selectionOf(chosen.title, chosen.variant),
    });
  }

  /** Druga skupina izdelkov za nadomestek. Varianta se zavrže — velikosti in
   *  barve se med izdelki ne ujemajo, izbrati jo je treba znova. Potrjena
   *  razlika v ceni prav tako odpade: cena novega izdelka je druga. */
  function pickReplacementGroup(id: string) {
    const same = id === groupIdOfTitle(item.name);
    onPatch({
      replacementName: same ? "" : representativeTitleOf(id, item.name),
      replacementVariant: same ? item.variant : "",
      replacementSelection: same ? { ...item.selection } : {},
      priceDiffSettled: false,
    });
  }

  function openWrong() {
    setWrongGroup(groupIdOfTitle(item.name));
    setWrongKey("");
    setWrongOpen(true);
  }

  /** Prejeti kos postane postavka — tega ima stranka in tega bo vrnila, zato ga
   *  ShipG pričakuje in vpiše v zalogo. Naročeni kos ostane zapisan in postane
   *  nadomestek, ki ji ga dolgujemo. */
  function markWrong() {
    const chosen = wrongOptions.find((option) => option.key === wrongKey);
    if (wrongOptions.length > 0 && !chosen) return;
    // Naziv gre v pismo stranki: ostane naziv iz naročila (trg stranke), kadar
    // ta izdelek izbrano varianto ima — sicer tisti, ki jo nosi.
    // Kanonični ključ spola ne loči: med enakimi kosi ima prednost tisti z
    // istimi ostalimi opcijami (spol) kot naročeni.
    const matches = chosen ? variantsOf(item.name).filter((option) => canonicalKey(item.name, option.title) === chosen.key) : [];
    const sameOptions = (option: (typeof matches)[number]) =>
      Object.entries(option.selection ?? {}).filter(([key, value]) => item.selection[key] === value).length;
    const own = [...matches].sort((a, b) => sameOptions(b) - sameOptions(a))[0];
    const name = own ? item.name : chosen?.title ?? representativeTitleOf(wrongGroup, item.name);
    const variant = own ? own.title : chosen?.variant ?? "";
    const sameProduct = groupIdOfTitle(name) === groupIdOfTitle(item.name);
    onPatch({
      wrongItemSent: true,
      orderedName: item.name,
      orderedVariant: item.variant,
      name,
      variant,
      selection: selectionOf(name, variant),
      resolution: "exchange",
      replacementName: sameProduct ? "" : item.name,
      replacementVariant: item.variant,
      replacementSelection: { ...item.selection },
      priceDiffSettled: false,
    });
    setWrongOpen(false);
  }

  function unmarkWrong() {
    const name = item.orderedName || item.name;
    const variant = item.orderedVariant;
    onPatch({
      wrongItemSent: false,
      orderedName: "",
      orderedVariant: "",
      name,
      variant,
      selection: selectionOf(name, variant),
      replacementName: "",
      replacementVariant: "",
      replacementSelection: {},
      priceDiffSettled: false,
    });
  }

  const sameWrongProduct = item.wrongItemSent && groupIdOfTitle(item.orderedName) === groupIdOfTitle(item.name);
  const wrongLabel = (name: string, variant: string) =>
    (sameWrongProduct ? canonicalVariantLabel(name, variant || null) : canonicalLabel(name, variant || null)) || name;

  const optionLabel = (key: string, fallback: string) => {
    if (key === "color" || key === "size" || key === "gender") {
      return t(`items.${key}` as TranslationKey);
    }
    return fallback;
  };

  return (
    <li
      className="py-2.5 first:pt-0 [&+li]:border-t"
      style={{ borderColor: "var(--rule)", opacity: muted ? 0.62 : 1 }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <Thumb title={item.name} selection={item.selection} />
        <label className="min-w-[220px] flex-1">
          <span className="flex min-h-[17px] items-start justify-between gap-2">
            <span className="field-label mb-0">{t("items.product")}</span>
            {visibleSize && (
              <span className="item-size-mark" title={`${t("items.size")}: ${visibleSize}`}>
                <span>{t("items.size")}</span>
                <strong>{visibleSize}</strong>
              </span>
            )}
          </span>
          <input
            name="item.name"
            value={item.name}
            onChange={(e) => pickProduct(e.target.value)}
            list={productsId}
            maxLength={200}
            disabled={disabled}
            placeholder={t("items.productPlaceholder")}
            className="field"
          />
        </label>

        <label className="w-[110px]">
          <span className="field-label">{t("items.amount")}</span>
          <input
            name="item.amount"
            value={item.amount}
            onChange={(e) => onPatch({ amount: e.target.value })}
            inputMode="decimal"
            maxLength={20}
            disabled={disabled}
            className="field mono"
          />
        </label>

        <label className="min-w-[150px] flex-1 sm:max-w-[190px]">
          <span className="field-label" style={pending ? { color: "var(--warning)" } : undefined}>
            {pending ? t("items.resolutionRequired") : t("items.resolution")}
          </span>
          <select
            name="item.resolution"
            value={item.resolution}
            onChange={(e) => pickResolution(e.target.value)}
            disabled={disabled}
            aria-invalid={pending || undefined}
            className="field"
            style={pending || undecided ? { borderColor: "var(--warning)" } : undefined}
          >
            {/* Sistemski ticket: rešitev je prazna, dokler je človek ne izbere. */}
            {/* Ne `disabled`: izbrana onemogočena možnost se z obrazcem ne pošlje,
                vzporedni seznami se zamaknejo in vrstica dobi tujo rešitev. */}
            {pending && <option value={PENDING_RESOLUTION} hidden></option>}
            {ITEM_RESOLUTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(`res.${option.id}` as TranslationKey)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          disabled={disabled}
          aria-expanded={expanded}
          aria-controls={detailsId}
          className="btn btn-sm shrink-0"
        >
          {expanded ? t("items.hideDetails") : t("items.showDetails")}
          <ChevronDown
            size={13}
            aria-hidden
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Baza zaradi združljivosti še vedno hrani en sestavljen niz. Vmesnik
          pa ga razdeli po dejanskih Shopifyjevih opcijah. */}
      <input type="hidden" name="item.variant" value={item.variant} disabled={disabled} />
      <input type="hidden" name="item.replacementVariant" value={item.replacementVariant} disabled={disabled} />
      <input type="hidden" name="item.replacementName" value={item.replacementName} disabled={disabled} />
      <input type="hidden" name="item.priceDiffSettled" value={item.priceDiffSettled ? "1" : ""} disabled={disabled} />
      <input type="hidden" name="item.wrongItemSent" value={item.wrongItemSent ? "1" : ""} disabled={disabled} />
      <input type="hidden" name="item.orderedName" value={item.wrongItemSent ? item.orderedName : ""} disabled={disabled} />
      <input type="hidden" name="item.orderedVariant" value={item.wrongItemSent ? item.orderedVariant : ""} disabled={disabled} />

      {item.wrongItemSent && (
        <div
          className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border px-2.5 py-2"
          style={{ borderColor: "var(--warning)", background: "var(--warning-wash)" }}
        >
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]" style={{ color: "var(--warning)" }}>
            <PackageX size={14} aria-hidden className="shrink-0" />
            <strong className="caption" style={{ color: "var(--warning)" }}>{t("items.wrong.badge")}</strong>
            <span>
              {t("items.wrong.ordered")}: <strong>{wrongLabel(item.orderedName, item.orderedVariant)}</strong>
              {" · "}
              {t("items.wrong.received")}: <strong>{wrongLabel(item.name, item.variant)}</strong>
            </span>
          </span>
          <button type="button" onClick={unmarkWrong} disabled={disabled} className="btn btn-sm">
            {t("items.wrong.unmark")}
          </button>
        </div>
      )}

      {item.resolution === "exchange" && (
        <div className="mt-2 min-w-0 border-t pt-2" style={{ borderColor: "var(--petrol-rule)" }}>
          <span className="caption mb-2 block" style={{ color: "var(--petrol)" }}>{t("items.replacementTarget")}</span>

          <div className="grid gap-2 sm:grid-cols-2">
            {/* Izdelek nadomestka: privzeto isti, a menjava za drug kos je
                pogosta dovolj, da mora biti na dosegu — ne skrita v podrobnostih. */}
            <label className="min-w-0">
              <span className="field-label">{t("items.replacementProduct")}</span>
              <select
                value={replacementGroup}
                onChange={(event) => pickReplacementGroup(event.target.value)}
                disabled={disabled}
                className="field"
              >
                {/* Vrstica brez izdelka: izbirati ni med čim, dokler ni artikla. */}
                {!replacementGroup && <option value="">{t("items.replacementChooseProduct")}</option>}
                {replacementChoices.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="field-label">{t("items.replacementVariantLabel")}</span>
              {replacementOptions.length > 0 ? (
                <select
                  value={selectedReplacement}
                  onChange={(event) => pickReplacementVariant(event.target.value)}
                  disabled={disabled}
                  className="field mono"
                >
                  <option value="">{t("items.replacementChoose")}</option>
                  {replacementOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={item.replacementVariant}
                  onChange={(event) => onPatch({ replacementVariant: event.target.value, replacementSelection: {} })}
                  maxLength={120}
                  disabled={disabled}
                  placeholder={t("items.replacementVariant")}
                  className="field mono"
                />
              )}
            </label>
          </div>

          {priceDiff.kind !== "none" && (
            <PriceDiffNote
              diff={priceDiff}
              currency={currency}
              settled={item.priceDiffSettled}
              disabled={disabled}
              onSettle={(settled) => onPatch({ priceDiffSettled: settled })}
            />
          )}
        </div>
      )}

      <div
        id={detailsId}
        hidden={!expanded}
        className="mt-2 border-t pt-2"
        style={{ borderColor: "var(--rule)" }}
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
          {options.length > 0 ? (
            options.map((option) => {
              const current = item.selection[option.key] ?? "";
              // Vrednosti se ne tipka — velikost mora biti natanko Shopifyjeva.
              // Kar je že zapisano, a ga v katalogu ni, ostane izbrano.
              const values = current && !option.values.includes(current)
                ? [current, ...option.values]
                : option.values;
              return (
                <label key={option.key} className="min-w-0">
                  <span className="field-label">{optionLabel(option.key, option.label)}</span>
                  <select
                    value={current}
                    onChange={(event) => pickOption(option.key, event.target.value)}
                    disabled={disabled}
                    className="field"
                  >
                    {!current && <option value="" />}
                    {values.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              );
            })
          ) : (
            <label className="min-w-0">
              <span className="field-label">{t("items.variant")}</span>
              <input
                value={item.variant}
                onChange={(event) => onPatch({ variant: event.target.value, selection: {} })}
                maxLength={120}
                disabled={disabled}
                className="field"
              />
            </label>
          )}

          <label className="min-w-0">
            <span className="field-label">{t("items.qty")}</span>
            <input
              name="item.qty"
              value={item.qty}
              onChange={(e) => onPatch({ qty: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              inputMode="numeric"
              disabled={disabled}
              className="field mono text-center"
            />
          </label>
        </div>

        {wrongOpen && (
          <div className="mt-2 border px-2.5 py-2" style={{ borderColor: "var(--warning)", background: "var(--warning-wash)" }}>
            <span className="caption mb-1 block" style={{ color: "var(--warning)" }}>{t("items.wrong.question")}</span>
            <p className="mb-2 text-[12px] text-label-2">{t("items.wrong.hint")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="min-w-0">
                <span className="field-label">{t("items.replacementProduct")}</span>
                <select
                  value={wrongGroup}
                  onChange={(event) => { setWrongGroup(event.target.value); setWrongKey(""); }}
                  disabled={disabled}
                  className="field"
                >
                  {replacementChoices.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              {wrongOptions.length > 0 && (
                <label className="min-w-0">
                  <span className="field-label">{t("items.replacementVariantLabel")}</span>
                  <select
                    value={wrongKey}
                    onChange={(event) => setWrongKey(event.target.value)}
                    disabled={disabled}
                    className="field mono"
                  >
                    <option value="">{t("items.wrong.choose")}</option>
                    {wrongOptions.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setWrongOpen(false)} disabled={disabled} className="btn btn-sm">
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={markWrong}
                disabled={disabled || (wrongOptions.length > 0 && !wrongKey)}
                className="btn btn-sm btn-primary"
              >
                {t("items.wrong.confirm")}
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {item.name && !item.wrongItemSent && !wrongOpen && (
            <button type="button" onClick={openWrong} disabled={disabled} className="btn btn-sm mr-auto">
              <PackageX size={13} />
              {t("items.wrong.mark")}
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="btn btn-sm btn-destructive"
          >
            <X size={13} />
            {t("items.remove")}
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * Razlika v ceni menjave v drug izdelek. Ticket je ne pobira in ne vrača —
 * pove, koliko je, in zahteva, da nekdo potrdi, da je urejena. Dokler ni,
 * menjave ni mogoče rezervirati iz ShipGerman zaloge.
 */
function PriceDiffNote({
  diff,
  currency,
  settled,
  disabled,
  onSettle,
}: {
  diff: PriceDiff;
  currency: string;
  settled: boolean;
  disabled?: boolean;
  onSettle: (settled: boolean) => void;
}) {
  const t = useT();
  const locale = useLocale();

  const text =
    diff.kind === "unknown"
      ? t("items.priceDiffUnknown")
      : diff.kind === "diff" && diff.amount > 0
        ? t("items.priceDiffSurcharge", { amount: formatMoney(diff.amount, currency, locale) })
        : diff.kind === "diff"
          ? t("items.priceDiffRefund", { amount: formatMoney(Math.abs(diff.amount), currency, locale) })
          : "";

  return (
    <div
      className="mt-2 flex flex-wrap items-center justify-between gap-2 border px-2.5 py-2"
      style={{
        borderColor: settled ? "var(--rule)" : "var(--warning)",
        background: settled ? undefined : "var(--warning-wash)",
      }}
    >
      <span className="text-[12.5px]" style={{ color: settled ? "var(--ink-2)" : "var(--warning)" }}>
        {text}
      </span>
      <label className="flex items-center gap-1.5 text-[12px]">
        <input
          type="checkbox"
          checked={settled}
          disabled={disabled}
          onChange={(event) => onSettle(event.target.checked)}
        />
        {t("items.priceDiffSettled")}
      </label>
    </div>
  );
}
