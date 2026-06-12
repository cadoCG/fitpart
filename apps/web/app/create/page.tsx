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
import AccountBar from "@/components/AccountBar";
import { Logo } from "@/components/Logo";
import MeasureWizard from "@/components/MeasureWizard";
import ParamSlider from "@/components/ParamSlider";
import PartRequestPanel from "@/components/PartRequestPanel";
import {
  Badge,
  Button,
  Field,
  PrintRecPanel,
  Select,
  ViewerFrame,
} from "@/components/ui";
import { loadActiveTolerance } from "@/lib/profiles";

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
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ToleranceProfile | null>(null);
  const [photoNotes, setPhotoNotes] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Kalibrier-Profil laden (Cloud vor localStorage) und auf alle
  // Generierungen anwenden.
  useEffect(() => {
    void loadActiveTolerance().then(setProfile);
  }, []);

  const set = (key: string, value: number | string | boolean) =>
    setParams((p) => ({ ...p, [key]: value }));

  const switchArchetype = (next: Archetype) => {
    setArchetype(next);
    setParams(ARCHETYPE_UI[next].defaults);
    setStl(null);
    setPhotoNotes(null);
  };

  // Ergebnis aus dem Foto-/Mess-Wizard übernehmen (Archetyp + vorbefüllte Params).
  const applyWizardResult = (
    next: Archetype,
    wizardParams: ParamValues,
    notes?: string,
  ) => {
    setArchetype(next);
    setParams(wizardParams);
    setStl(null);
    setPhotoNotes(notes ?? null);
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

  const saveBlob = (data: BlobPart, type: string, ext: string) => {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${archetype}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // STL kommt aus der Vorschau (gecacht); 3MF wird frisch geholt, weil es
  // zusätzlich die Druckempfehlung als Metadaten trägt.
  const download = async (format: "stl" | "3mf") => {
    if (format === "stl") {
      if (stl) saveBlob(stl, "model/stl", "stl");
      return;
    }
    const parsed = ARCHETYPE_SCHEMAS[archetype].safeParse(params);
    if (!parsed.success) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/cad/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archetype,
          params: parsed.data,
          ...(profile ? { tolerance_profile: profile } : {}),
          format: "3mf",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      saveBlob(await res.arrayBuffer(), "model/3mf", "3mf");
    } catch (e) {
      setError(
        `${t("errorGenerate")}: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setDownloading(false);
    }
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
          <label key={field.key} className="fp-checkbox">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => set(field.key, e.target.checked)}
            />
            <span>{t(`params.${field.key}`)}</span>
          </label>
        );
      case "fit":
        return (
          <Field key={field.key} label={t("params.fit")}>
            <Select
              value={String(value)}
              onChange={(e) => set(field.key, e.target.value)}
              options={FitClass.options.map((fit) => ({
                value: fit,
                label: t(`fit.${fit}`),
              }))}
            />
          </Field>
        );
      case "select":
        return (
          <Field key={field.key} label={t(`params.${field.key}`)}>
            <Select
              value={String(value)}
              onChange={(e) => set(field.key, e.target.value)}
              options={field.options.map((opt) => ({
                value: opt,
                label: t(`options.${opt}`),
              }))}
            />
          </Field>
        );
    }
  };

  const calibrated = Boolean(profile?.calibrated);

  return (
    <div style={{ minHeight: "100%", background: "var(--surface-page)" }}>
      <main className="fpk-werkbank">
        <section className="flex flex-col" style={{ gap: "var(--space-5)" }}>
          <Link href="/" aria-label="FitPart Startseite" style={{ width: "fit-content" }}>
            <Logo size={24} />
          </Link>
          <header>
            <h1 style={{ font: "var(--type-h1)", letterSpacing: "var(--tracking-heading)", margin: 0 }}>
              {t("title")}
            </h1>
            <p
              style={{
                font: "var(--type-body-sm)",
                color: "var(--text-secondary)",
                margin: "var(--space-1) 0 0",
              }}
            >
              {t("subtitle")}
            </p>
          </header>

          <AccountBar />

          <MeasureWizard onComplete={applyWizardResult} />

          <Link
            href="/calibrate"
            className={`fp-panel fp-panel--${calibrated ? "ok" : "warn"} flex w-full items-center gap-2`}
            style={{ font: "var(--type-body-sm)", fontWeight: 500 }}
          >
            <span
              className="fp-badge__dot"
              style={{ background: "currentColor", width: 7, height: 7 }}
              aria-hidden
            />
            {calibrated ? t("calibrated") : t("notCalibrated")}
            <span style={{ marginLeft: "auto", opacity: 0.6 }} aria-hidden>
              →
            </span>
          </Link>

          <Field label={t("archetype")}>
            <Select
              value={archetype}
              onChange={(e) => switchArchetype(e.target.value as Archetype)}
              options={ARCHETYPES.map((a) => ({ value: a, label: t(`archetypes.${a}`) }))}
            />
          </Field>

          <PartRequestPanel />

          {ARCHETYPE_UI[archetype].fields.map(renderField)}

          {error && <div className="fp-panel fp-panel--error">{error}</div>}

          <PrintRecPanel
            title={t("printRec.title")}
            rows={[
              { label: t("printRec.material"), value: t(`printRec.${archetype}.material`) },
              { label: t("printRec.orientation"), value: t(`printRec.${archetype}.orientation`) },
              { label: t("printRec.infill"), value: t(`printRec.${archetype}.infill`) },
            ]}
            note={photoNotes ?? undefined}
            noteLabel={`${t("printRec.fromPhoto")}:`}
          />

          <div className="fpk-downloads">
            <Button
              block
              onClick={() => void download("3mf")}
              disabled={!stl || busy || downloading}
              loading={busy || downloading}
              hint={busy || downloading ? undefined : t("download3mfHint")}
            >
              {busy || downloading ? t("generating") : t("download3mf")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void download("stl")}
              disabled={!stl || busy || downloading}
            >
              {t("downloadStl")}
            </Button>
          </div>
        </section>

        <section className="fpk-werkbank__viewer">
          <ViewerFrame
            height="clamp(300px, 58vh, 580px)"
            hint={t("viewerHint")}
            badge={
              <span className="flex" style={{ gap: "var(--space-2)" }}>
                <Badge variant="accent">{t(`archetypes.${archetype}`)}</Badge>
                {busy && <Badge>{t("generating")}</Badge>}
              </span>
            }
          >
            <div className="absolute inset-0">
              {stl ? (
                <StlViewer stl={stl} />
              ) : (
                <div
                  className="flex h-full items-center justify-center"
                  style={{ font: "var(--type-body-sm)", color: "var(--text-tertiary)" }}
                >
                  {busy ? t("generating") : t("noPreview")}
                </div>
              )}
            </div>
          </ViewerFrame>
        </section>
      </main>
    </div>
  );
}
