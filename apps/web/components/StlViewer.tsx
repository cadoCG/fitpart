"use client";

import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

/**
 * STL-Vorschau: neutrales Studio-Licht, OrbitControls, automatisches
 * Einpassen der Kamera bei jeder Regenerierung (<Bounds observe>).
 */
export default function StlViewer({ stl }: { stl: ArrayBuffer }) {
  const geometry = useMemo(() => {
    const geo = new STLLoader().parse(stl);
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, [stl]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <Canvas camera={{ position: [25, 20, 25], fov: 40 }}>
      <color attach="background" args={["#f4f4f5"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[20, 30, 20]} intensity={1.1} />
      <directionalLight position={[-15, -10, -20]} intensity={0.35} />
      <Bounds fit clip observe margin={1.4}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#94a3b8" metalness={0.1} roughness={0.45} />
        </mesh>
      </Bounds>
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}
