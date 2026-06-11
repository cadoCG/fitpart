"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ARCHETYPES,
  ARCHETYPE_SCHEMAS,
  ARCHETYPE_UI,
  FitClass,
  type Archetype,
  type FieldMeta,
  type ToleranceProfile,
} from "@fitpart/shared";
import ParamSlider from "@/components/ParamSlider";
import { loadProfile } from "@/lib/profile";

// three/WebGL nur im Browser laden.
const StlViewer = dynamic(() => import("@/components/StlViewer"), {
  ssr: false,
});

const DEBOUNCE_MS = 400;

type ParamValues = Record<string, number | string | boolean>;

export default function CreatePage() {
  const t = useTranslations("Create");
  const [archetype, setArchetype] = useState<Archetype>("spacer");
  const [params, setParams] = useState<ParamValues>(
    ARCHETYPE_UI.spacer.defaults,
  );
  const [stl, setStl] = useState<ArrayBuffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ToleranceProfile | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Kalibrier-Profil (falls vorhanden) laden und auf alle Generierungen anwenden.
  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const set = (key: string, value: number | string | boolean) =>
    setParams((p) => ({ ...p, [key]: value }));

  const switchArchetype = (next: Archetype) => {
    setArchetype(next);
    setParams(ARCHETYPE_UI[next].defaults);
    setStl(null);
  };

  // Debounced Live-Regenerate bei jeder Parameteränderung.
  useEffect(() => {
    const parsed = ARCHETYPE_SCHEMAS[archetype].safeParse(params);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ungültige Parameter");
      return;
    }
    setError(null);

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      try {
        const res = await fetch("/api/cad/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            archetype,
            params: parsed.data,
            ...(profile ? { tolerance_profile: profile } : {}),
            format: "stl",
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(
            detail?.detail?.message ?? detail?.error ?? `HTTP ${res.status}`,
          );
        }
        setStl(await res.arrayBuffer());
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(
          `${t("errorGenerate")}: ${e instanceof Error ? e.message : String(e)}`,
        );
      } finally {
        if (abortRef.current === ctrl) setBusy(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archetype, params, profile]);

  const download = () => {
    if (!stl) return;
    const url = URL.createObjectURL(new Blob([stl], { type: "model/stl" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${archetype}.stl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderField = (field: FieldMeta) => {
    const value = params[field.key];
    switch (field.kind) {
      case "slider":
        return (
          <ParamSlider
            key={field.key}
            label={t(`params.${field.key}`)}
            value={Number(value)}
            min={field.min}
            max={field.max}
            step={field.step ?? 0.1}
            onChange={(v) => set(field.key, v)}
          />
        );
      case "int":
        return (
          <ParamSlider
            key={field.key}
            label={t(`params.${field.key}`)}
            value={Number(value)}
            min={field.min}
            max={field.max}
            step={1}
            unit=""
            onChange={(v) => set(field.key, Math.round(v))}
          />
        );
      case "boolean":
        return (
          <label key={field.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => set(field.key, e.target.checked)}
              className="size-4 accent-zinc-900"
            />
            <span className="text-sm font-medium text-zinc-700">
              {t(`params.${field.key}`)}
            </span>
          </label>
        );
      case "fit":
        return (
          <label key={field.key} className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              {t("params.fit")}
            </span>
            <select
              value={String(value)}
              onChange={(e) => set(field.key, e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {FitClass.options.map((fit) => (
                <option key={fit} value={fit}>
                  {t(`fit.${fit}`)}
                </option>
              ))}
            </select>
          </label>
        );
      case "select":
        return (
          <label key={field.key} className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              {t(`params.${field.key}`)}
            </span>
            <select
              value={String(value)}
              onChange={(e) => set(field.key, e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`options.${opt}`)}
                </option>
              ))}
            </select>
          </label>
        );
    }
  };

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl gap-8 px-6 py-10 md:grid-cols-[20rem_1fr]">
      <section className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>
        </header>

        <Link
          href="/calibrate"
          className={`block rounded-lg border px-3 py-2 text-sm transition ${
            profile?.calibrated
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400"
          }`}
        >
          {profile?.calibrated ? t("calibrated") : t("notCalibrated")}
        </Link>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">
            {t("archetype")}
          </span>
          <select
            value={archetype}
            onChange={(e) => switchArchetype(e.target.value as Archetype)}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium"
          >
            {ARCHETYPES.map((a) => (
              <option key={a} value={a}>
                {t(`archetypes.${a}`)}
              </option>
            ))}
          </select>
        </label>

        {ARCHETYPE_UI[archetype].fields.map(renderField)}

        {error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          onClick={download}
          disabled={!stl || busy}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition enabled:hover:bg-zinc-700 disabled:opacity-40"
        >
          {busy ? t("generating") : t("download")}
        </button>
      </section>

      <section className="flex min-h-[24rem] flex-col overflow-hidden rounded-xl border border-zinc-200 md:sticky md:top-10 md:max-h-[calc(100vh-5rem)]">
        {stl ? (
          <StlViewer stl={stl} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
            {busy ? t("generating") : t("noPreview")}
          </div>
        )}
        <p className="border-t border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-400">
          {t("viewerHint")}
        </p>
      </section>
    </main>
  );
}
