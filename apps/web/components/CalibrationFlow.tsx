"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  HOLE_LADDER_MM,
  SHAFT_LADDER_MM,
  SLOT_LADDER_MM,
  type ToleranceProfile,
} from "@fitpart/shared";
import { saveProfile } from "@/lib/profile";

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

  const ladder = (
    key: "snug_hole_mm" | "snug_shaft_mm" | "snug_slot_mm",
    values: readonly number[],
  ) => (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => {
        const active = answers[key] === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => setAnswers((a) => ({ ...a, [key]: active ? null : v }))}
            className={`rounded-md border px-3 py-1.5 text-sm tabular-nums transition ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white hover:border-zinc-500"
            }`}
          >
            {v.toFixed(1)}
          </button>
        );
      })}
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
      saveProfile(p);
      setProfile(p);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">{t("step1.title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("step1.body")}</p>
        <button
          onClick={downloadCoupon}
          className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {t("step1.download")}
        </button>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">{t("step2.title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("step2.body")}</p>

        <div className="mt-4 space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">{t("step2.hole")}</p>
            {ladder("snug_hole_mm", HOLE_LADDER_MM)}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">{t("step2.shaft")}</p>
            {ladder("snug_shaft_mm", SHAFT_LADDER_MM)}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">{t("step2.slot")}</p>
            {ladder("snug_slot_mm", SLOT_LADDER_MM)}
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t("step2.nozzle")}</span>
            <input
              type="number"
              step={0.1}
              min={0.1}
              value={answers.nozzle_mm}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, nozzle_mm: Number(e.target.value) }))
              }
              className="w-24 rounded border border-zinc-300 px-2 py-1 text-right text-sm"
            />
          </label>
        </div>

        <button
          onClick={submit}
          disabled={busy}
          className="mt-5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {busy ? t("step2.saving") : t("step2.save")}
        </button>
      </section>

      {profile && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-semibold text-emerald-900">{t("result.title")}</h2>
          <ul className="mt-2 space-y-1 text-sm tabular-nums text-emerald-900">
            <li>{t("result.hole")}: {profile.hole_offset_mm.toFixed(2)} mm</li>
            <li>{t("result.shaft")}: {profile.shaft_offset_mm.toFixed(2)} mm</li>
            <li>{t("result.slot")}: {profile.slot_offset_mm.toFixed(2)} mm</li>
          </ul>
          <p className="mt-3 text-sm text-emerald-800">{t("result.applied")}</p>
        </section>
      )}
    </div>
  );
}
