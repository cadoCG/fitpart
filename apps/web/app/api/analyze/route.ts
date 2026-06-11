import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AnalyzeResult, ARCHETYPES, ARCHETYPE_UI } from "@fitpart/shared";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

/**
 * Foto → Claude (Vision, Structured Output) → Archetyp-Vorschlag.
 * Eiserne Regel 1: Das LLM schreibt nie Geometrie – es klassifiziert nur und
 * schätzt abgeleitete Masse, die der User per Slider korrigieren kann. Die
 * Antwort wird gegen das geteilte Zod-Schema (AnalyzeResult) validiert.
 */

const MODEL = "claude-opus-4-8";

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
- derived_dims: nur Masse, die du aus dem Foto grob schätzen kannst
  (z. B. über Referenzobjekte). Lieber wenige plausible Werte als viele
  geratene. Kritische Passmasse misst der User danach selbst.
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
