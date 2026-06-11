"use client";

/** Slider + Zahlenfeld für einen mm-Parameter. */
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
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        <span className="flex items-baseline gap-1 text-sm tabular-nums text-zinc-500">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-20 rounded border border-zinc-300 px-2 py-0.5 text-right"
          />
          {unit}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-zinc-900"
      />
    </label>
  );
}
