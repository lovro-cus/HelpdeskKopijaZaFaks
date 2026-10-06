"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLink } from "lucide-react";

import { saveOrderCountry, saveOrderStatus, updateIssue, type FormState } from "@/lib/actions/issues";
import { usePriorityOptions } from "@/lib/config/client";
import { COMMON_CURRENCIES, DEFAULT_CURRENCY } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";
import { financialTone, fulfillmentTone } from "@/lib/order-status";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { CopyButton } from "./CopyButton";
import { Notice } from "./ui";
import { useLocale, useT } from "@/lib/i18n/client";
import { PaymentMethod } from "./PaymentMethod";

const initial: FormState = {};

export type DetailIssue = {
  id: number;
  orderNumber: string;
  priority: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerCountryCode: string | null;
  amount: number | null;
  currency: string;
  paymentMethod: string | null;
  paymentBrand: string | null;
  paymentLast4: string | null;
  returnTracking: string | null;
  replacementTracking: string | null;
  shopifyFinancial: string | null;
  shopifyFulfillment: string | null;
  shopifyStatusAt: Date | null;
  orderPlacedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  reporter: { name: string } | null;
};

const iso = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export function DetailsCard({
  issue,
  shopifyHref,
}: {
  issue: DetailIssue;
  /** Povezava, ki odpre naročilo v Shopify adminu; brez povezane trgovine je ni. */
  shopifyHref?: string | null;
}) {
  const t = useT();
  const priorities = usePriorityOptions();
  const locale = useLocale();
  const [state, action] = useActionState(updateIssue, initial);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (state.ok) setDirty(false);
  }, [state]);

  // Valuta iz Shopifyja je lahko taka, ki je na seznamu ni — takrat jo
  // dodamo, da je izbirnik ne bi tiho zamenjal za evro.
  const currency = issue.currency || DEFAULT_CURRENCY;
  const currencyOptions = COMMON_CURRENCIES.includes(currency)
    ? COMMON_CURRENCIES
    : [currency, ...COMMON_CURRENCIES];

  // Za lepljenje v mail ali prevozničin obrazec: vsi podatki stranke naenkrat.
  const customerBlock = [
    issue.customerName,
    issue.customerEmail,
    issue.customerPhone,
    issue.customerAddress,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <form action={action} onChange={() => setDirty(true)} className="card">
      <input type="hidden" name="issueId" value={issue.id} />

      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="caption" style={{ color: "var(--ink)" }}>{t("details.title")}</h3>
        {shopifyHref && (
          <a
            href={shopifyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="link flex items-center gap-1 text-[12px]"
          >
            Shopify <ExternalLink size={11} />
          </a>
        )}
      </div>

      <Group>
        <Row
          label={t("new.orderNumber")}
          copy={<CopyButton value={issue.orderNumber} from="orderNumber" label={t("new.orderNumber")} />}
        >
          <input name="orderNumber" defaultValue={issue.orderNumber} maxLength={40} className="field mono" />
        </Row>
        <Row label={t("new.priority")}>
          <select name="priority" defaultValue={issue.priority} className="field">
            {priorities.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </Row>
        <OrderStatusRow issue={issue} />
      </Group>

      <Group
        title={t("details.customer")}
        action={
          <CopyButton value={customerBlock} title={t("copy.customer")} className="-mr-1" />
        }
      >
        <Row
          label={t("details.name")}
          copy={<CopyButton value={issue.customerName} from="customerName" label={t("details.name")} />}
        >
          <input name="customerName" defaultValue={issue.customerName ?? ""} className="field" />
        </Row>
        <Row
          label="E-mail"
          copy={<CopyButton value={issue.customerEmail} from="customerEmail" label="E-mail" />}
        >
          <input
            name="customerEmail"
            type="email"
            defaultValue={issue.customerEmail ?? ""}
            className="field"
          />
        </Row>
        <Row
          label={t("details.phone")}
          copy={<CopyButton value={issue.customerPhone} from="customerPhone" label={t("details.phone")} />}
        >
          <input
            name="customerPhone"
            type="tel"
            defaultValue={issue.customerPhone ?? ""}
            className="field"
          />
        </Row>
        <Row
          label={t("details.address")}
          copy={<CopyButton value={issue.customerAddress} from="customerAddress" label={t("details.address")} />}
        >
          <textarea
            name="customerAddress"
            rows={2}
            maxLength={300}
            defaultValue={issue.customerAddress ?? ""}
            placeholder={t("details.addressPlaceholder")}
            className="field"
            style={{ minHeight: 52 }}
          />
        </Row>
        <Row label={t("details.countryCode")}>
          <input
            name="customerCountryCode"
            defaultValue={issue.customerCountryCode ?? ""}
            list="shipping-country-codes"
            maxLength={2}
            placeholder="AT"
            className="field mono uppercase"
          />
          <datalist id="shipping-country-codes">
            <option value="AT">Austria</option>
            <option value="CH">Switzerland</option>
            <option value="DE">Germany</option>
          </datalist>
          <span className="mt-1 block text-[11px] text-label-2">{t("details.countryCodeHint")}</span>
        </Row>
      </Group>

      {/* Artikli imajo svojo kartico ob niti; tu ostane samo skupna vrednost. */}
      <Group>
        {(issue.paymentMethod || issue.paymentBrand) && (
          <Row label={t("details.paymentMethod")}>
            <PaymentMethod
              payment={{
                method: issue.paymentMethod,
                brand:
                  issue.paymentBrand === "klarna" ||
                  issue.paymentBrand === "mastercard" ||
                  issue.paymentBrand === "visa"
                    ? issue.paymentBrand
                    : null,
                last4: issue.paymentLast4,
              }}
            />
          </Row>
        )}
        <Row label={t("details.orderTotal")}>
          <div className="flex gap-2">
            <input name="amount" defaultValue={issue.amount ?? ""} className="field mono" />
            {/* Valuta ostane taka, kot je bilo naročilo plačano — ne pretvarjamo. */}
            <select
              name="currency"
              aria-label={t("details.currency")}
              defaultValue={currency}
              className="field mono"
              style={{ width: 84 }}
            >
              {currencyOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </Row>
      </Group>

      <Group title={t("details.shipments")}>
        <Row
          label="Return tracking"
          copy={<CopyButton value={issue.returnTracking} from="returnTracking" label="Return tracking" />}
        >
          <input
            name="returnTracking"
            defaultValue={issue.returnTracking ?? ""}
            placeholder="CP092195155IT"
            className="field mono"
          />
        </Row>
        <Row
          label={t("details.replacementTracking")}
          copy={
            <CopyButton
              value={issue.replacementTracking}
              from="replacementTracking"
              label={t("details.replacementTracking")}
            />
          }
        >
          <input
            name="replacementTracking"
            defaultValue={issue.replacementTracking ?? ""}
            className="field mono"
          />
        </Row>
        <Row label={t("new.orderDate")}>
          <input
            name="orderPlacedAt"
            type="date"
            defaultValue={iso(issue.orderPlacedAt)}
            className="field"
          />
        </Row>
      </Group>

      <div className="px-4 py-3 text-[11.5px] leading-relaxed text-label-3">
        {t("details.openedBy", { name: issue.reporter?.name ?? "—", date: formatDateTime(issue.createdAt, locale) })}
        <br />
        {t("details.updated", { date: formatDateTime(issue.updatedAt, locale) })}
        {issue.closedAt && (
          <>
            <br />
            {t("details.archived", { date: formatDateTime(issue.closedAt, locale) })}
          </>
        )}
      </div>

      {state.error && (
        <div className="px-4 pb-3">
          <Notice kind="error">{state.error}</Notice>
        </div>
      )}

      {dirty && (
        <div
          className="animate-in sticky bottom-0 flex items-center justify-between gap-2 border-t px-4 py-2.5"
          style={{ borderColor: "var(--separator)", background: "var(--surface-2)" }}
        >
          <span className="text-[12px] text-label-2">{t("common.unsaved")}</span>
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

function Group({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="reveal-host hairline grid gap-3 px-4 py-3.5">
      {title && (
        <div className="flex items-center justify-between gap-2">
          {/* Naslov skupine je rubrika v polnem črnilu; imena polj pod njim so
              ista rubrika, le bledejša. Hierarhija gre skozi jakost, ne velikost. */}
          <span className="caption" style={{ color: "var(--ink)" }}>
            {title}
          </span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Vrstica s podatkom. Gumb za kopiranje stoji ob oznaki in se pokaže šele ob
 * prehodu miške čez vrstico — podatek ostane v ospredju, dejanje pride po njem.
 */
/**
 * Stanje naročila pri Shopifyju. Ni polje za urejanje — Shopify je vir resnice,
 * mi kažemo, kaj smo nazadnje videli, in kdaj. Prazno pomeni, da naročila še
 * nismo pogledali (novi ticketi ga dobijo ob prvem auto-fillu ali ponoči).
 */
function OrderStatusRow({ issue }: { issue: DetailIssue }) {
  const t = useT();
  const locale = useLocale();
  if (!issue.shopifyFinancial && !issue.shopifyFulfillment) return null;

  return (
    <div className="reveal-host block">
      <span className="field-label">{t("details.orderStatus")}</span>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {issue.shopifyFinancial && (
          <span className="pill" style={{ color: financialTone(issue.shopifyFinancial), borderColor: financialTone(issue.shopifyFinancial) }}>
            {t(`orderFin.${issue.shopifyFinancial}` as TranslationKey)}
          </span>
        )}
        {issue.shopifyFulfillment && (
          <span className="pill" style={{ color: fulfillmentTone(issue.shopifyFulfillment), borderColor: fulfillmentTone(issue.shopifyFulfillment) }}>
            {t(`orderFul.${issue.shopifyFulfillment}` as TranslationKey)}
          </span>
        )}
        {issue.shopifyStatusAt && (
          <span className="text-[11px] text-label-3">
            {t("details.orderStatusAt", { when: formatDateTime(issue.shopifyStatusAt, locale) })}
          </span>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  copy,
  children,
}: {
  label: string;
  copy?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="reveal-host block">
      <span className="flex items-center justify-between gap-2">
        <span className="field-label">{label}</span>
        {copy}
      </span>
      {children}
    </label>
  );
}
