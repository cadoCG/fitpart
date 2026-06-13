import { NextResponse } from "next/server";
import { BillingState } from "@fitpart/shared";
import { createClient } from "@/lib/supabase/server";

/**
 * Guthabenstand des angemeldeten Users. Stellt lazy das Profil sicher und
 * vergibt einmalig die Welcome-Credits (get_billing_state → ensure_profile).
 * Für Anonyme: { authenticated: false }.
 */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_billing_state");
  if (error) {
    console.error("get_billing_state:", error.message);
    return NextResponse.json({ error: "Abruf fehlgeschlagen" }, { status: 502 });
  }
  const parsed = BillingState.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json(parsed.data);
}
