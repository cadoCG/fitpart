"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleCheck, Lightbulb, Ruler, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ARCHETYPE_CONFIDENCE_THRESHOLD,
  ARCHETYPE_UI,
  CRITICAL_DIMS,
  type AnalyzeResult,
  type Archetype,
} from "@fitpart/shared";
import { Button, Panel, ProgressBar, Stepper, TypeCard } from "@/components/ui";
import { useUser } from "@/lib/useUser";
import { submitPartRequest } from "@/lib/partRequest";

/**
 * Geführter Einstieg als Vollbild-Stepper (Foto → Bauteil-Typ → Messen),
 * Muster: Import-Flows à la QuickBooks/ElevenLabs. Foto → /api/analyze →
 * Archetyp-Vorschlag als Karten → kritische Masse Schritt für Schritt
 * (Fragen statisch aus i18n, nicht vom LLM). Am Ende werden Defaults +
 * geschätzte + gemessene Werte gemerged und an /create übergeben.
 */

type ParamValues = Record<string, number | string | boolean>;

type Props = {
  onComplete: (
    archetype: Archetype,
    params: ParamValues,
    notes?: string,
  ) => void;
};

type Phase = "upload" | "analyzing" | "suggest" | "nomatch" | "measure";

const MAX_EDGE_PX = 1568;

/** Foto clientseitig verkleinern + als JPEG-Base64 kodieren (Payload klein halten). */
async function encodeImage(
  file: File,
): Promise<{ image: string; media_type: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { image: dataUrl.slice(dataUrl.indexOf(",") + 1), media_type: "image/jpeg" };
}

function sliderRange(archetype: Archetype, param: string) {
  const field = ARCHETYPE_UI[archetype].fields.find((f) => f.key === param);
  if (field && (field.kind === "slider" || field.kind === "int")) {
    return {
      min: field.min,
      max: field.max,
      step: field.kind === "int" ? 1 : (field.step ?? 0.1),
    };
  }
  return null;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// Zähl-Parameter (Stückzahl statt Länge) – kein "mm"-Suffix im Messfeld.
const COUNT_PARAMS = new Set(["channels", "holes_per_leg"]);

export default function MeasureWizard({ onComplete }: Props) {
  const t = useTranslations("Measure");
  const tc = useTranslations("Create");
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("upload");
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null); // Base64-JPEG, auch Preview
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [archetype, setArchetype] = useState<Archetype>("spacer");
  const [stepIndex, setStepIndex] = useState(0);
  const [measured, setMeasured] = useState<Record<string, number>>({});
  // "Kein passender Treffer"-Anfrage (ADR-002).
  const [reqDescription, setReqDescription] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [sharePhoto, setSharePhoto] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "done">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPhase("upload");
    setPhoto(null);
    setResult(null);
    setError(null);
    setStepIndex(0);
    setMeasured({});
    setReqDescription("");
    setReqEmail("");
    setSharePhoto(false);
    setSubmitState("idle");
    setSubmitError(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  // ESC schliesst den Overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const analyze = async (file: File) => {
    setError(null);
    setPhase("analyzing");
    try {
      const payload = await encodeImage(file);
      setPhoto(payload.image);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as AnalyzeResult;
      setResult(data);
      setArchetype(data.archetype);
      // Unsicherer Treffer → nicht in eine womöglich falsche Vorlage zwingen,
      // sondern den "kein passender Treffer"-Pfad anbieten (ADR-002).
      setPhase(
        data.archetype_confidence < ARCHETYPE_CONFIDENCE_THRESHOLD
          ? "nomatch"
          : "suggest",
      );
    } catch (e) {
      setError(
        `${t("errorAnalyze")}: ${e instanceof Error ? e.message : String(e)}`,
      );
      setPhase("upload");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /** Geschätzte Werte aus dem Foto, geclampt auf die UI-Ranges des Archetyps. */
  const derivedFor = (a: Archetype): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const d of result?.derived_dims ?? []) {
      const range = sliderRange(a, d.param);
      if (range) out[d.param] = clamp(d.value_mm, range.min, range.max);
    }
    return out;
  };

  const steps = CRITICAL_DIMS[archetype];
  const currentParam = steps[stepIndex];

  const startMeasure = () => {
    const derived = derivedFor(archetype);
    const initial: Record<string, number> = {};
    for (const param of CRITICAL_DIMS[archetype]) {
      initial[param] =
        derived[param] ?? Number(ARCHETYPE_UI[archetype].defaults[param]);
    }
    setMeasured(initial);
    setStepIndex(0);
    setPhase("measure");
  };

  // Zurück auf den Foto-Schritt (verwirft Analyse + offene Anfrage).
  const resetToUpload = () => {
    setPhase("upload");
    setPhoto(null);
    setResult(null);
    setSubmitState("idle");
    setSubmitError(null);
    setReqDescription("");
    if (fileRef.current) fileRef.current.value = "";
  };

  // "Kein passender Treffer"-Anfrage absenden (Warteliste/Roadmap-Signal).
  const submitRequest = async () => {
    setSubmitError(null);
    setSubmitState("sending");
    try {
      await submitPartRequest({
        description: reqDescription,
        suggested_archetype: result?.archetype,
        confidence: result?.archetype_confidence,
        email: reqEmail.trim() || undefined,
        share_photo: sharePhoto,
        ...(sharePhoto && photo
          ? { image: photo, media_type: "image/jpeg" }
          : {}),
      });
      setSubmitState("done");
    } catch (e) {
      setSubmitError(
        `${t("noMatch.errorSubmit")}: ${e instanceof Error ? e.message : String(e)}`,
      );
      setSubmitState("idle");
    }
  };

  const finish = (finalMeasured: Record<string, number>) => {
    const params: ParamValues = {
      ...ARCHETYPE_UI[archetype].defaults,
      ...derivedFor(archetype),
      ...finalMeasured,
    };
    const a = archetype;
    const notes = result?.notes_de || undefined;
    close();
    onComplete(a, params, notes);
  };

  const stepperIndex =
    phase === "measure"
      ? 2
      : phase === "suggest" || phase === "nomatch"
        ? 1
        : 0;

  // ---- Eintrittskarte in der Sidebar ----
  if (!open) {
    return (
      <div className="fp-card fp-card--pad">
        <h2 style={{ font: "var(--type-h3)", margin: "0 0 var(--space-1)" }}>{t("title")}</h2>
        <p
          style={{
            font: "var(--type-body-sm)",
            color: "var(--text-secondary)",
            margin: "0 0 var(--space-3)",
          }}
        >
          {t("intro")}
        </p>
        <Button block onClick={() => setOpen(true)}>
          <Camera size={17} strokeWidth={2} aria-hidden />
          {t("upload")}
        </Button>
      </div>
    );
  }

  // ---- Vollbild-Overlay ----
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: "var(--surface-card)" }}
    >
      {/* Header mit Stepper */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          borderColor: "var(--border-default)",
          background: "color-mix(in srgb, var(--surface-card) 92%, transparent)",
          backdropFilter: "blur(8px)",
          padding: "var(--space-4) var(--space-6)",
        }}
      >
        <div
          className="mx-auto flex items-center justify-between"
          style={{ maxWidth: "var(--container-narrow)" }}
        >
          <Stepper
            steps={[t("stepPhoto"), t("stepType"), t("stepMeasure")]}
            current={stepperIndex}
          />
          <button
            onClick={close}
            aria-label={t("close")}
            className="fp-btn fp-btn--ghost fp-btn--sm"
            style={{ borderRadius: "var(--radius-full)", padding: "0 10px" }}
          >
            <X size={17} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </header>

      <main
        className="mx-auto w-full flex-1"
        style={{
          maxWidth: "var(--container-narrow)",
          padding: "var(--space-8) var(--space-6)",
        }}
      >
        {/* Schritt 1: Foto */}
        {(phase === "upload" || phase === "analyzing") && (
          <section>
            <h1 style={{ font: "var(--type-h2)", margin: 0 }}>{t("uploadTitle")}</h1>
            <p
              style={{
                font: "var(--type-body-sm)",
                color: "var(--text-secondary)",
                margin: "var(--space-1) 0 var(--space-6)",
              }}
            >
              {t("intro")}
            </p>

            {phase === "analyzing" && photo ? (
              <div
                className="relative overflow-hidden"
                style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)" }}
              >
                <img
                  src={`data:image/jpeg;base64,${photo}`}
                  alt=""
                  className="max-h-96 w-full object-contain"
                />
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background: "color-mix(in srgb, var(--surface-card) 55%, transparent)",
                    backdropFilter: "blur(2px)",
                  }}
                >
                  <span
                    className="inline-flex items-center gap-3"
                    style={{
                      background: "var(--surface-inverse)",
                      color: "var(--text-on-inverse)",
                      borderRadius: "var(--radius-full)",
                      padding: "10px 20px",
                      font: "var(--type-label)",
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    <span className="fp-spinner" aria-hidden />
                    {t("analyzing")}
                  </span>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith("image/")) void analyze(file);
                }}
                onClick={() => fileRef.current?.click()}
                className={`fp-dropzone${dragOver ? " fp-dropzone--active" : ""}`}
              >
                <Camera
                  size={36}
                  strokeWidth={1.5}
                  style={{ color: "var(--text-tertiary)" }}
                  aria-hidden
                />
                <p style={{ margin: 0, font: "var(--type-label)", fontSize: "var(--text-base)" }}>
                  {t("dropzone")}
                </p>
                <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-tertiary)" }}>
                  {t("dropzoneHint")}
                </p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void analyze(file);
              }}
            />
            {error && <div className="fp-panel fp-panel--error" style={{ marginTop: "var(--space-4)" }}>{error}</div>}
          </section>
        )}

        {/* Schritt 2: Bauteil-Typ */}
        {phase === "suggest" && result && (
          <section>
            <h1 style={{ font: "var(--type-h2)", margin: 0 }}>{t("suggestHeading")}</h1>
            <p
              style={{
                font: "var(--type-body-sm)",
                color: "var(--text-secondary)",
                margin: "var(--space-1) 0 var(--space-6)",
              }}
            >
              {t("suggestSub")}
            </p>

            <div className="fpk-wizrow">
              {photo && (
                <img
                  src={`data:image/jpeg;base64,${photo}`}
                  alt=""
                  className="fpk-photo"
                />
              )}
              <div className="flex flex-1 flex-col" style={{ gap: "var(--space-2)", minWidth: 0 }}>
                {[result.archetype, ...result.alternative_archetypes].map((a, i) => (
                  <TypeCard
                    key={a}
                    selected={archetype === a}
                    label={tc(`archetypes.${a}`)}
                    confidence={i === 0 ? result.archetype_confidence : undefined}
                    onClick={() => setArchetype(a)}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPhase("nomatch")}
              style={{
                marginTop: "var(--space-3)",
                font: "var(--type-body-sm)",
                color: "var(--text-secondary)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                background: "none",
                border: 0,
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              {t("noMatch.trigger")}
            </button>

            {result.notes_de && (
              <div style={{ marginTop: "var(--space-5)" }}>
                <Panel
                  variant="accent"
                  icon={<Lightbulb size={16} strokeWidth={2} aria-hidden />}
                  title={t("photoNoteTitle")}
                >
                  {result.notes_de}
                </Panel>
              </div>
            )}

            <div className="flex" style={{ gap: "var(--space-2)", marginTop: "var(--space-6)" }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setPhase("upload");
                  setPhoto(null);
                  setResult(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                {t("replacePhoto")}
              </Button>
              <Button block onClick={startMeasure}>
                {t("startMeasure")} →
              </Button>
            </div>
          </section>
        )}

        {/* Schritt 2b: Kein passender Treffer → Warteliste (ADR-002) */}
        {phase === "nomatch" && (
          <section>
            {submitState === "done" ? (
              <>
                <h1 style={{ font: "var(--type-h2)", margin: 0 }}>
                  {t("noMatch.doneTitle")}
                </h1>
                <p
                  style={{
                    font: "var(--type-body-sm)",
                    color: "var(--text-secondary)",
                    margin: "var(--space-2) 0 var(--space-6)",
                    textWrap: "pretty",
                  }}
                >
                  {t("noMatch.doneBody")}
                </p>
                <div className="flex" style={{ gap: "var(--space-2)" }}>
                  <Button variant="secondary" onClick={resetToUpload}>
                    {t("replacePhoto")}
                  </Button>
                  {result && (
                    <Button block onClick={() => setPhase("suggest")}>
                      {t("noMatch.chooseAnyway")} →
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 style={{ font: "var(--type-h2)", margin: 0 }}>
                  {t("noMatch.heading")}
                </h1>
                <p
                  style={{
                    font: "var(--type-body-sm)",
                    color: "var(--text-secondary)",
                    margin: "var(--space-1) 0 var(--space-6)",
                    textWrap: "pretty",
                  }}
                >
                  {t("noMatch.sub")}
                </p>

                <div className="fpk-wizrow">
                  {photo && (
                    <img
                      src={`data:image/jpeg;base64,${photo}`}
                      alt=""
                      className="fpk-photo"
                    />
                  )}
                  <div
                    className="flex flex-1 flex-col"
                    style={{ gap: "var(--space-4)", minWidth: 0 }}
                  >
                    {result && (
                      <p
                        style={{
                          font: "var(--type-body-sm)",
                          color: "var(--text-tertiary)",
                          margin: 0,
                        }}
                      >
                        {t("noMatch.confidenceLow", {
                          percent: Math.round(
                            result.archetype_confidence * 100,
                          ),
                        })}
                      </p>
                    )}

                    <label className="flex flex-col" style={{ gap: "var(--space-2)" }}>
                      <span style={{ font: "var(--type-label)" }}>
                        {t("noMatch.descriptionLabel")}
                      </span>
                      <textarea
                        className="fp-input"
                        rows={4}
                        value={reqDescription}
                        onChange={(e) => setReqDescription(e.target.value)}
                        placeholder={t("noMatch.descriptionPlaceholder")}
                        maxLength={2000}
                        style={{ resize: "vertical" }}
                        autoFocus
                      />
                    </label>

                    {!user && (
                      <label className="flex flex-col" style={{ gap: "var(--space-2)" }}>
                        <span style={{ font: "var(--type-label)" }}>
                          {t("noMatch.emailLabel")}
                        </span>
                        <input
                          type="email"
                          className="fp-input"
                          value={reqEmail}
                          onChange={(e) => setReqEmail(e.target.value)}
                          placeholder="deine@email.ch"
                          autoComplete="email"
                        />
                        <span
                          style={{
                            font: "var(--type-body-sm)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {t("noMatch.emailHint")}
                        </span>
                      </label>
                    )}

                    {photo && (
                      <label className="fp-checkbox">
                        <input
                          type="checkbox"
                          checked={sharePhoto}
                          onChange={(e) => setSharePhoto(e.target.checked)}
                        />
                        <span>{t("noMatch.sharePhoto")}</span>
                      </label>
                    )}

                    {submitError && (
                      <div className="fp-panel fp-panel--error">{submitError}</div>
                    )}
                  </div>
                </div>

                <div
                  className="flex"
                  style={{ gap: "var(--space-2)", marginTop: "var(--space-6)" }}
                >
                  <Button
                    variant="secondary"
                    onClick={() =>
                      result ? setPhase("suggest") : resetToUpload()
                    }
                  >
                    {result ? t("noMatch.chooseAnyway") : t("replacePhoto")}
                  </Button>
                  <Button
                    block
                    onClick={() => void submitRequest()}
                    loading={submitState === "sending"}
                    disabled={
                      reqDescription.trim().length < 3 ||
                      submitState === "sending"
                    }
                  >
                    {submitState === "sending"
                      ? t("noMatch.submitting")
                      : t("noMatch.submit")}
                  </Button>
                </div>
              </>
            )}
          </section>
        )}

        {/* Schritt 3: Messen */}
        {phase === "measure" &&
          (() => {
            const range = sliderRange(archetype, currentParam);
            const value = measured[currentParam] ?? 0;
            const isLast = stepIndex === steps.length - 1;
            return (
              <section>
                <p
                  style={{
                    font: "var(--type-body-sm)",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    margin: "0 0 var(--space-2)",
                  }}
                >
                  {t("step", { current: stepIndex + 1, total: steps.length })} ·{" "}
                  {tc(`archetypes.${archetype}`)}
                </p>
                <ProgressBar value={stepIndex + 1} max={steps.length} />

                <div className="fpk-wizrow" style={{ marginTop: "var(--space-8)" }}>
                  {photo && (
                    <img src={`data:image/jpeg;base64,${photo}`} alt="" className="fpk-photo" />
                  )}
                  <div className="flex-1">
                    <h1 style={{ font: "var(--type-h2)", margin: 0, textWrap: "pretty" }}>
                      {t(`questions.${archetype}.${currentParam}`)}
                    </h1>
                    <p
                      className="flex gap-2"
                      style={{
                        font: "var(--type-body-sm)",
                        color: "var(--text-secondary)",
                        margin: "var(--space-3) 0 var(--space-6)",
                      }}
                    >
                      <Ruler size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
                      {t(`hints.${archetype}.${currentParam}`)}
                    </p>

                    <span className="inline-flex items-baseline" style={{ gap: "var(--space-2)" }}>
                      <input
                        type="number"
                        className="fp-input fp-input--measure"
                        style={{ width: 150 }}
                        value={Number.isFinite(value) ? value : ""}
                        min={range?.min}
                        max={range?.max}
                        step={range?.step}
                        onChange={(e) =>
                          setMeasured((m) => ({
                            ...m,
                            [currentParam]: Number(e.target.value),
                          }))
                        }
                        autoFocus
                      />
                      {!COUNT_PARAMS.has(currentParam) && (
                        <span
                          style={{
                            font: "var(--type-measure)",
                            fontSize: "var(--text-lg)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          mm
                        </span>
                      )}
                    </span>
                    {range && (value < range.min || value > range.max) && (
                      <p
                        style={{
                          font: "var(--type-body-sm)",
                          color: "var(--status-warn)",
                          margin: "var(--space-2) 0 0",
                        }}
                      >
                        {t("rangeHint", { min: range.min, max: range.max })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex" style={{ gap: "var(--space-2)", marginTop: "var(--space-8)" }}>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      stepIndex === 0 ? setPhase("suggest") : setStepIndex((i) => i - 1)
                    }
                  >
                    ← {t("back")}
                  </Button>
                  <Button
                    block
                    onClick={() => {
                      const clamped = range ? clamp(value, range.min, range.max) : value;
                      const next = { ...measured, [currentParam]: clamped };
                      setMeasured(next);
                      if (isLast) finish(next);
                      else setStepIndex((i) => i + 1);
                    }}
                    disabled={!Number.isFinite(value) || value <= 0}
                  >
                    {isLast ? (
                      <>
                        {t("finish")}
                        <CircleCheck size={16} strokeWidth={2.5} aria-hidden />
                      </>
                    ) : (
                      `${t("next")} →`
                    )}
                  </Button>
                </div>
              </section>
            );
          })()}
      </main>
    </div>
  );
}
