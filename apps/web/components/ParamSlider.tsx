"use client";

/** Slider + Mono-Zahlenfeld für einen mm-Parameter (Werkbank). */
export default function ParamSlider({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = "mm",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const fill = `${(((value ?? min) - min) / (max - min)) * 100}%`;
  return (
    <div className="fp-slider">
      <div className="fp-slider__head">
        <span className="fp-field__label" style={{ marginBottom: 0 }}>
          {label}
        </span>
        <span className="fp-slider__value">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {unit && <span className="fp-slider__unit">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        className="fp-range"
        style={{ "--fp-range-fill": fill } as React.CSSProperties}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
