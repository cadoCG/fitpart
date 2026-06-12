"use client";

import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Html, Line, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

/**
 * STL-Vorschau: neutrales Studio-Licht, OrbitControls, automatisches
 * Einpassen der Kamera bei jeder Regenerierung (<Bounds observe>).
 *
 * Optional werden Masse direkt am Modell bemasst (dims): Masslinie +
 * Hilfslinien entlang der Bounding-Box plus ein editierbares Zahlenfeld als
 * DOM-Overlay (drei <Html>) – Muster "DOM-over-WebGL" wie in modernen
 * Browser-CAD-Tools. Tippen ändert den Parameter, die Live-Regenerierung
 * übernimmt die Seite (debounced).
 */

export type ViewerDim = {
  param: string;
  axis: "x" | "y" | "z";
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
};

type Vec3 = [number, number, number];

const AXIS_INDEX = { x: 0, y: 1, z: 2 } as const;
const DIM_COLOR = "#5c6672";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * Eine Bemassung: Masslinie parallel zur Achse, von der Bounding-Box-
 * Unterkante aus über die Länge des Parameterwerts (alle Phase-1-Masse
 * starten am Box-Minimum), zwei Hilfslinien als Endmarken, Wert-Chip mittig.
 */
function DimensionLine({
  dim,
  min,
  max,
  onChange,
}: {
  dim: ViewerDim;
  min: Vec3;
  max: Vec3;
  onChange?: (param: string, value: number) => void;
}) {
  const ai = AXIS_INDEX[dim.axis];
  const extent = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const o = Math.max(3, extent * 0.16); // Abstand der Masslinie zur Box
  const len = Number.isFinite(dim.value) ? Math.max(dim.value, 0) : 0;

  // Jede Achse bekommt ihre eigene Aussenkante, damit sich Chips nicht
  // überlagern: x unten (−y), y links (−x), z diagonal rechts oben (+x,+y).
  let base: Vec3;
  let offsets: ReadonlyArray<readonly [number, number]>; // [Achse, Vorzeichen]
  if (dim.axis === "x") {
    base = [min[0], min[1], min[2]];
    offsets = [[1, -1]];
  } else if (dim.axis === "y") {
    base = [min[0], min[1], min[2]];
    offsets = [[0, -1]];
  } else {
    base = [max[0], max[1], min[2]];
    offsets = [[0, 1], [1, 1]];
  }

  const shift = (p: Vec3, factor: number): Vec3 => {
    const q: Vec3 = [...p];
    for (const [axis, sign] of offsets) q[axis] += sign * factor;
    return q;
  };

  const a = shift(base, o);
  const b: Vec3 = [...a];
  b[ai] += len;

  // Hilfslinien: vom Box-Eckpunkt (mit kleinem Abstand) durch die Masslinie.
  const end0: Vec3 = [...base];
  const end1: Vec3 = [...base];
  end1[ai] += len;
  const w0s = shift(end0, o * 0.25);
  const w0e = shift(end0, o * 1.3);
  const w1s = shift(end1, o * 0.25);
  const w1e = shift(end1, o * 1.3);

  const labelPos: Vec3 = [...a];
  labelPos[ai] += len / 2;

  return (
    <group>
      <Line points={[a, b]} color={DIM_COLOR} lineWidth={1.5} />
      <Line points={[w0s, w0e]} color={DIM_COLOR} lineWidth={1} />
      <Line points={[w1s, w1e]} color={DIM_COLOR} lineWidth={1} />
      <Html position={labelPos} center zIndexRange={[40, 0]}>
        <label
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "4px 7px",
            // Screen-Space-Versatz pro Achse, damit sich Chips in der
            // Iso-Ansicht nicht überlagern (x unten, z oben rechts).
            transform:
              dim.axis === "x"
                ? "translateY(26px)"
                : dim.axis === "z"
                  ? "translate(14px, -26px)"
                  : undefined,
            background: "var(--surface-card, #fff)",
            border: "1px solid var(--border-default, #ddd)",
            borderRadius: "var(--radius-md, 8px)",
            boxShadow: "var(--shadow-md, 0 2px 10px rgba(0,0,0,.12))",
            cursor: "default",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              font: "var(--type-label, 500 12px sans-serif)",
              fontSize: 11,
              color: "var(--text-secondary, #555)",
            }}
          >
            {dim.label}
          </span>
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
            <input
              type="number"
              value={Number.isFinite(dim.value) ? dim.value : ""}
              min={dim.min}
              max={dim.max}
              step={dim.step ?? 0.1}
              onChange={(e) => onChange?.(dim.param, Number(e.target.value))}
              onBlur={(e) =>
                onChange?.(
                  dim.param,
                  clamp(Number(e.target.value), dim.min, dim.max),
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              style={{
                width: 56,
                font: "var(--type-measure, 500 14px monospace)",
                textAlign: "right",
                border: "1px solid var(--border-default, #ddd)",
                borderRadius: 6,
                padding: "2px 6px",
                background: "var(--surface-page, #fafafa)",
              }}
            />
            <span style={{ fontSize: 11, color: "var(--text-tertiary, #999)" }}>
              mm
            </span>
          </span>
        </label>
      </Html>
    </group>
  );
}

export default function StlViewer({
  stl,
  dims,
  onDimChange,
}: {
  stl: ArrayBuffer;
  dims?: ViewerDim[];
  onDimChange?: (param: string, value: number) => void;
}) {
  const { geometry, bbMin, bbMax } = useMemo(() => {
    const geo = new STLLoader().parse(stl);
    geo.center();
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    return {
      geometry: geo,
      bbMin: [bb.min.x, bb.min.y, bb.min.z] as Vec3,
      bbMax: [bb.max.x, bb.max.y, bb.max.z] as Vec3,
    };
  }, [stl]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    // Transparenter Canvas: das Millimeterpapier-Raster der Studio-Fläche
    // scheint durch; das Teil in Mess-Orange ist das Hero-Visual.
    <Canvas camera={{ position: [25, 20, 25], fov: 40 }} gl={{ alpha: true }}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[20, 30, 20]} intensity={1.15} />
      <directionalLight position={[-15, -10, -20]} intensity={0.35} />
      {/* Mit Bemassung mehr Rand, damit die Wert-Chips nicht am Frame kleben. */}
      <Bounds fit clip observe margin={dims?.length ? 1.8 : 1.4}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#df5c0c" metalness={0.05} roughness={0.5} />
        </mesh>
      </Bounds>
      {/* Bemassung ausserhalb von <Bounds>, damit die Kamera aufs Teil fittet. */}
      {dims?.map((d) => (
        <DimensionLine
          key={d.param}
          dim={d}
          min={bbMin}
          max={bbMax}
          onChange={onDimChange}
        />
      ))}
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}
