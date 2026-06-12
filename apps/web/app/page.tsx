import Link from "next/link";
import { useTranslations } from "next-intl";
import { Camera, CircleCheck, Printer, Ruler } from "lucide-react";
import { Badge, ViewerFrame } from "@/components/ui";
import HeroPart from "@/components/HeroPart";
import { Logo } from "@/components/Logo";

export default function HomePage() {
  const t = useTranslations("Home");

  const steps = [
    { icon: Camera, title: t("step1Title"), body: t("step1Body") },
    { icon: Ruler, title: t("step2Title"), body: t("step2Body") },
    { icon: Printer, title: t("step3Title"), body: t("step3Body") },
  ];

  const trust = [t("trust1"), t("trust2"), t("trust3")];

  return (
    <div style={{ minHeight: "100%", background: "var(--surface-page)" }}>
      <header className="fpk-header">
        <Logo size={28} />
        <Link href="/create" className="fp-btn fp-btn--secondary fp-btn--sm">
          {t("cta")}
        </Link>
      </header>

      <section className="fpk-hero">
        <div>
          <h1 className="fpk-hero__title">
            {t("heroTitleA")}
            <br />
            {t("heroTitleB")}
          </h1>
          <p
            style={{
              font: "var(--type-body)",
              fontSize: "var(--text-md)",
              color: "var(--text-secondary)",
              margin: "0 0 var(--space-8)",
              maxWidth: 440,
            }}
          >
            {t("heroSub")}
          </p>
          <div className="fpk-hero__ctas">
            <Link href="/create" className="fp-btn fp-btn--primary fp-btn--lg">
              <Camera size={18} strokeWidth={2} aria-hidden /> {t("startPhoto")}
            </Link>
            <Link href="/create" className="fp-btn fp-btn--ghost fp-btn--lg">
              {t("createPlain")}
            </Link>
          </div>
          <div className="fpk-trust">
            {trust.map((label) => (
              <span key={label} className="flex items-center gap-1.5">
                <CircleCheck
                  size={15}
                  strokeWidth={2}
                  style={{ color: "var(--status-ok)" }}
                  aria-hidden
                />
                {label}
              </span>
            ))}
          </div>
        </div>

        <ViewerFrame hint="Ziehen zum Drehen" badge={<Badge variant="accent">{t("heroBadge")}</Badge>}>
          <div className="absolute inset-0">
            <HeroPart />
          </div>
        </ViewerFrame>
      </section>

      <section style={{ borderTop: "1px solid var(--border-default)", background: "var(--surface-card)" }}>
        <div className="fpk-steps">
          {steps.map((s, i) => (
            <div key={s.title}>
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent-subtle)",
                    color: "var(--accent-text)",
                    border: "1px solid var(--accent-border)",
                  }}
                >
                  <s.icon size={19} strokeWidth={2} aria-hidden />
                </span>
                <span className="fp-microlabel">
                  {t("stepLabel")} {i + 1}
                </span>
              </div>
              <h3 style={{ font: "var(--type-h3)", margin: "0 0 var(--space-1)" }}>{s.title}</h3>
              <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: 0 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
