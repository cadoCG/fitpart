"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { useUser } from "@/lib/useUser";
import { submitPartRequest } from "@/lib/partRequest";

/**
 * "Dein Teil ist nicht dabei?"-Einstieg für den "Ohne Foto"-Flow (ADR-002).
 * Wer im Bauteil-Typ-Dropdown nichts Passendes findet, beschreibt das Teil hier
 * → landet (ohne Foto) in part_requests als Nachfrage-Signal für die Roadmap.
 */
export default function PartRequestPanel() {
  const t = useTranslations("Measure.noMatch");
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setState("sending");
    try {
      await submitPartRequest({
        description,
        email: email.trim() || undefined,
        share_photo: false,
      });
      setState("done");
    } catch (e) {
      setError(
        `${t("errorSubmit")}: ${e instanceof Error ? e.message : String(e)}`,
      );
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div
        className="fp-panel fp-panel--ok flex items-center gap-2"
        style={{ font: "var(--type-body-sm)", fontWeight: 500 }}
      >
        <CircleCheck size={16} strokeWidth={2.5} aria-hidden />
        {t("doneTitle")} {t("doneBodyShort")}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          font: "var(--type-body-sm)",
          color: "var(--text-secondary)",
          textDecoration: "underline",
          textUnderlineOffset: 3,
          background: "none",
          border: 0,
          cursor: "pointer",
          width: "fit-content",
          padding: 0,
        }}
      >
        {t("missingTypeTrigger")}
      </button>
    );
  }

  return (
    <div className="fp-card fp-card--pad flex flex-col" style={{ gap: "var(--space-3)" }}>
      <div>
        <h3 style={{ font: "var(--type-h3)", margin: 0 }}>
          {t("missingTypeHeading")}
        </h3>
        <p
          style={{
            font: "var(--type-body-sm)",
            color: "var(--text-secondary)",
            margin: "var(--space-1) 0 0",
            textWrap: "pretty",
          }}
        >
          {t("sub")}
        </p>
      </div>

      <label className="flex flex-col" style={{ gap: "var(--space-2)" }}>
        <span style={{ font: "var(--type-label)" }}>{t("descriptionLabel")}</span>
        <textarea
          className="fp-input"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          maxLength={2000}
          style={{ resize: "vertical" }}
          autoFocus
        />
      </label>

      {!user && (
        <label className="flex flex-col" style={{ gap: "var(--space-2)" }}>
          <span style={{ font: "var(--type-label)" }}>{t("emailLabel")}</span>
          <input
            type="email"
            className="fp-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@email.ch"
            autoComplete="email"
          />
          <span style={{ font: "var(--type-body-sm)", color: "var(--text-tertiary)" }}>
            {t("emailHint")}
          </span>
        </label>
      )}

      {error && <div className="fp-panel fp-panel--error">{error}</div>}

      <div className="flex" style={{ gap: "var(--space-2)" }}>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
        <Button
          block
          onClick={() => void submit()}
          loading={state === "sending"}
          disabled={description.trim().length < 3 || state === "sending"}
        >
          {state === "sending" ? t("submitting") : t("submit")}
        </Button>
      </div>
    </div>
  );
}
