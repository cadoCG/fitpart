import { NextRequest, NextResponse } from "next/server";
import { PartRequestInput } from "@fitpart/shared";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

/**
 * "Kein passender Treffer"-Anfrage (ADR-002): landet in public.part_requests
 * und ist das Nachfrage-Signal für neue Archetypen. Anonyme Einsendungen sind
 * erlaubt; Foto nur bei Opt-in (privater Bucket). Geht bewusst über eine
 * Server-Route, damit Rate-Limit und Foto-Upload zentral kontrolliert sind.
 */

// Foto-Opt-in: gleiche Grenze wie /api/analyze (~5 MB Base64).
const MAX_IMAGE_BASE64_CHARS = 6_800_000;

const RATE_WINDOWS = [
  { limit: 5, windowMs: 60_000 }, // 5 / Minute
  { limit: 50, windowMs: 24 * 60 * 60_000 }, // 50 / Tag
];

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(
    `part-request:${clientIp(req.headers)}`,
    RATE_WINDOWS,
  );
  if (!rate.ok) {
    return NextResponse.json(
      { error: `Zu viele Anfragen – bitte in ${rate.retryAfterSec} s erneut.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = PartRequestInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;
  if (input.image && input.image.length > MAX_IMAGE_BASE64_CHARS) {
    return NextResponse.json({ error: "Bild zu gross" }, { status: 413 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Foto nur bei Opt-in in den privaten Bucket; ein Upload-Fehler darf die
  // Anfrage selbst nicht verhindern (Foto ist Bonus-Signal, kein Pflichtfeld).
  let photo_path: string | null = null;
  if (input.share_photo && input.image) {
    const bytes = Buffer.from(input.image, "base64");
    const path = `${user?.id ?? "anon"}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from("part-requests")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    if (!error) photo_path = path;
  }

  const { error } = await supabase.from("part_requests").insert({
    user_id: user?.id ?? null,
    description: input.description,
    suggested_archetype: input.suggested_archetype ?? null,
    confidence: input.confidence ?? null,
    email: input.email ?? null,
    photo_path,
  });
  if (error) {
    return NextResponse.json(
      { error: "Konnte die Anfrage nicht speichern." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
