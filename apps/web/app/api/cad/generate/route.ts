import { NextRequest, NextResponse } from "next/server";
import { GenerateRequest } from "@fitpart/shared";
import { cadHeaders } from "@/lib/cad";

const CAD_SERVICE_URL = process.env.CAD_SERVICE_URL ?? "http://localhost:8000";

/**
 * Proxy zum CAD-Service. Validiert den Request gegen das geteilte Zod-Schema
 * und reicht Fehler des Service (422 mit Detail) transparent durch.
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

  const upstream = await fetch(`${CAD_SERVICE_URL}/generate`, {
    method: "POST",
    headers: cadHeaders(),
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  });

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/octet-stream",
    },
  });
}
