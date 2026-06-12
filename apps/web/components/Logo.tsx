/**
 * FitPart-Logo — zwei ineinandergreifende Kreuz-Formen («es passt») + Wortmarke.
 * Themed über die globalen Tokens: --accent (Mess-Orange), --text-primary (Tinte),
 * --surface-page (Knockout für den Webe-Effekt) → folgt automatisch dem Dark Mode.
 *
 * Geometrie ist parametrisch via viewBox 0 0 150 120; alle Masse aus dem
 * Design-System (eine Akzentfarbe, flach, gerundete Joins, keine Verläufe).
 */
import { MARK_ORANGE, MARK_INK } from "@/lib/brand";

/** Reine Bildmarke (App-Icon/Favicon-Geometrie). */
export function LogoMark({
  size = 28,
  title = "FitPart",
  ...props
}: { size?: number; title?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 150 120"
      width={(size * 150) / 120}
      height={size}
      role="img"
      aria-label={title}
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
      {...props}
    >
      {/* Orange Kreuz */}
      <path d={MARK_ORANGE} stroke="var(--accent)" strokeWidth={9} />
      {/* Knockout: trennt das Tinten-Kreuz sauber vom orangen (Webe-Effekt) */}
      <path d={MARK_INK} stroke="var(--surface-page)" strokeWidth={18} />
      {/* Tinten-Kreuz darüber */}
      <path d={MARK_INK} stroke="var(--text-primary)" strokeWidth={9} />
    </svg>
  );
}

/** Volles Lockup: Bildmarke + Wortmarke «FitPart» (Fit = Akzent). */
export function Logo({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.4 }}
    >
      <LogoMark size={size} aria-hidden />
      <span
        style={{
          font: "var(--type-h2)",
          fontSize: size * 0.92,
          letterSpacing: "var(--tracking-display)",
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        <span style={{ color: "var(--accent)" }}>Fit</span>
        <span style={{ color: "var(--text-primary)" }}>Part</span>
      </span>
    </span>
  );
}
