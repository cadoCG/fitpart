import { NextRequest, NextResponse } from "next/server";
import { GenerateRequest } from "@fitpart/shared";
import { cadHeaders } from "@/lib/cad";
import { partIdentityHash } from "@/lib/billingServer";
import { createClient } from "@/lib/supabase/server";

/**
 * Gated Download: einzige Quelle der sauberen Datei (Billing Phase A).
 * Auth-Pflicht → Teil freischalten (Credit ziehen oder bereits frei) → CAD
 * /generate proxen + Datei streamen. 402 bei fehlendem Guthaben.
 * Die Live-Vorschau (/api/cad/generate) bleibt ungated.
 */

const CAD_SERVICE_URL = process.env.CAD_SERVICE_URL ?? "http://localhost:8000";

const CONTENT_TYPE: Record<string, string> = {
  stl: "model/stl",
  "3mf": "model/3mf",
  step: "application/step",
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = GenerateRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültiger Request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { archetype, params, tolerance_profile, format } = parsed.data;

  const supabase = await createClient();
  const hash = partIdentityHash(archetype, params as Record<string, unknown>);

  const { data, error } = await supabase.rpc("unlock_part_for", {
    p_archetype: archetype,
    p_params: params,
    p_tolerance: tolerance_profile ?? null,
    p_format: format,
    p_params_hash: hash,
  });

  if (error) {
    console.error("unlock_part_for:", error.message);
    return NextResponse.json({ error: "Freischalten fehlgeschlagen" }, { status: 502 });
  }

  const result = data as {
    allowed: boolean;
    reason: string;
    credits?: number;
    feedback_token?: string;
  };

  if (!result.allowed) {
    if (result.reason === "auth_required") {
      return NextResponse.json(
        { error: "Anmeldung erforderlich", reason: "auth_required" },
        { status: 401 },
      );
    }
    if (result.reason === "no_credits") {
      return NextResponse.json(
        { error: "Kein Guthaben", reason: "no_credits", credits: 0 },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: "Nicht erlaubt", reason: result.reason },
      { status: 403 },
    );
  }

  // Freigeschaltet → Datei frisch aus dem CAD-Service holen.
  const upstream = await fetch(`${CAD_SERVICE_URL}/generate`, {
    method: "POST",
    headers: cadHeaders(),
    body: JSON.stringify({ archetype, params, tolerance_profile, format }),
    cache: "no-store",
  });
  if (!upstream.ok) {
    // Abbuchung ist erfolgt; das Teil bleibt freigeschaltet → Re-Download gratis.
    const detail = await upstream.text().catch(() => "");
    console.error("CAD generate nach unlock:", upstream.status, detail);
    return NextResponse.json(
      { error: `CAD-Fehler (${upstream.status})` },
      { status: 502 },
    );
  }

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPE[format] ?? "application/octet-stream",
      "X-Credits-Remaining": String(result.credits ?? 0),
      ...(result.feedback_token ? { "X-Feedback-Token": result.feedback_token } : {}),
      // Browser dürfen die Custom-Header lesen (Same-Origin-Fetch).
      "Access-Control-Expose-Headers": "X-Credits-Remaining, X-Feedback-Token",
    },
  });
}
