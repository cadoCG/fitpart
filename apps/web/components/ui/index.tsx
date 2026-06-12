"use client";

/**
 * FitPart Basis-UI — dünne React-Wrapper um die .fp-*-Klassen aus globals.css.
 * Werte/Zustände stammen 1:1 aus dem Design-System (components.css).
 * Icons via lucide-react.
 */
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Check, CircleCheck, Printer } from "lucide-react";

const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

/* ---------- Button ---------- */
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
  loading?: boolean;
  hint?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  hint,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(
        "fp-btn",
        `fp-btn--${variant}`,
        size !== "md" && `fp-btn--${size}`,
        block && "fp-btn--block",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="fp-spinner" aria-hidden />}
      <span className="inline-flex items-center gap-2">{children}</span>
      {hint && <span className="fp-btn__hint">{hint}</span>}
    </button>
  );
}

/* ---------- Badge ---------- */
export function Badge({
  variant = "neutral",
  dot = false,
  className,
  children,
}: {
  variant?: "neutral" | "ok" | "warn" | "error" | "accent";
  dot?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={cx("fp-badge", variant !== "neutral" && `fp-badge--${variant}`, className)}
    >
      {dot && <span className="fp-badge__dot" aria-hidden />}
      {children}
    </span>
  );
}

/* ---------- Card ---------- */
export function Card({
  padded = true,
  className,
  style,
  children,
}: {
  padded?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div className={cx("fp-card", padded && "fp-card--pad", className)} style={style}>
      {children}
    </div>
  );
}

/* ---------- Panel ---------- */
export function Panel({
  variant = "neutral",
  icon,
  title,
  className,
  children,
}: {
  variant?: "neutral" | "accent" | "ok" | "warn" | "error";
  icon?: ReactNode;
  title?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx("fp-panel", variant !== "neutral" && `fp-panel--${variant}`, className)}>
      {(icon || title) && (
        <div
          className="flex items-center gap-2 font-semibold"
          style={{ marginBottom: children ? "var(--space-2)" : 0 }}
        >
          {icon}
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

/* ---------- Form fields ---------- */
export function Field({
  label,
  hint,
  children,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <label className="fp-field">
      {label && <span className="fp-field__label">{label}</span>}
      {children}
      {hint && <span className="fp-field__hint">{hint}</span>}
    </label>
  );
}

export function Input({
  measure = false,
  className,
  ...rest
}: { measure?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cx("fp-input", measure && "fp-input--measure", className)} {...rest} />
  );
}

export function Select({
  options,
  className,
  children,
  ...rest
}: {
  options?: { value: string; label: string }[];
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx("fp-select", className)} {...rest}>
      {options
        ? options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  );
}

/* ---------- TypeCard (Bauteil-Typ-Auswahl) ---------- */
export function TypeCard({
  selected = false,
  label,
  meta,
  confidence,
  onClick,
}: {
  selected?: boolean;
  label: ReactNode;
  meta?: ReactNode;
  confidence?: number;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="fp-typecard" aria-pressed={selected} onClick={onClick}>
      <span className="flex min-w-0 items-center gap-3">
        <span className="fp-typecard__check" aria-hidden>
          <Check size={13} strokeWidth={3} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span>{label}</span>
          {meta && (
            <span style={{ font: "var(--type-body-sm)", color: "var(--text-tertiary)" }}>
              {meta}
            </span>
          )}
        </span>
      </span>
      {confidence != null && (
        <span className={cx("fp-badge", selected && "fp-badge--accent")} style={{ flex: "none" }}>
          {Math.round(confidence * 100)} %
        </span>
      )}
    </button>
  );
}

/* ---------- Stepper ---------- */
export function Stepper({ steps, current = 0 }: { steps: string[]; current?: number }) {
  return (
    <nav className="fp-stepper" aria-label="Schritte">
      {steps.map((label, i) => (
        <span key={label} className="flex items-center gap-2">
          {i > 0 && <span className="fp-stepper__line" />}
          <span
            className={cx(
              "fp-stepper__dot",
              i < current && "fp-stepper__dot--done",
              i === current && "fp-stepper__dot--current",
            )}
          >
            {i < current ? <CircleCheck size={15} strokeWidth={2.5} aria-hidden /> : i + 1}
          </span>
          <span
            className={cx(
              "fp-stepper__label hidden sm:inline",
              i === current && "fp-stepper__label--current",
            )}
          >
            {label}
          </span>
        </span>
      ))}
    </nav>
  );
}

/* ---------- ProgressBar ---------- */
export function ProgressBar({ value = 0, max = 1 }: { value?: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="fp-progress" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="fp-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------- LadderPicker (Kalibrierung) ---------- */
export function LadderPicker({
  values,
  selected = null,
  onChange,
  decimals = 1,
}: {
  values: readonly number[];
  selected?: number | null;
  onChange?: (value: number | null) => void;
  decimals?: number;
}) {
  return (
    <div className="fp-ladder">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          className="fp-ladder__btn"
          aria-pressed={selected === v}
          onClick={() => onChange?.(selected === v ? null : v)}
        >
          {v.toFixed(decimals)}
        </button>
      ))}
    </div>
  );
}

/* ---------- ViewerFrame (Studio) ---------- */
export function ViewerFrame({
  hint = "Ziehen zum Drehen · Scrollen zum Zoomen",
  badge,
  height = 420,
  className,
  children,
}: {
  hint?: ReactNode;
  badge?: ReactNode;
  height?: number | string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cx("fp-card flex flex-col overflow-hidden", className)}
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <div className="fp-grid-bg relative" style={{ height, minHeight: 200 }}>
        {badge && (
          <div className="absolute left-3 top-3 z-[2]">{badge}</div>
        )}
        {children}
      </div>
      {hint && (
        <p
          className="border-t"
          style={{
            margin: 0,
            padding: "var(--space-2) var(--space-3)",
            borderColor: "var(--border-default)",
            background: "var(--surface-card)",
            font: "var(--type-body-sm)",
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/* ---------- PrintRecPanel (Druckempfehlung) ---------- */
export function PrintRecPanel({
  title,
  rows,
  note,
  noteLabel,
}: {
  title: ReactNode;
  rows: { label: ReactNode; value: ReactNode }[];
  note?: ReactNode;
  noteLabel?: ReactNode;
}) {
  return (
    <div className="fp-panel" style={{ background: "var(--surface-sunken)" }}>
      <div
        className="flex items-center gap-2"
        style={{
          font: "var(--type-h3)",
          fontSize: "var(--text-sm)",
          color: "var(--text-primary)",
          marginBottom: "var(--space-3)",
        }}
      >
        <Printer size={15} strokeWidth={2} aria-hidden />
        {title}
      </div>
      <dl className="m-0 flex flex-col" style={{ gap: "var(--space-2)" }}>
        {rows.map((r, i) => (
          <div key={i} className="flex items-baseline" style={{ gap: "var(--space-3)" }}>
            <dt className="fp-microlabel m-0" style={{ width: 88, flex: "none" }}>
              {r.label}
            </dt>
            <dd
              className="m-0"
              style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)" }}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
      {note && (
        <p
          style={{
            margin: "var(--space-3) 0 0",
            paddingTop: "var(--space-3)",
            borderTop: "1px solid var(--border-default)",
            font: "var(--type-body-sm)",
            color: "var(--text-secondary)",
          }}
        >
          <span style={{ color: "var(--accent-text)", fontWeight: 500 }}>{noteLabel} </span>
          {note}
        </p>
      )}
    </div>
  );
}

