"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ARCHETYPE_UI,
  CRITICAL_DIMS,
  type AnalyzeResult,
  type Archetype,
} from "@fitpart/shared";

/**
 * Geführter Einstieg als Vollbild-Stepper (Foto → Bauteil-Typ → Messen),
 * Muster: Import-Flows à la QuickBooks/ElevenLabs. Foto → /api/analyze →
 * Archetyp-Vorschlag als Karten → kritische Masse Schritt für Schritt
 * (Fragen statisch aus i18n, nicht vom LLM). Am Ende werden Defaults +
 * geschätzte + gemessene Werte gemerged und an /create übergeben.
 */

type ParamValues = Record<string, number | string | boolean>;

type Props = {
  onComplete: (archetype: Archetype, params: ParamValues) => void;
};

type Phase = "upload" | "analyzing" | "suggest" | "measure";

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

export default function MeasureWizard({ onComplete }: Props) {
  const t = useTranslations("Measure");
  const tc = useTranslations("Create");
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("upload");
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null); // Base64-JPEG, auch Preview
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [archetype, setArchetype] = useState<Archetype>("spacer");
  const [stepIndex, setStepIndex] = useState(0);
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPhase("upload");
    setPhoto(null);
    setResult(null);
    setError(null);
    setStepIndex(0);
    setMeasured({});
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
      setPhase("suggest");
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

  const finish = (finalMeasured: Record<string, number>) => {
    const params: ParamValues = {
      ...ARCHETYPE_UI[archetype].defaults,
      ...derivedFor(archetype),
      ...finalMeasured,
    };
    const a = archetype;
    close();
    onComplete(a, params);
  };

  const stepperIndex = phase === "measure" ? 2 : phase === "suggest" ? 1 : 0;

  // ---- Eintrittskarte in der Sidebar ----
  if (!open) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
        <h2 className="font-semibold">{t("title")}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t("intro")}</p>
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          📷 {t("upload")}
        </button>
      </div>
    );
  }

  // ---- Vollbild-Overlay ----
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white">
      {/* Header mit Stepper */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <nav className="flex items-center gap-2 text-sm">
            {[t("stepPhoto"), t("stepType"), t("stepMeasure")].map((label, i) => (
              <span key={label} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-6 bg-zinc-300" />}
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                    i < stepperIndex
                      ? "bg-emerald-600 text-white"
                      : i === stepperIndex
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-200 text-zinc-500"
                  }`}
                >
                  {i < stepperIndex ? "✓" : i + 1}
                </span>
                <span
                  className={`hidden sm:inline ${
                    i === stepperIndex
                      ? "font-medium text-zinc-900"
                      : "text-zinc-400"
                  }`}
                >
                  {label}
                </span>
              </span>
            ))}
          </nav>
          <button
            onClick={close}
            aria-label={t("close")}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        {/* Schritt 1: Foto */}
        {(phase === "upload" || phase === "analyzing") && (
          <section>
            <h1 className="text-xl font-bold">{t("uploadTitle")}</h1>
            <p className="mt-1 text-sm text-zinc-500">{t("intro")}</p>

            {phase === "analyzing" && photo ? (
              <div className="relative mt-6 overflow-hidden rounded-2xl border border-zinc-200">
                <img
                  src={`data:image/jpeg;base64,${photo}`}
                  alt=""
                  className="max-h-96 w-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                  <div className="flex items-center gap-3 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t("analyzing")}
                  </div>
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
                className={`mt-6 flex min-h-64 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  dragOver
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-500 hover:bg-zinc-50"
                }`}
              >
                <span className="text-3xl">📷</span>
                <p className="font-medium text-zinc-700">{t("dropzone")}</p>
                <p className="text-sm text-zinc-400">{t("dropzoneHint")}</p>
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
            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </section>
        )}

        {/* Schritt 2: Bauteil-Typ */}
        {phase === "suggest" && result && (
          <section>
            <h1 className="text-xl font-bold">{t("suggestHeading")}</h1>
            <p className="mt-1 text-sm text-zinc-500">{t("suggestSub")}</p>

            <div className="mt-6 flex flex-col gap-6 sm:flex-row">
              {photo && (
                <img
                  src={`data:image/jpeg;base64,${photo}`}
                  alt=""
                  className="h-40 w-full rounded-xl border border-zinc-200 object-cover sm:w-40"
                />
              )}
              <div className="flex-1 space-y-2">
                {[result.archetype, ...result.alternative_archetypes].map(
                  (a, i) => (
                    <button
                      key={a}
                      onClick={() => setArchetype(a)}
                      className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${
                        archetype === a
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      <span className="font-medium">
                        {tc(`archetypes.${a}`)}
                      </span>
                      {i === 0 && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            archetype === a
                              ? "bg-emerald-500 text-white"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {Math.round(result.archetype_confidence * 100)} %
                        </span>
                      )}
                    </button>
                  ),
                )}
              </div>
            </div>

            {result.notes_de && (
              <div className="mt-4 flex gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <span>💡</span>
                <p>{result.notes_de}</p>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setPhase("upload");
                  setPhoto(null);
                  setResult(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-700 transition hover:border-zinc-500"
              >
                {t("replacePhoto")}
              </button>
              <button
                onClick={startMeasure}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                {t("startMeasure")} →
              </button>
            </div>
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
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium text-zinc-500">
                    {t("step", {
                      current: stepIndex + 1,
                      total: steps.length,
                    })}{" "}
                    · {tc(`archetypes.${archetype}`)}
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-zinc-900 transition-all duration-300"
                    style={{
                      width: `${((stepIndex + 1) / steps.length) * 100}%`,
                    }}
                  />
                </div>

                <div className="mt-8 flex flex-col gap-6 sm:flex-row">
                  {photo && (
                    <img
                      src={`data:image/jpeg;base64,${photo}`}
                      alt=""
                      className="h-32 w-full rounded-xl border border-zinc-200 object-cover sm:w-32"
                    />
                  )}
                  <div className="flex-1">
                    <h1 className="text-xl font-bold">
                      {t(`questions.${currentParam}`)}
                    </h1>
                    <p className="mt-2 flex gap-2 text-sm text-zinc-500">
                      <span>📏</span>
                      {t(`hints.${currentParam}`)}
                    </p>

                    <div className="mt-6 flex items-baseline gap-2">
                      <input
                        type="number"
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
                        className="w-36 rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-2xl font-semibold tabular-nums transition focus:border-zinc-900 focus:outline-none"
                        autoFocus
                      />
                      <span className="text-lg text-zinc-400">mm</span>
                    </div>
                    {range && (value < range.min || value > range.max) && (
                      <p className="mt-2 text-sm text-amber-700">
                        {t("rangeHint", { min: range.min, max: range.max })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex gap-2">
                  <button
                    onClick={() =>
                      stepIndex === 0
                        ? setPhase("suggest")
                        : setStepIndex((i) => i - 1)
                    }
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-700 transition hover:border-zinc-500"
                  >
                    ← {t("back")}
                  </button>
                  <button
                    onClick={() => {
                      const clamped = range
                        ? clamp(value, range.min, range.max)
                        : value;
                      const next = { ...measured, [currentParam]: clamped };
                      setMeasured(next);
                      if (isLast) finish(next);
                      else setStepIndex((i) => i + 1);
                    }}
                    disabled={!Number.isFinite(value) || value <= 0}
                    className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition enabled:hover:bg-zinc-700 disabled:opacity-40"
                  >
                    {isLast ? `${t("finish")} ✓` : `${t("next")} →`}
                  </button>
                </div>
              </section>
            );
          })()}
      </main>
    </div>
  );
}
