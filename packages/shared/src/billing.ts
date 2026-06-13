import { z } from "zod";

/**
 * Billing (Pay-per-Part, docs/billing-plan.md). Konto-Pflicht zum Download,
 * 3 Gratis-Credits bei Konto-Erstellung (lebenslang), danach 1 Credit = 1 Teil
 * freischalten; Re-Download eines freigeschalteten Teils ist gratis.
 */

export const WELCOME_CREDITS = 3;

/** Verkaufbare Pakete (Einmalzahlung, Karte + TWINT). Preise in CHF. */
export const CreditSku = z.enum(["single", "pack5", "pack20"]);
export type CreditSku = z.infer<typeof CreditSku>;

export type CreditPack = {
  sku: CreditSku;
  credits: number;
  chf: number;
};

/** Anzeige- und Mengen-Definition. Preis-Hoheit liegt serverseitig
 *  (SKU → Stripe-Price-ID via Env); diese Tabelle ist für UI + Mengen-Mapping. */
export const CREDIT_PACKS: Record<CreditSku, CreditPack> = {
  single: { sku: "single", credits: 1, chf: 3 },
  pack5: { sku: "pack5", credits: 5, chf: 12 },
  pack20: { sku: "pack20", credits: 20, chf: 48 },
};

/** Guthabenstand (GET /api/billing/state). */
export const BillingState = z.object({
  authenticated: z.boolean(),
  credits: z.number().int().optional(),
  unlocked_parts: z.number().int().optional(),
});
export type BillingState = z.infer<typeof BillingState>;

/** Gründe, die /api/download im Fehlerfall zurückgibt. */
export const DownloadDenyReason = z.enum([
  "auth_required",
  "no_credits",
  "not_found",
  "forbidden",
]);
export type DownloadDenyReason = z.infer<typeof DownloadDenyReason>;
