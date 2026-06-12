"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { FitVerdict } from "@fitpart/shared";
import { Button } from "@/components/ui";
import FeedbackForm from "@/components/FeedbackForm";
import {
  duePendingFeedback,
  resolvePendingFeedback,
  type PendingFeedback,
} from "@/lib/feedback";

/**
 * In-App-Einstieg in den fit_feedback-Loop: Liegt ein Download ≥ 48 h zurück
 * und ist unbewertet, erscheint auf /create diese Karte. Deckt auch anonyme
 * Nutzer ab (Token aus localStorage), die keine n8n-Mail bekommen.
 */
export default function FeedbackPrompt() {
  const t = useTranslations("Feedback");
  const tc = useTranslations("Create");
  const format = useFormatter();
  const [pending, setPending] = useState<PendingFeedback | null>(null);
  const [done, setDone] = useState(false);

  // localStorage gibt es nur im Browser → nach dem Mount lesen.
  useEffect(() => {
    setPending(duePendingFeedback());
  }, []);

  if (!pending) return null;

  const finish = (verdict?: FitVerdict) => {
    resolvePendingFeedback(pending.token);
    if (verdict && verdict !== "not_printed") setDone(true);
    else setPending(null);
  };

  return (
    <section
      className="fp-card fp-card--pad flex flex-col"
      style={{ gap: "var(--space-3)" }}
      aria-label={t("title")}
    >
      {done ? (
        <div className="fp-panel fp-panel--ok">{t("thanks")}</div>
      ) : (
        <>
          <header className="flex items-center" style={{ gap: "var(--space-2)" }}>
            <strong style={{ font: "var(--type-body)" }}>{t("title")}</strong>
            <Button
              variant="ghost"
              onClick={() => setPending(null)}
              aria-label={t("later")}
              style={{ marginLeft: "auto" }}
            >
              {t("later")}
            </Button>
          </header>
          <p
            style={{
              font: "var(--type-body-sm)",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            {t("partLine", {
              archetype: tc(`archetypes.${pending.archetype}`),
              date: format.dateTime(new Date(pending.at), {
                day: "numeric",
                month: "long",
              }),
            })}
          </p>
          <FeedbackForm token={pending.token} onDone={finish} />
        </>
      )}
    </section>
  );
}
