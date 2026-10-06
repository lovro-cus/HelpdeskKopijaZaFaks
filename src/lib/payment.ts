export const PAYMENT_BRANDS = ["klarna", "mastercard", "visa"] as const;
export type PaymentBrand = (typeof PAYMENT_BRANDS)[number];
export const PAYMENT_BRAND_LABELS: Record<PaymentBrand, string> = {
  klarna: "Klarna",
  mastercard: "Mastercard",
  visa: "Visa",
};

export type PaymentInfo = {
  method: string | null;
  brand: PaymentBrand | null;
  last4: string | null;
};

export type PaymentTransaction = {
  status: string;
  kind: string;
  formattedGateway: string | null;
  gateway: string | null;
  accountNumber: string | null;
  paymentDetails: {
    paymentMethodName?: string | null;
    company?: string | null;
    number?: string | null;
  } | null;
};

export function paymentBrandOf(...values: (string | null | undefined)[]): PaymentBrand | null {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (text.includes("klarna")) return "klarna";
  if (text.includes("mastercard") || text.includes("master card")) return "mastercard";
  if (text.includes("visa")) return "visa";
  return null;
}

export function paymentLast4(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export function isPaymentBrand(value: string | null): value is PaymentBrand {
  return PAYMENT_BRANDS.includes(value as PaymentBrand);
}

export function paymentInfoFromTransactions(transactions: PaymentTransaction[]): PaymentInfo {
  const transaction = transactions
    .filter((item) =>
      item.status === "SUCCESS" && ["SALE", "CAPTURE", "AUTHORIZATION"].includes(item.kind),
    )
    .sort((a, b) => paymentRank(b.kind) - paymentRank(a.kind))[0];
  if (!transaction) return { method: null, brand: null, last4: null };

  const details = transaction.paymentDetails;
  const method = details?.paymentMethodName || transaction.formattedGateway || transaction.gateway || null;
  return {
    method,
    brand: paymentBrandOf(details?.company, method, transaction.formattedGateway, transaction.gateway),
    last4: paymentLast4(details?.number ?? transaction.accountNumber),
  };
}

export function paymentSummary(payment: PaymentInfo): string {
  const brand = payment.brand ? PAYMENT_BRAND_LABELS[payment.brand] : null;
  return [
    brand,
    payment.method && payment.method.toLowerCase() !== brand?.toLowerCase() ? payment.method : null,
    payment.last4 ? `•••• ${payment.last4}` : null,
  ].filter(Boolean).join(" · ");
}

export function priorityForPayment(priority: string, brand: PaymentBrand | null): string {
  return brand === "klarna" && priority !== "urgent" ? "high" : priority;
}

function paymentRank(kind: string): number {
  return kind === "SALE" ? 3 : kind === "CAPTURE" ? 2 : 1;
}
