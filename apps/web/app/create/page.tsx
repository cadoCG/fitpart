"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ARCHETYPES,
  ARCHETYPE_SCHEMAS,
  ARCHETYPE_UI,
  DimensionsResponse,
  FitClass,
  type Archetype,
  type CreditSku,
  type DimensionSpec,
  type FieldMeta,
  type ToleranceProfile,
} from "@fitpart/shared";
import AccountBar from "@/components/AccountBar";
import FeedbackPrompt from "@/components/FeedbackPrompt";
import { Logo } from "@/components/Logo";
import MeasureWizard from "@/components/MeasureWizard";
import ParamSlider from "@/components/ParamSlider";
import Paywall from "@/components/Paywall";
import PartRequestPanel from "@/components/PartRequestPanel";
import {
  Badge,
  Button,
  Field,
  PrintRecPanel,
  Select,
  ViewerFrame,
} from "@/components/ui";
import { downloadPart, fetchBillingState } from "@/lib/billing";
import { rememberPendingFeedback } from "@/lib/feedback";
import { loadActiveTolerance } from "@/lib/profiles";

// three/WebGL nur im Browser laden.
const StlViewer = dynamic(() => import("@/components/StlViewer"), {
  ssr: false,
});

const DEBOUNCE_MS = 400;

type ParamValues = Record<string, number | string | boolean>;

export default function CreatePage() {
  const t = useTranslations("Create");
  const tb = useTranslations("Billing");
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
  // Billing (Pay-per-Part): credits = Guthaben des angemeldeten Users
  // (null = unbekannt/anonym). Paywall/Login-Hinweis bei fehlendem Zugang.
  const [authed, setAuthed] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [buyNotice, setBuyNotice] = useState<string | null>(null);
  // Bemassungs-Anker vom CAD-Service (semantisch, in Template-Koordinaten)
  // plus die Nennmasse zum Fetch-Zeitpunkt – damit kann der Viewer die
  // Masslinie beim Tippen/Ziehen live strecken, bevor frische Anker da sind.
  const [dimSpecs, setDimSpecs] = useState<{
    specs: DimensionSpec[];
    base: Record<string, number>;
  }>({ specs: [], base: {} });
  const abortRef = useRef<AbortController | null>(null);

  // Kalibrier-Profil laden (Cloud vor localStorage) und auf alle
  // Generierungen anwenden.
  useEffect(() => {
    void loadActiveTolerance().then(setProfile);
  }, []);

  // Guthabenstand laden (vergibt lazy die Welcome-Credits beim ersten Mal).
  const refreshBilling = () =>
    void fetchBillingState().then((s) => {
      setAuthed(Boolean(s?.authenticated));
      setCredits(s?.authenticated ? (s.credits ?? 0) : null);
    });
  useEffect(refreshBilling, []);

  const set = (key: string, value: number | string | boolean) =>
    setParams((p) => ({ ...p, [key]: value }));

  const switchArchetype = (next: Archetype) => {
    setArchetype(next);
    setParams(ARCHETYPE_UI[next].defaults);
    setStl(null);
    setDimSpecs({ specs: [], base: {} });
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
    setDimSpecs({ specs: [], base: {} });
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

      // Bemassungs-Anker parallel zur Generierung holen (reine Param-
      // Arithmetik im CAD-Service). Fehler hier sind nicht kritisch –
      // dann gibt es einfach keine 3D-Bemassung.
      void fetch("/api/cad/dimensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archetype, params: parsed.data }),
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          const dims = DimensionsResponse.safeParse(json);
          if (!dims.success) return;
          const base: Record<string, number> = {};
          for (const [k, v] of Object.entries(parsed.data)) {
            if (typeof v === "number") base[k] = v;
          }
          setDimSpecs({ specs: dims.data.dims, base });
        })
        .catch(() => {});

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

  const saveBlob = (data: Blob, ext: string) => {
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${archetype}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Gated Download (Billing): zieht einen Credit oder ist gratis, wenn das
  // Teil schon freigeschaltet ist. 401 → Konto-Hinweis, 402 → Paywall.
  const download = async (format: "stl" | "3mf") => {
    const parsed = ARCHETYPE_SCHEMAS[archetype].safeParse(params);
    if (!parsed.success) return;
    setAuthNeeded(false);
    setDownloading(true);
    try {
      const result = await downloadPart({
        archetype,
        params: parsed.data,
        ...(profile ? { tolerance_profile: profile } : {}),
        format,
      });
      if (result.ok) {
        saveBlob(result.blob, format);
        setCredits(result.credits);
        setAuthed(true);
        if (result.feedbackToken) {
          rememberPendingFeedback(result.feedbackToken, archetype);
        }
      } else if (result.reason === "auth_required") {
        setAuthNeeded(true);
      } else if (result.reason === "no_credits") {
        setCredits(0);
        setPaywall(true);
      } else {
        setError(`${t("errorGenerate")}: HTTP ${result.status}`);
      }
    } finally {
      setDownloading(false);
    }
  };

  // Phase A: Checkout folgt in Phase B (Stripe). Hier nur ein Hinweis.
  const startCheckout = (_sku: CreditSku) => {
    setBuyNotice(t("checkoutSoon"));
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
        // Label über den Key auflösen – adapter_ring hat zwei Fit-Felder
        // (fit_outer/fit_inner), alle anderen das generische "fit".
        return (
          <Field key={field.key} label={t(`params.${field.key}`)}>
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

  // Bemassung direkt am 3D-Modell: semantische Anker vom CAD-Service,
  // angereichert um Label/Ranges aus i18n + UI-Registry; angezeigt und
  // editiert wird das Nennmass aus dem Param-State.
  const viewerDims = dimSpecs.specs.flatMap((spec) => {
    const field = ARCHETYPE_UI[archetype].fields.find(
      (f) => f.key === spec.param,
    );
    if (!field || (field.kind !== "slider" && field.kind !== "int")) return [];
    const value = Number(params[spec.param]);
    return [
      {
        param: spec.param,
        kind: spec.kind,
        p1: spec.p1,
        p2: spec.p2,
        offsetDir: spec.offset_dir,
        label: t(`params.${spec.param}`),
        value,
        baseValue: dimSpecs.base[spec.param] ?? value,
        min: field.min,
        max: field.max,
        step: field.kind === "int" ? 1 : (field.step ?? 0.1),
      },
    ];
  });

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

          <FeedbackPrompt />

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

          {authed && credits !== null && (
            <div
              className="fp-panel flex items-center gap-2"
              style={{ font: "var(--type-body-sm)" }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                {tb("creditsLabel")}
              </span>
              <strong style={{ marginLeft: "auto" }}>{credits}</strong>
            </div>
          )}

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

          {authNeeded && (
            <div className="fp-panel fp-panel--warn flex items-center gap-2" style={{ font: "var(--type-body-sm)" }}>
              {tb("authRequired")}
              <Link href="/login" style={{ marginLeft: "auto", fontWeight: 600, textDecoration: "underline" }}>
                {tb("toLogin")}
              </Link>
            </div>
          )}

          <Paywall
            open={paywall}
            credits={credits}
            onBuy={startCheckout}
            onClose={() => {
              setPaywall(false);
              setBuyNotice(null);
            }}
            notice={buyNotice}
          />
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
                <StlViewer stl={stl} dims={viewerDims} onDimChange={set} />
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
