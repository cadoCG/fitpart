import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AnalyzeResult, ARCHETYPES, ARCHETYPE_UI } from "@fitpart/shared";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

/**
 * Foto → Claude (Vision, Structured Output) → Archetyp-Vorschlag.
 * Eiserne Regel 1: Das LLM schreibt nie Geometrie – es klassifiziert nur und
 * schätzt abgeleitete Masse, die der User per Slider korrigieren kann. Die
 * Antwort wird gegen das geteilte Zod-Schema (AnalyzeResult) validiert.
 */

// Sonnet 4.6 statt Opus für die Bild-Klassifikation: ~40 % günstiger pro
// Aufruf bei gleicher Parameter-Oberfläche (Vision + adaptive Thinking +
// Structured Outputs). Für eine 6-fach-Klassifikation ausreichend; bei Bedarf
// später per A/B auf Haiku 4.5 (nochmals günstiger, aber Qualität messen).
const MODEL = "claude-sonnet-4-6";

const AnalyzeRequest = z.object({
  image: z.string().min(1),
  media_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

// Base64-Limit ~5 MB Bild (Claude-Vision-Grenze), mit etwas Reserve.
const MAX_IMAGE_BASE64_CHARS = 6_800_000;

// Numerische Parameter pro Archetyp, damit derived_dims gültige Keys nutzen.
const paramList = ARCHETYPES.map((a) => {
  const numeric = ARCHETYPE_UI[a].fields
    .filter((f) => f.kind === "slider" || f.kind === "int")
    .map((f) => f.key)
    .join(", ");
  return `- ${a}: ${numeric}`;
}).join("\n");

const SYSTEM = `Du bist der Vision-Klassifikator von FitPart, einer App für
passgenaue 3D-Druck-Funktionsteile. Du bekommst ein Foto eines Befestigungs-
oder Ersatzteil-Problems und ordnest es einem dieser Archetypen zu:

- spacer: Distanzhülse/Abstandshalter (Rohr um Schraube/Welle)
- wall_hook: Wandhaken, J-Profil (Rückplatte, Arm, Lippe; angeschraubt)
- l_bracket: L-Winkel/Regalträger (zwei Schenkel im 90°-Winkel, Schraublöcher)
- pipe_clip: Rohr-/Stangenclip (offener Ring, klipst um ein Rohr)
- cable_clip: Kabelclip (kleine Kanäle für 1–4 Kabel)
- device_holder: Gerätehalterung (U-Profil, hält Gerät an der Wand)

Numerische Parameter je Archetyp (nur diese Keys in derived_dims verwenden):
${paramList}

Regeln:
- archetype_confidence ist deine Sicherheit zwischen 0 und 1.
- alternative_archetypes: plausible Alternativen, falls unsicher (sonst leer).
- derived_dims: Startschätzungen der Masse des gezeigten Teils, soweit du sie
  aus dem Foto grob ablesen kannst (z. B. über Referenzobjekte wie Schrauben,
  Münzen, Hand). Der User reproduziert ein vorhandenes/defektes Teil und misst
  die formgebenden Masse (Breite, Länge, Bohrung) danach am Original nach –
  deine Schätzungen dienen nur als Vorbelegung. Lieber wenige plausible Werte
  als viele geratene.
- notes_de: kurzer hilfreicher Hinweis auf Deutsch (de-CH, "ss" statt "ß"),
  z. B. erkennbare Bruchursache oder Material-Tipp. Leerer String, wenn nichts
  Relevantes auffällt.`;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "archetype",
    "archetype_confidence",
    "alternative_archetypes",
    "derived_dims",
    "notes_de",
  ],
  properties: {
    archetype: { type: "string", enum: ARCHETYPES },
    archetype_confidence: { type: "number" },
    alternative_archetypes: {
      type: "array",
      items: { type: "string", enum: ARCHETYPES },
    },
    derived_dims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["param", "value_mm"],
        properties: {
          param: { type: "string" },
          value_mm: { type: "number" },
        },
      },
    },
    notes_de: { type: "string" },
  },
} as const;

// Jeder Aufruf kostet einen Claude-Vision-Call – daher knappes Limit pro IP.
const RATE_WINDOWS = [
  { limit: 5, windowMs: 60_000 }, // 5 / Minute
  { limit: 30, windowMs: 60 * 60_000 }, // 30 / Stunde
];

// Durable Tages-Quota (Supabase): echter Deckel gegen Kosten-Missbrauch, da der
// In-Memory-Limit oben auf Vercel pro Serverless-Instanz zählt. Per Env tunebar.
const IP_DAILY_LIMIT = Number(process.env.ANALYZE_IP_DAILY_LIMIT ?? 15);
const GLOBAL_DAILY_LIMIT = Number(process.env.ANALYZE_GLOBAL_DAILY_LIMIT ?? 300);
// Statischer Salt nur zur Pseudonymisierung der IP (kein Geheimnis nötig).
const IP_HASH_SALT = process.env.IP_HASH_SALT ?? "fitpart-analyze";

/**
 * Atomarer Tageszähler in Supabase (global + per gehashter IP). Failt bewusst
 * OFFEN bei DB-Fehler – das Anthropic-Budget-Limit bleibt der harte Backstop,
 * und ein DB-Ausfall soll die App nicht lahmlegen.
 */
async function withinDailyQuota(ip: string): Promise<boolean> {
  try {
    const ipHash = createHash("sha256")
      .update(IP_HASH_SALT + ip)
      .digest("hex")
      .slice(0, 32);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("check_analyze_quota", {
      p_ip_hash: ipHash,
      p_ip_limit: IP_DAILY_LIMIT,
      p_global_limit: GLOBAL_DAILY_LIMIT,
    });
    if (error) {
      console.error("check_analyze_quota:", error.message);
      return true;
    }
    return Boolean((data as { allowed?: boolean } | null)?.allowed);
  } catch (e) {
    console.error("check_analyze_quota threw:", e);
    return true;
  }
}

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(`analyze:${clientIp(req.headers)}`, RATE_WINDOWS);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: `Zu viele Analysen – bitte in ${rate.retryAfterSec} s erneut versuchen.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY ist nicht konfiguriert (.env.local)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = AnalyzeRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültiger Request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  if (parsed.data.image.length > MAX_IMAGE_BASE64_CHARS) {
    return NextResponse.json({ error: "Bild zu gross" }, { status: 413 });
  }

  // Durable Tages-Quota erst hier (nach Validierung) prüfen, damit nur echte,
  // wohlgeformte Analyse-Versuche das Kontingent verbrauchen.
  if (!(await withinDailyQuota(clientIp(req.headers)))) {
    return NextResponse.json(
      {
        error:
          "Tageslimit für Analysen erreicht – bitte morgen erneut versuchen.",
      },
      { status: 429 },
    );
  }

  const client = new Anthropic();
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: parsed.data.media_type,
                data: parsed.data.image,
              },
            },
            {
              type: "text",
              text: "Analysiere das Foto und klassifiziere das Befestigungsproblem.",
            },
          ],
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Vision-Analyse fehlgeschlagen (${e.status})` },
        { status: 502 },
      );
    }
    throw e;
  }

  if (response.stop_reason === "refusal") {
    return NextResponse.json(
      { error: "Das Bild konnte nicht analysiert werden." },
      { status: 422 },
    );
  }

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) {
    return NextResponse.json({ error: "Leere Antwort" }, { status: 502 });
  }

  let resultJson: unknown;
  try {
    resultJson = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Antwort nicht parsebar" },
      { status: 502 },
    );
  }

  const result = AnalyzeResult.safeParse(resultJson);
  if (!result.success) {
    return NextResponse.json(
      { error: "Antwort entspricht nicht dem Schema" },
      { status: 502 },
    );
  }

  return NextResponse.json(result.data);
}
