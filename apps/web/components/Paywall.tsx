"use client";

import { useTranslations } from "next-intl";
import { CREDIT_PACKS, type CreditSku } from "@fitpart/shared";
import { Button } from "@/components/ui";

/**
 * Paywall-Sheet: erscheint, wenn das Guthaben für einen Download fehlt.
 * Phase A zeigt die Pakete an; `onBuy` ist in Phase B mit Stripe-Checkout
 * verdrahtet (hier ein Platzhalter-Hinweis).
 */
export default function Paywall({
  open,
  credits,
  onBuy,
  onClose,
  notice,
}: {
  open: boolean;
  credits: number | null;
  onBuy: (sku: CreditSku) => void;
  onClose: () => void;
  notice?: string | null;
}) {
  const t = useTranslations("Billing");
  if (!open) return null;

  const order: CreditSku[] = ["single", "pack5", "pack20"];

  return (
    <div
      className="fp-card fp-card--pad flex flex-col"
      style={{ gap: "var(--space-3)" }}
      role="dialog"
      aria-label={t("paywallTitle")}
    >
      <header className="flex items-start justify-between" style={{ gap: "var(--space-2)" }}>
        <div>
          <strong style={{ font: "var(--type-body)" }}>{t("paywallTitle")}</strong>
          <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: "var(--space-1) 0 0" }}>
            {t("paywallSub", { credits: credits ?? 0 })}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label={t("close")}>
          ✕
        </Button>
      </header>

      <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
        {order.map((sku) => {
          const pack = CREDIT_PACKS[sku];
          const perCredit = (pack.chf / pack.credits).toFixed(2);
          return (
            <button
              key={sku}
              onClick={() => onBuy(sku)}
              className="fp-card flex items-center justify-between"
              style={{
                padding: "var(--space-3)",
                font: "var(--type-body-sm)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span className="flex flex-col">
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {t(`pack.${sku}`)}
                </span>
                <span style={{ color: "var(--text-tertiary)" }}>
                  {t("perCredit", { chf: perCredit })}
                </span>
              </span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                CHF {pack.chf.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>

      {notice && <div className="fp-panel">{notice}</div>}

      <p style={{ font: "var(--type-body-sm)", color: "var(--text-tertiary)", margin: 0 }}>
        {t("twintHint")}
      </p>
    </div>
  );
}
