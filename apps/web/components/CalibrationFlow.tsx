"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import {
  HOLE_LADDER_MM,
  SHAFT_LADDER_MM,
  SLOT_LADDER_MM,
  type ToleranceProfile,
} from "@fitpart/shared";
import { saveCalibration } from "@/lib/profiles";
import { Button, Card, Field, Input, LadderPicker, Panel } from "@/components/ui";

type Answers = {
  snug_hole_mm: number | null;
  snug_shaft_mm: number | null;
  snug_slot_mm: number | null;
  nozzle_mm: number;
};

const INITIAL: Answers = {
  snug_hole_mm: null,
  snug_shaft_mm: null,
  snug_slot_mm: null,
  nozzle_mm: 0.4,
};

function downloadCoupon() {
  // Coupon mit Beschriftung generieren und herunterladen.
  fetch("/api/cad/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      archetype: "calibration_coupon",
      params: { labels: true },
      format: "stl",
    }),
  })
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      const url = URL.createObjectURL(new Blob([buf], { type: "model/stl" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "fitpart_kalibrier_coupon.stl";
      a.click();
      URL.revokeObjectURL(url);
    });
}

export default function CalibrationFlow() {
  const t = useTranslations("Calibrate");
  const [answers, setAnswers] = useState<Answers>(INITIAL);
  const [profile, setProfile] = useState<ToleranceProfile | null>(null);
  const [busy, setBusy] = useState(false);

  const ladderField = (
    label: string,
    key: "snug_hole_mm" | "snug_shaft_mm" | "snug_slot_mm",
    values: readonly number[],
  ) => (
    <div>
      <p style={{ font: "var(--type-label)", margin: "0 0 var(--space-2)" }}>{label}</p>
      <LadderPicker
        values={values}
        selected={answers[key]}
        onChange={(v) => setAnswers((a) => ({ ...a, [key]: v }))}
      />
    </div>
  );

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/cad/calibration/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const p = (await res.json()) as ToleranceProfile;
      // Angemeldet → neues aktives Cloud-Profil; immer auch localStorage.
      await saveCalibration(p);
      setProfile(p);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-6)" }}>
      <Card>
        <h2 style={{ font: "var(--type-h3)", margin: "0 0 var(--space-1)" }}>{t("step1.title")}</h2>
        <p
          style={{
            font: "var(--type-body-sm)",
            color: "var(--text-secondary)",
            margin: "0 0 var(--space-4)",
          }}
        >
          {t("step1.body")}
        </p>
        <Button variant="secondary" onClick={downloadCoupon}>
          <Download size={16} strokeWidth={2} aria-hidden />
          {t("step1.download")}
        </Button>
      </Card>

      <Card>
        <h2 style={{ font: "var(--type-h3)", margin: "0 0 var(--space-1)" }}>{t("step2.title")}</h2>
        <p
          style={{
            font: "var(--type-body-sm)",
            color: "var(--text-secondary)",
            margin: "0 0 var(--space-5)",
          }}
        >
          {t("step2.body")}
        </p>

        <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
          {ladderField(t("step2.hole"), "snug_hole_mm", HOLE_LADDER_MM)}
          {ladderField(t("step2.shaft"), "snug_shaft_mm", SHAFT_LADDER_MM)}
          {ladderField(t("step2.slot"), "snug_slot_mm", SLOT_LADDER_MM)}
          <div style={{ maxWidth: 160 }}>
            <Field label={t("step2.nozzle")}>
              <Input
                type="number"
                step={0.1}
                min={0.1}
                value={answers.nozzle_mm}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, nozzle_mm: Number(e.target.value) }))
                }
                style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}
              />
            </Field>
          </div>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <Button onClick={submit} loading={busy}>
            {busy ? t("step2.saving") : t("step2.save")}
          </Button>
        </div>
      </Card>

      {profile && (
        <Panel variant="ok" title={t("result.title")}>
          <ul
            className="m-0 flex flex-wrap"
            style={{
              gap: "var(--space-2) var(--space-6)",
              padding: 0,
              listStyle: "none",
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
              margin: "var(--space-2) 0",
            }}
          >
            <li>{t("result.hole")}: {profile.hole_offset_mm.toFixed(2)} mm</li>
            <li>{t("result.shaft")}: {profile.shaft_offset_mm.toFixed(2)} mm</li>
            <li>{t("result.slot")}: {profile.slot_offset_mm.toFixed(2)} mm</li>
          </ul>
          {t("result.applied")}
        </Panel>
      )}
    </div>
  );
}
