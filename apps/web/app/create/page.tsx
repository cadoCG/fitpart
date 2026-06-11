"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { FitClass, SpacerParams } from "@fitpart/shared";
import ParamSlider from "@/components/ParamSlider";

// three/WebGL nur im Browser laden.
const StlViewer = dynamic(() => import("@/components/StlViewer"), {
  ssr: false,
});

const DEBOUNCE_MS = 400;

type Params = {
  inner_d: number;
  outer_d: number;
  height: number;
  fit: FitClass;
};

const DEFAULTS: Params = { inner_d: 5, outer_d: 10, height: 8, fit: "sliding" };

export default function CreatePage() {
  const t = useTranslations("Create");
  const [params, setParams] = useState<Params>(DEFAULTS);
  const [stl, setStl] = useState<ArrayBuffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const set = (patch: Partial<Params>) =>
    setParams((p) => ({ ...p, ...patch }));

  // Debounced Live-Regenerate bei jeder Parameteränderung.
  useEffect(() => {
    const parsed = SpacerParams.safeParse(params);
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
            archetype: "spacer",
            params: parsed.data,
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
  }, [params]);

  const download = () => {
    if (!stl) return;
    const url = URL.createObjectURL(new Blob([stl], { type: "model/stl" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "spacer.stl";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl gap-8 px-6 py-10 md:grid-cols-[20rem_1fr]">
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>
        </header>

        <ParamSlider
          label={t("params.inner_d")}
          value={params.inner_d}
          min={2}
          max={50}
          onChange={(v) => set({ inner_d: v })}
        />
        <ParamSlider
          label={t("params.outer_d")}
          value={params.outer_d}
          min={4}
          max={80}
          onChange={(v) => set({ outer_d: v })}
        />
        <ParamSlider
          label={t("params.height")}
          value={params.height}
          min={1}
          max={100}
          onChange={(v) => set({ height: v })}
        />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">
            {t("params.fit")}
          </span>
          <select
            value={params.fit}
            onChange={(e) => set({ fit: e.target.value as FitClass })}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {FitClass.options.map((fit) => (
              <option key={fit} value={fit}>
                {t(`fit.${fit}`)}
              </option>
            ))}
          </select>
        </label>

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

      <section className="flex min-h-[24rem] flex-col overflow-hidden rounded-xl border border-zinc-200">
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
