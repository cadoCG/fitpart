import { useTranslations } from "next-intl";
import Link from "next/link";
import CalibrationFlow from "@/components/CalibrationFlow";
import { Logo } from "@/components/Logo";

export default function CalibratePage() {
  const t = useTranslations("Calibrate");
  return (
    <div style={{ minHeight: "100%", background: "var(--surface-page)" }}>
      <main
        className="mx-auto"
        style={{
          maxWidth: "var(--container-narrow)",
          padding: "var(--space-8) var(--space-6)",
        }}
      >
        <header style={{ marginBottom: "var(--space-8)" }}>
          <Link
            href="/"
            aria-label="FitPart Startseite"
            style={{ width: "fit-content", display: "inline-flex", marginBottom: "var(--space-4)" }}
          >
            <Logo size={22} />
          </Link>
          <Link
            href="/create"
            className="fp-btn fp-btn--ghost fp-btn--sm"
            style={{ marginLeft: -12, display: "block" }}
          >
            ← {t("back")}
          </Link>
          <h1
            style={{
              font: "var(--type-h1)",
              letterSpacing: "var(--tracking-heading)",
              margin: "var(--space-3) 0 0",
            }}
          >
            {t("title")}
          </h1>
          <p style={{ font: "var(--type-body)", color: "var(--text-secondary)", margin: "var(--space-2) 0 0" }}>
            {t("subtitle")}
          </p>
        </header>
        <CalibrationFlow />
      </main>
    </div>
  );
}
