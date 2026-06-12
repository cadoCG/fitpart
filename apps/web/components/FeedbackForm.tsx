"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { FitVerdict } from "@fitpart/shared";
import { Button } from "@/components/ui";
import { submitFeedback } from "@/lib/feedback";

/**
 * "Hat's gepasst?"-Formular: Verdict-Buttons, bei zu eng/zu locker eine
 * Schweregrad-Nachfrage (wird als offset_hint_mm gespeichert – das
 * quantitative Lernsignal für die Toleranz-Engine), optionaler Kommentar.
 */

const SEVERITY_MM = { slight: 0.1, strong: 0.3 } as const;

export default function FeedbackForm({
  token,
  onDone,
}: {
  token: string;
  onDone?: (verdict: FitVerdict) => void;
}) {
  const t = useTranslations("Feedback");
  const [verdict, setVerdict] = useState<FitVerdict | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsSeverity = verdict === "too_tight" || verdict === "too_loose";

  const send = async (offsetHintMm?: number) => {
    if (!verdict) return;
    setBusy(true);
    setError(null);
    try {
      await submitFeedback(token, verdict, offsetHintMm, comment.trim() || undefined);
      onDone?.(verdict);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const verdictButton = (v: FitVerdict) => (
    <Button
      key={v}
      variant={verdict === v ? "primary" : "secondary"}
      onClick={() => setVerdict(v)}
      disabled={busy}
    >
      {t(`verdict.${v}`)}
    </Button>
  );

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
      <div className="flex flex-wrap" style={{ gap: "var(--space-2)" }}>
        {(["fits", "too_tight", "too_loose", "not_printed"] as const).map(
          verdictButton,
        )}
      </div>

      {verdict && (
        <>
          <label className="flex flex-col" style={{ gap: "var(--space-2)" }}>
            <span style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)" }}>
              {t("commentLabel")}
            </span>
            <textarea
              className="fp-input"
              rows={2}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("commentPlaceholder")}
            />
          </label>

          {needsSeverity ? (
            <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
              <span style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)" }}>
                {t("severityQuestion")}
              </span>
              <div className="flex flex-wrap" style={{ gap: "var(--space-2)" }}>
                <Button onClick={() => void send(SEVERITY_MM.slight)} loading={busy}>
                  {t("severity.slight")}
                </Button>
                <Button onClick={() => void send(SEVERITY_MM.strong)} loading={busy}>
                  {t("severity.strong")}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => void send()} loading={busy}>
              {t("submit")}
            </Button>
          )}

          {needsSeverity && (
            <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: 0 }}>
              {t("calibrateHint")}{" "}
              <Link href="/calibrate" style={{ textDecoration: "underline" }}>
                {t("calibrateLink")}
              </Link>
            </p>
          )}
        </>
      )}

      {error && <div className="fp-panel fp-panel--error">{error}</div>}
    </div>
  );
}
