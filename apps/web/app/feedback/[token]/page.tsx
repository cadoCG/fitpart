"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { FeedbackPartInfo, type FitVerdict } from "@fitpart/shared";
import FeedbackForm from "@/components/FeedbackForm";
import { Logo } from "@/components/Logo";
import { resolvePendingFeedback } from "@/lib/feedback";

/**
 * Landing für den "Hat's gepasst?"-Mail-Link (n8n, 48 h nach Download).
 * Der uuid-Token in der URL ist die Capability – kein Login nötig.
 */
export default function FeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const t = useTranslations("Feedback");
  const tc = useTranslations("Create");
  const format = useFormatter();
  const [info, setInfo] = useState<FeedbackPartInfo | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "done">(
    "loading",
  );

  useEffect(() => {
    fetch(`/api/feedback?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const parsed = FeedbackPartInfo.safeParse(await res.json());
        if (!parsed.success) throw new Error();
        setInfo(parsed.data);
        setState("ready");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const onDone = (verdict: FitVerdict) => {
    void verdict;
    // Falls derselbe Download auch lokal vorgemerkt ist: nicht doppelt fragen.
    resolvePendingFeedback(token);
    setState("done");
  };

  // Archetyp-Label tolerant auflösen – der Link kann älter sein als die
  // aktuelle Archetyp-Liste.
  const archetypeLabel = (a: string) => {
    try {
      return tc(`archetypes.${a}`);
    } catch {
      return a;
    }
  };

  return (
    <div style={{ minHeight: "100%", background: "var(--surface-page)" }}>
      <main
        className="mx-auto flex flex-col"
        style={{ maxWidth: 560, padding: "var(--space-6)", gap: "var(--space-5)" }}
      >
        <Link href="/" aria-label="FitPart Startseite" style={{ width: "fit-content" }}>
          <Logo size={24} />
        </Link>

        <header>
          <h1 style={{ font: "var(--type-h1)", letterSpacing: "var(--tracking-heading)", margin: 0 }}>
            {t("title")}
          </h1>
          {info && state === "ready" && (
            <p
              style={{
                font: "var(--type-body-sm)",
                color: "var(--text-secondary)",
                margin: "var(--space-1) 0 0",
              }}
            >
              {t("partLine", {
                archetype: archetypeLabel(info.archetype),
                date: format.dateTime(new Date(info.created_at), {
                  day: "numeric",
                  month: "long",
                }),
              })}
            </p>
          )}
        </header>

        {state === "loading" && (
          <div className="fp-panel">{t("loading")}</div>
        )}

        {state === "invalid" && (
          <div className="fp-panel fp-panel--error">{t("invalid")}</div>
        )}

        {state === "ready" && info?.has_feedback && (
          <div className="fp-panel fp-panel--ok">{t("already")}</div>
        )}

        {state === "ready" && (
          <div className="fp-card fp-card--pad">
            <FeedbackForm token={token} onDone={onDone} />
          </div>
        )}

        {state === "done" && (
          <>
            <div className="fp-panel fp-panel--ok">{t("thanks")}</div>
            <Link href="/create" className="fp-btn fp-btn--secondary" style={{ width: "fit-content" }}>
              {t("backToCreate")}
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
