"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Bounds, Html, Line, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";

/**
 * STL-Vorschau: neutrales Studio-Licht, OrbitControls, automatisches
 * Einpassen der Kamera bei jeder Regenerierung (<Bounds observe>).
 *
 * Optional werden Masse direkt am Modell bemasst: Masslinie + Hilfslinien an
 * semantischen Ankern aus dem CAD-Service (p1→p2 auf der Geometrie,
 * offset_dir nach aussen) plus ein editierbares Zahlenfeld als DOM-Overlay
 * (drei <Html>). Zwei Eingabewege auf dasselbe Mass (Muster moderner
 * Browser-CAD-Tools): tippen in die Pill oder ziehen am Griff (push-pull) –
 * die Masslinie folgt live, die Regenerierung übernimmt die Seite debounced.
 * Überlappende Pills werden pro Frame in Screen-Space auseinandergeschoben.
 */

type Vec3 = [number, number, number];

export type ViewerDim = {
  param: string;
  kind: "linear" | "diameter";
  /** Anker in Template-Koordinaten (unzentriert, wie vom CAD-Service). */
  p1: Vec3;
  p2: Vec3;
  offsetDir: Vec3;
  label: string;
  value: number;
  /** Nennmass zum Zeitpunkt des Anker-Fetches (für die Live-Vorschau). */
  baseValue: number;
  min: number;
  max: number;
  step?: number;
};

const DIM_COLOR = "#5c6672";
const HANDLE_COLOR = "#df5c0c";
const HANDLE_ACTIVE = "#b8480a";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addScaled = (p: Vec3, d: Vec3, f: number): Vec3 => [
  p[0] + d[0] * f,
  p[1] + d[1] * f,
  p[2] + d[2] * f,
];
const mid = (a: Vec3, b: Vec3): Vec3 => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
  (a[2] + b[2]) / 2,
];
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * Parameter t (mm) des Punkts auf der Linie (origin + t·dir), der dem
 * Pointer-Ray am nächsten liegt (Ericson, Real-Time Collision Detection).
 */
function closestLineT(
  ray: THREE.Ray,
  origin: THREE.Vector3,
  dir: THREE.Vector3,
): number | null {
  const b = dir.dot(ray.direction);
  const denom = 1 - b * b;
  if (Math.abs(denom) < 1e-6) return null; // Linie ~parallel zum Ray
  const r = origin.clone().sub(ray.origin);
  const c = dir.dot(r);
  const f = ray.direction.dot(r);
  return (b * f - c) / denom;
}

type LabelEntry = {
  el: HTMLElement | null;
  pos: THREE.Vector3;
  appX: number;
  appY: number;
};

type ReportFn = (param: string, pos: Vec3 | null) => void;

/**
 * Eine Bemassung: Masslinie parallel zur gemessenen Strecke, Hilfslinien von
 * den Ankerpunkten, Wert-Pill mittig, Zieh-Griff am Linienende. Die Strecke
 * wird live aus dem aktuellen Nennmass skaliert (Anker + Wertdifferenz), bis
 * frische Anker vom Service kommen.
 */
function DimensionLine({
  dim,
  center,
  extent,
  onChange,
  report,
}: {
  dim: ViewerDim;
  /** Bounding-Box-Zentrum der unzentrierten Geometrie (geo.center()-Versatz). */
  center: Vec3;
  extent: number;
  onChange?: (param: string, value: number) => void;
  report: ReportFn;
}) {
  const dir = norm(dim.offsetDir);
  // |offset_dir| dient als Abstands-Faktor: Templates können einzelne Masse
  // weiter nach aussen schieben (z. B. Leader für kleine Bohrungen).
  const scale = Math.hypot(...dim.offsetDir) || 1;
  const o = Math.max(3, extent * 0.16) * scale;

  const p1 = sub(dim.p1, center);
  const p2 = sub(dim.p2, center);
  const u = norm(sub(p2, p1));
  const anchorLen = Math.hypot(...sub(p2, p1));
  // Live-Vorschau: Nennmass-Änderungen (Tippen/Ziehen) strecken die Linie
  // sofort, 1:1 in mm; Durchmesser symmetrisch um die Mitte.
  const liveLen = Math.max(0.1, anchorLen + (dim.value - dim.baseValue));
  let q1: Vec3;
  let q2: Vec3;
  if (dim.kind === "diameter") {
    const c0 = mid(p1, p2);
    q1 = addScaled(c0, u, -liveLen / 2);
    q2 = addScaled(c0, u, liveLen / 2);
  } else {
    q1 = p1;
    q2 = addScaled(p1, u, liveLen);
  }

  const a = addScaled(q1, dir, o);
  const b = addScaled(q2, dir, o);
  const labelPos = mid(a, b);

  // ---- Zieh-Griff (push-pull): Pointer-Ray → t auf der Masslinie → Wert ----
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startT: number;
    startValue: number;
    origin: THREE.Vector3;
    dir: THREE.Vector3;
  } | null>(null);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // synthetische/bereits beendete Pointer haben keine Capture – Drag
      // funktioniert dann über die regulären Move-Events weiter.
    }
    const origin = new THREE.Vector3(...a);
    const lineDir = new THREE.Vector3(...u);
    const t = closestLineT(e.ray, origin, lineDir);
    if (t === null) return;
    dragRef.current = { startT: t, startValue: dim.value, origin, dir: lineDir };
    setDragging(true);
    if (controls) controls.enabled = false;
    document.body.style.cursor = "grabbing";
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = dragRef.current;
    if (!d) return;
    const t = closestLineT(e.ray, d.origin, d.dir);
    if (t === null) return;
    // Griff folgt dem Pointer: linear 1:1, Durchmesser wächst beidseitig.
    const factor = dim.kind === "diameter" ? 2 : 1;
    const step = dim.step ?? 0.1;
    let v = d.startValue + (t - d.startT) * factor;
    v = clamp(Math.round(v / step) * step, dim.min, dim.max);
    v = Number(v.toFixed(3));
    if (v !== dim.value) onChange?.(dim.param, v);
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (!dragRef.current) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // s. setPointerCapture
    }
    dragRef.current = null;
    setDragging(false);
    if (controls) controls.enabled = true;
    document.body.style.cursor = hover ? "grab" : "";
  };

  // Pill-Position für die Kollisionsauflösung melden. Bewusst KEINE Refs
  // über die Portal-Grenze: drei <Html> rendert seine Kinder asynchron in
  // einer eigenen Root – der Resolver findet das DOM-Element selbst über
  // das data-Attribut (siehe Dimensions/useFrame).
  useEffect(() => {
    report(dim.param, labelPos);
  });
  useEffect(() => () => report(dim.param, null), [dim.param, report]);

  const handleR = Math.max(0.7, extent * 0.032) * (hover || dragging ? 1.35 : 1);

  return (
    <group>
      <Line points={[a, b]} color={DIM_COLOR} lineWidth={1.5} />
      <Line
        points={[addScaled(q1, dir, o * 0.25), addScaled(q1, dir, o + o * 0.3 / scale)]}
        color={DIM_COLOR}
        lineWidth={1}
      />
      <Line
        points={[addScaled(q2, dir, o * 0.25), addScaled(q2, dir, o + o * 0.3 / scale)]}
        color={DIM_COLOR}
        lineWidth={1}
      />

      {/* Zieh-Griff am Linienende */}
      <mesh
        position={b}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          if (!dragRef.current) document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          setHover(false);
          if (!dragRef.current) document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[handleR, 16, 16]} />
        <meshStandardMaterial
          color={hover || dragging ? HANDLE_ACTIVE : HANDLE_COLOR}
          roughness={0.4}
        />
      </mesh>

      {/* Kompakte Wert-Pill (wie Onshape/Shapr3D): nur Zahl + Einheit – die
          Hilfslinien zeigen, welches Mass gemeint ist; Label als Tooltip. */}
      <Html position={labelPos} center zIndexRange={[40, 0]}>
        <label
          data-fp-dim={dim.param}
          title={dim.label}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 3,
            padding: "3px 6px",
            background: "var(--surface-card, #fff)",
            border: "1px solid var(--border-default, #ddd)",
            borderRadius: "var(--radius-full, 999px)",
            boxShadow: "var(--shadow-md, 0 2px 10px rgba(0,0,0,.12))",
            cursor: "default",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          {dim.kind === "diameter" && (
            <span style={{ fontSize: 12, color: "var(--text-tertiary, #999)" }}>
              ⌀
            </span>
          )}
          <input
            type="number"
            aria-label={dim.label}
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
              width: 48,
              font: "var(--type-measure, 500 14px monospace)",
              textAlign: "right",
              border: "1px solid var(--border-default, #ddd)",
              borderRadius: 6,
              padding: "1px 5px",
              background: "var(--surface-page, #fafafa)",
            }}
          />
          <span style={{ fontSize: 10, color: "var(--text-tertiary, #999)" }}>
            mm
          </span>
        </label>
      </Html>
    </group>
  );
}

/**
 * Alle Bemassungen + Kollisionsauflösung: Pill-Positionen werden pro Frame
 * in Screen-Space projiziert; überlappende Pills schieben sich vertikal
 * auseinander (geglättet, als zusätzlicher CSS-Translate auf der Pill).
 */
function Dimensions({
  dims,
  center,
  extent,
  onChange,
}: {
  dims: ViewerDim[];
  center: Vec3;
  extent: number;
  onChange?: (param: string, value: number) => void;
}) {
  const entries = useRef(new Map<string, LabelEntry>());
  const projected = useRef(new THREE.Vector3());

  const report = useCallback<ReportFn>((param, pos) => {
    if (!pos) {
      entries.current.delete(param);
      return;
    }
    let e = entries.current.get(param);
    if (!e) {
      e = { el: null, pos: new THREE.Vector3(), appX: 0, appY: 0 };
      entries.current.set(param, e);
    }
    e.pos.set(pos[0], pos[1], pos[2]);
  }, []);

  useFrame(({ camera, size }) => {
    const items: {
      e: LabelEntry;
      el: HTMLElement;
      x: number;
      y: number;
      ox: number;
      oy: number;
    }[] = [];
    entries.current.forEach((e, param) => {
      // Pill-DOM erst hier auflösen – die <Html>-Kinder mounten asynchron.
      if (!e.el || !e.el.isConnected) {
        e.el = document.querySelector<HTMLElement>(
          `label[data-fp-dim="${CSS.escape(param)}"]`,
        );
      }
      const el = e.el;
      if (!el) return;
      const v = projected.current.copy(e.pos).project(camera);
      items.push({
        e,
        el,
        x: ((v.x + 1) / 2) * size.width,
        y: ((1 - v.y) / 2) * size.height,
        ox: 0,
        oy: 0,
      });
    });

    // Greedy-Paarauflösung (≤ Handvoll Pills): vertikal auseinanderschieben.
    items.sort((p, q) => p.y - q.y);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const A = items[i];
          const B = items[j];
          const w = (A.el.offsetWidth + B.el.offsetWidth) / 2 + 4;
          const h = (A.el.offsetHeight + B.el.offsetHeight) / 2 + 4;
          const dx = B.x + B.ox - (A.x + A.ox);
          const dy = B.y + B.oy - (A.y + A.oy);
          if (Math.abs(dx) < w && Math.abs(dy) < h) {
            const push = (h - Math.abs(dy)) / 2;
            const s = dy >= 0 ? 1 : -1;
            A.oy -= s * push;
            B.oy += s * push;
          }
        }
      }
    }

    // Offsets direkt anwenden (kein Frame-Lerp – unter frameloop="demand"
    // gibt es zwischen Interaktionen keine Folgeframes zum Glätten).
    for (const it of items) {
      const e = it.e;
      if (Math.abs(it.ox - e.appX) > 0.5 || Math.abs(it.oy - e.appY) > 0.5) {
        it.el.style.transform = `translate(${it.ox.toFixed(1)}px, ${it.oy.toFixed(1)}px)`;
        e.appX = it.ox;
        e.appY = it.oy;
      }
    }
  });

  return (
    <>
      {dims.map((d) => (
        <DimensionLine
          key={d.param}
          dim={d}
          center={center}
          extent={extent}
          onChange={onChange}
          report={report}
        />
      ))}
    </>
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
  const { geometry, center, extent } = useMemo(() => {
    const geo = new STLLoader().parse(stl);
    // Versatz von geo.center() festhalten: die Anker des CAD-Service sind in
    // unzentrierten Template-Koordinaten und werden um dasselbe Zentrum
    // verschoben, damit sie auf dem Mesh sitzen.
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const c: Vec3 = [
      (bb.min.x + bb.max.x) / 2,
      (bb.min.y + bb.max.y) / 2,
      (bb.min.z + bb.max.z) / 2,
    ];
    const ext = Math.max(
      bb.max.x - bb.min.x,
      bb.max.y - bb.min.y,
      bb.max.z - bb.min.z,
    );
    geo.center();
    geo.computeVertexNormals();
    return { geometry: geo, center: c, extent: ext };
  }, [stl]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    // Transparenter Canvas: das Millimeterpapier-Raster der Studio-Fläche
    // scheint durch; das Teil in Mess-Orange ist das Hero-Visual.
    // frameloop="demand": rendert nur bei Änderungen (Orbit, Param, Drag) –
    // hält den Main-Thread frei (Html-Pills mounten sofort, Akku/Mobile).
    <Canvas
      frameloop="demand"
      camera={{ position: [25, 20, 25], fov: 40 }}
      gl={{ alpha: true }}
    >
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
      {dims && dims.length > 0 && (
        <Dimensions
          dims={dims}
          center={center}
          extent={extent}
          onChange={onDimChange}
        />
      )}
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}
