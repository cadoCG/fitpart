import { NextRequest, NextResponse } from "next/server";
import { CalibrationInput } from "@fitpart/shared";

const CAD_SERVICE_URL = process.env.CAD_SERVICE_URL ?? "http://localhost:8000";

/** Proxy: Coupon-Antworten → ToleranceProfile (Berechnung im CAD-Service). */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = CalibrationInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const upstream = await fetch(`${CAD_SERVICE_URL}/calibration/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => null);
  return NextResponse.json(data, { status: upstream.status });
}
