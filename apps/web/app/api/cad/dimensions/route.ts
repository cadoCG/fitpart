import { NextRequest, NextResponse } from "next/server";
import { GenerateRequest } from "@fitpart/shared";
import { cadHeaders } from "@/lib/cad";

const CAD_SERVICE_URL = process.env.CAD_SERVICE_URL ?? "http://localhost:8000";

/**
 * Proxy: Bemassungs-Anker für die 3D-Vorschau (reine Param-Arithmetik im
 * CAD-Service, baut keine Geometrie). Request-Shape wie /generate; `format`
 * wird upstream ignoriert.
 */
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

  const upstream = await fetch(`${CAD_SERVICE_URL}/dimensions`, {
    method: "POST",
    headers: cadHeaders(),
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => null);
  return NextResponse.json(data, { status: upstream.status });
}
