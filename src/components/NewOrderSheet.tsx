"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, ChevronDown } from "lucide-react";

import { createIssue, reopenDuplicateIssue, type FormState } from "@/lib/actions/issues";
import type { SessionUser } from "@/lib/auth";
import { usePriorityOptions, useTypeOptions } from "@/lib/config/client";
import { COMMON_CURRENCIES, DEFAULT_CURRENCY } from "@/lib/domain";
import { priorityForPayment, type PaymentInfo } from "@/lib/payment";
import { AttachmentPicker } from "./AttachmentPicker";
import { EmailConversation } from "./EmailConversation";
import { ItemsEditor, newItem, type EditableItem } from "./ItemsEditor";
import { Sheet } from "./Sheet";
import { Notice } from "./ui";
import { PaymentMethod } from "./PaymentMethod";
import { useT } from "@/lib/i18n/client";

export type PickableUser = { id: string; name: string; level: number; color: string };

const initial: FormState = {};

export function NewOrderSheet({
  me,
  users,
  onClose,
  orderNumber: initialOrderNumber = "",
}: {
  me: SessionUser;
  users: PickableUser[];
  onClose: () => void;
  /** Številka, s katero se predal odpre — iz iskanja, ki zanjo ni našlo ticketa. */
  orderNumber?: string;
}) {
  const t = useT();
  const typeOptions = useTypeOptions();
  const [shopifyStatus, setShopifyStatus] = useState({ financial: "", fulfillment: "" });
  const priorityOptions = usePriorityOptions();
  const router = useRouter();
  const [state, action] = useActionState(createIssue, initial);
  const [reopening, startReopening] = useTransition();
  const [type, setType] = useState("");
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [customerEmail, setCustomerEmail] = useState("");
  const [typeError, setTypeError] = useState(false);
  const [missingCustomer, setMissingCustomer] = useState(false);
  const [more, setMore] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [priority, setPriority] = useState("medium");
  const [payment, setPayment] = useState<PaymentInfo>({ method: null, brand: null, last4: null });
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);
  const [duplicateActionError, setDuplicateActionError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const typeSectionRef = useRef<HTMLFieldSetElement>(null);
  const shopifyFillRef = useRef<HTMLButtonElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const missingCustomerDialogRef = useRef<HTMLDivElement>(null);
  const allowWithoutCustomer = useRef(false);
  // Naročilo obdrži valuto, v kateri je bilo plačano; ročni vnos je v evrih.
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

  // Predal, odprt iz iskanja, že pozna številko — podatke naročila potegnemo
  // takoj, da človeku ni treba klikniti še enkrat tistega, kar je že povedal.
  useEffect(() => {
    if (!initialOrderNumber) return;
    setMore(true);
    const timer = window.setTimeout(() => shopifyFillRef.current?.click(), 0);
    return () => window.clearTimeout(timer);
  }, [initialOrderNumber]);

  useEffect(() => {
    setDuplicateDismissed(false);
    setDuplicateActionError(undefined);
    allowWithoutCustomer.current = false;
  }, [state.duplicate]);

  const duplicate = duplicateDismissed ? undefined : state.duplicate;

  function goToDuplicate(key: string) {
    onClose();
    router.push(`/orders/${key}`);
  }

  function reopenDuplicate(id: number) {
    setDuplicateActionError(undefined);
    startReopening(async () => {
      try {
        const result = await reopenDuplicateIssue(id);
        if (!result.ok) {
          setDuplicateActionError(result.error);
          return;
        }
        onClose();
        router.push(`/orders/${result.key}`);
        router.refresh();
      } catch {
        setDuplicateActionError(t("new.reopenError"));
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!type) {
      event.preventDefault();
      setTypeError(true);
      typeSectionRef.current?.focus();
      return;
    }

    if (allowWithoutCustomer.current) return;
    const form = event.currentTarget;
    const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() || "";
    const hasCustomerData = ["customerName", "customerEmail", "customerPhone", "customerAddress"].some(value);
    if (!hasCustomerData) {
      event.preventDefault();
      setMissingCustomer(true);
    }
  }

  function createWithoutCustomer() {
    allowWithoutCustomer.current = true;
    setMissingCustomer(false);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  function fillMissingCustomer() {
    setMissingCustomer(false);
    setMore(true);
    requestAnimationFrame(() => {
      shopifyFillRef.current?.focus();
      shopifyFillRef.current?.click();
    });
  }

  function cancelMissingCustomer() {
    setMissingCustomer(false);
    requestAnimationFrame(() => submitRef.current?.focus());
  }

  function handleMissingCustomerKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      cancelMissingCustomer();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      missingCustomerDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <Sheet title={t("new.title")} subtitle={t("new.subtitle")} onClose={onClose}>
      <form ref={formRef} action={action} onSubmit={handleSubmit}>
        <div className="scroll-thin max-h-[calc(62vh_/_var(--ui-zoom))] overflow-auto px-6 pb-5">
          <fieldset
            ref={typeSectionRef}
            tabIndex={-1}
            aria-required="true"
            aria-invalid={typeError}
            aria-describedby={typeError ? "new-order-type-error" : "new-order-type-help"}
            className="new-order-type-section"
          >
            <legend className="new-order-type-legend">
              {t("new.problemType")} <span aria-hidden="true">*</span>
            </legend>
            <p id="new-order-type-help" className="text-[11.5px] text-label-2">{t("new.problemTypeHint")}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {typeOptions.map((issueType) => {
                const active = type === issueType.key;
                return (
                  <button
                    key={issueType.key}
                    type="button"
                    data-active={active || undefined}
                    aria-pressed={active}
                    onClick={() => {
                      setType(issueType.key);
                      setTypeError(false);
                    }}
                    className="new-order-type-option"
                  >
                    {issueType.label}
                  </button>
                );
              })}
            </div>
            {typeError && <p id="new-order-type-error" role="alert" className="mt-2 text-[12px] font-medium text-stamp">{t("new.problemTypeRequired")}</p>}
          </fieldset>
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="shopifyFinancial" value={shopifyStatus.financial} />
          <input type="hidden" name="shopifyFulfillment" value={shopifyStatus.fulfillment} />

          <div className="grid gap-3.5 sm:grid-cols-[190px_1fr]">
            <div>
              <label className="field-label" htmlFor="orderNumber">
                {t("new.orderNumber")} <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                id="orderNumber"
                name="orderNumber"
                required
                autoFocus
                inputMode="numeric"
                maxLength={40}
                placeholder="2229"
                className="field mono"
                value={orderNumber}
                onChange={(event) => {
                  setOrderNumber(event.target.value);
                  setDuplicateDismissed(true);
                }}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="title">
                {t("new.subject")}
              </label>
              <input
                id="title"
                name="title"
                maxLength={200}
                placeholder={t("new.subjectPlaceholder")}
                className="field"
              />
            </div>
          </div>

          <div className="mt-3.5 border-y py-3" style={{ borderColor: "var(--rule)" }}>
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[220px] flex-1" htmlFor="customerEmail">
                <span className="field-label">{t("new.email")}</span>
                <input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="customer@example.com"
                  className="field"
                />
              </label>
              <EmailConversation
                customerEmail={customerEmail.trim()}
                orderNumber={orderNumber.trim()}
                disabled={!orderNumber.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())}
              />
            </div>
            <p className="mt-1.5 text-[11.5px] text-label-2">{t("new.emailPreviewHint")}</p>
          </div>

          <div className="mt-3.5">
            <label className="field-label" htmlFor="description">
              {t("new.message")}
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={5000}
              placeholder={t("new.messagePlaceholder")}
              className="field"
            />
            <div className="mt-2.5">
              <AttachmentPicker />
            </div>
          </div>

          <div className="mt-4">
            <label className="field-label">{t("items.title")}</label>
            <ItemsEditor items={items} onChange={setItems} currency={currency} />
          </div>

          <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="assigneeId">
                {t("new.assignee")}
              </label>
              <select id="assigneeId" name="assigneeId" defaultValue={me.id} className="field">
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.level}. nivo
                    {u.id === me.id ? ` (${t("common.you")})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="priority">
                {t("new.priority")}
              </label>
              <select
                id="priority"
                name="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="field"
              >
                {priorityOptions.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
              {(payment.method || payment.brand) && (
                <div className="mt-2 border px-2.5 py-2" style={{ borderColor: "var(--rule)" }}>
                  <PaymentMethod payment={payment} />
                </div>
              )}
            </div>
          </div>
          <input type="hidden" name="paymentMethod" value={payment.method ?? ""} />
          <input type="hidden" name="paymentBrand" value={payment.brand ?? ""} />
          <input type="hidden" name="paymentLast4" value={payment.last4 ?? ""} />

          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            className="mt-4 flex items-center gap-1 text-[13px] font-medium text-label-2 hover:text-label"
          >
            <ChevronDown size={14} className={`transition-transform ${more ? "rotate-180" : ""}`} />
            {t("new.customerItem")}
          </button>

          {/* Ostanejo v DOM tudi zaprta, da jih zna Shopify auto-fill izpolniti;
              skrita polja se ob oddaji obrazca vseeno pošljejo. */}
          <div hidden={!more}>
            <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
              <Field label={t("new.customerName")} name="customerName" placeholder="Jana Primer" />
              <Field label={t("details.phone")} name="customerPhone" type="tel" placeholder="+49 170 1234567" />
              <Field
                label={t("details.address")}
                name="customerAddress"
                placeholder={t("details.addressPlaceholder")}
              />
              {/* Koda države stoji ob naslovu, ker je njegov del in ker od nje
                  visi, ali sme naročilo skozi ShipGerman. Auto-fill jo napolni
                  po imenu polja, zato mora obstajati že tu, ne šele na zapisu. */}
              <div>
                <label className="field-label" htmlFor="customerCountryCode">
                  {t("details.countryCode")}
                </label>
                <input
                  id="customerCountryCode"
                  name="customerCountryCode"
                  list="new-order-country-codes"
                  maxLength={2}
                  placeholder="AT"
                  className="field mono uppercase"
                />
                <datalist id="new-order-country-codes">
                  <option value="AT">Austria</option>
                  <option value="CH">Switzerland</option>
                  <option value="DE">Germany</option>
                  <option value="IT">Italy</option>
                </datalist>
              </div>
              <div>
                <label className="field-label" htmlFor="amount">
                  {t("details.orderTotal")}
                </label>
                <div className="flex gap-2">
                  <input id="amount" name="amount" placeholder="129,00" className="field mono" />
                  <select
                    name="currency"
                    aria-label={t("details.currency")}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="field mono"
                    style={{ width: 84 }}
                  >
                    {(COMMON_CURRENCIES.includes(currency)
                      ? COMMON_CURRENCIES
                      : [currency, ...COMMON_CURRENCIES]
                    ).map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Field label={t("new.orderDate")} name="orderPlacedAt" type="date" />
              <Field label="Return tracking" name="returnTracking" placeholder="CP092195155IT" mono />
            </div>
          </div>

          {state.error && (
            <div className="mt-4">
              <Notice kind="error">{state.error}</Notice>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 border-t px-6 py-3.5"
          style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}
        >
          <button type="button" onClick={onClose} className="btn btn-sm">
            {t("common.cancel")}
          </button>
          <Submit buttonRef={submitRef} />
        </div>

        {missingCustomer && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-5" style={{ background: "rgba(10, 10, 14, 0.45)" }}>
            <div
              ref={missingCustomerDialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="missing-customer-title"
              aria-describedby="missing-customer-description"
              className="w-full max-w-[460px] border bg-surface p-5 animate-in"
              style={{ borderColor: "var(--rule-strong)", borderTop: "2px solid var(--warning)", boxShadow: "var(--lift-high)" }}
              onKeyDown={handleMissingCustomerKeyDown}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
                <div className="min-w-0">
                  <h3 id="missing-customer-title" className="text-[15px] font-semibold">{t("new.missingCustomerTitle")}</h3>
                  <p id="missing-customer-description" className="mt-1 text-[12.5px] leading-relaxed text-label-2">{t("new.missingCustomerBody")}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button autoFocus type="button" className="btn btn-sm" onClick={cancelMissingCustomer}>{t("common.cancel")}</button>
                <button type="button" className="btn btn-sm" onClick={createWithoutCustomer}>{t("new.createWithoutCustomer")}</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={fillMissingCustomer}>
                  {t("shopify.fill")}
                </button>
              </div>
            </div>
          </div>
        )}

        {duplicate && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center p-5"
            style={{ background: "rgba(10, 10, 14, 0.45)" }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="duplicate-order-title"
              aria-describedby="duplicate-order-description"
              className="w-full max-w-[430px] border bg-surface p-5 animate-in"
              style={{ borderColor: "var(--rule-strong)", borderTop: "2px solid var(--warning)", boxShadow: "var(--lift-high)" }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
                <div className="min-w-0">
                  <h3 id="duplicate-order-title" className="text-[15px] font-semibold">
                    {t(duplicate.status === "closed" ? "new.duplicateArchivedTitle" : "new.duplicateOpenTitle")}
                  </h3>
                  <p id="duplicate-order-description" className="mt-1 text-[12.5px] leading-relaxed text-label-2">
                    {duplicate.status === "closed"
                      ? t("new.duplicateArchivedBody", { order: duplicate.orderNumber })
                      : t("new.duplicateOpenBody", {
                          order: duplicate.orderNumber,
                          assignee: duplicate.assigneeName
                            ? t("new.assignedTo", { name: duplicate.assigneeName })
                            : "",
                        })}
                  </p>
                </div>
              </div>

              {duplicateActionError && (
                <div className="mt-4">
                  <Notice kind="error">{duplicateActionError}</Notice>
                </div>
              )}
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={reopening}
                  onClick={() => setDuplicateDismissed(true)}
                  className="btn btn-sm"
                >
                  {t("common.cancel")}
                </button>
                {duplicate.status === "closed" ? (
                  <button
                    autoFocus
                    type="button"
                    disabled={reopening}
                    onClick={() => reopenDuplicate(duplicate.id)}
                    className="btn btn-primary btn-sm"
                  >
                    {reopening ? t("new.opening") : t("new.reopenExisting")}
                  </button>
                ) : (
                  <button
                    autoFocus
                    type="button"
                    onClick={() => goToDuplicate(duplicate.key)}
                    className="btn btn-primary btn-sm"
                  >
                    {t("new.goToOrder")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </Sheet>
  );
}

function Submit({ buttonRef }: { buttonRef?: React.Ref<HTMLButtonElement> }) {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button ref={buttonRef} type="submit" disabled={pending} className="btn btn-primary btn-sm">
      {pending ? t("new.opening") : t("new.open")}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  mono,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        className={`field ${mono ? "mono" : ""}`}
      />
    </div>
  );
}
