import { CreditCard } from "lucide-react";

import { paymentSummary, type PaymentInfo } from "@/lib/payment";

/** Način plačila. Brez logotipov kartičnih hiš — samo ikona in napis. */
export function PaymentMethod({ payment }: { payment: PaymentInfo }) {
  if (!payment.method && !payment.brand) return null;

  return (
    <span className="flex min-w-0 items-center gap-2">
      <CreditCard size={15} className="shrink-0 text-label-3" aria-hidden />
      <span className="min-w-0 truncate text-[12.5px]">{paymentSummary(payment)}</span>
    </span>
  );
}
