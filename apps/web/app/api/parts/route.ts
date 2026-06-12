import { NextRequest, NextResponse } from "next/server";
import { PartRecordInput } from "@fitpart/shared";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";

/**
 * Download-Protokoll für den fit_feedback-Loop: /create meldet jeden Download
 * hierher (fire-and-forget). Angemeldete landen unter ihrer user_id (für die
 * 48-h-Mail via n8n), anonyme ohne Zuordnung – ihr Feedback-Einstieg ist der
 * zurückgegebene Token (localStorage + /feedback/<token>).
 */

const RATE_WINDOWS = [
  { limit: 20, windowMs: 60_000 },
  { limit: 120, windowMs: 60 * 60_000 },
];

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(`parts:${clientIp(req.headers)}`, RATE_WINDOWS);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = PartRecordInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültiger Request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_part", {
    p_archetype: parsed.data.archetype,
    p_params: parsed.data.params,
    p_tolerance: parsed.data.tolerance_profile ?? null,
    p_format: parsed.data.format,
  });

  if (error) {
    console.error("record_part:", error.message);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 502 });
  }

  return NextResponse.json(data);
}
