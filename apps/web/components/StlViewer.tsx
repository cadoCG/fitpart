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
    // Transparenter Canvas: das Millimeterpapier-Raster der Studio-Fläche
    // scheint durch; das Teil in Mess-Orange ist das Hero-Visual.
    <Canvas camera={{ position: [25, 20, 25], fov: 40 }} gl={{ alpha: true }}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[20, 30, 20]} intensity={1.15} />
      <directionalLight position={[-15, -10, -20]} intensity={0.35} />
      <Bounds fit clip observe margin={1.4}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#df5c0c" metalness={0.05} roughness={0.5} />
        </mesh>
      </Bounds>
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}
