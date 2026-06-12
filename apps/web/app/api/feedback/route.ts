import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FeedbackInput, FeedbackPartInfo } from "@fitpart/shared";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";

/**
 * fit_feedback: GET liefert die Teil-Infos zum Token (Feedback-Seite),
 * POST speichert das Verdict. Beides läuft über SECURITY-DEFINER-RPCs –
 * der uuid-Token ist die Capability, Login ist nicht nötig (Mail-Link).
 */

const RATE_WINDOWS = [
  { limit: 10, windowMs: 60_000 },
  { limit: 60, windowMs: 60 * 60_000 },
];

export async function GET(req: NextRequest) {
  const token = z
    .string()
    .uuid()
    .safeParse(req.nextUrl.searchParams.get("token"));
  if (!token.success) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_part_for_feedback", {
    p_token: token.data,
  });
  if (error) {
    console.error("get_part_for_feedback:", error.message);
    return NextResponse.json({ error: "Abruf fehlgeschlagen" }, { status: 502 });
  }
  const info = FeedbackPartInfo.safeParse(data);
  if (!info.success) {
    return NextResponse.json({ error: "Unbekannter Token" }, { status: 404 });
  }
  return NextResponse.json(info.data);
}

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(`feedback:${clientIp(req.headers)}`, RATE_WINDOWS);
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
  const parsed = FeedbackInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültiger Request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_fit_feedback", {
    p_token: parsed.data.token,
    p_verdict: parsed.data.verdict,
    p_offset_hint_mm: parsed.data.offset_hint_mm ?? null,
    p_comment: parsed.data.comment ?? null,
  });
  if (error) {
    console.error("submit_fit_feedback:", error.message);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 502 });
  }
  if (!data) {
    return NextResponse.json({ error: "Unbekannter Token" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
