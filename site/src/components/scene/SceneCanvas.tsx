"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Lightformer } from "@react-three/drei";
import TakoyakiScene, { type SceneMode } from "./TakoyakiScene";

/**
 * A polished scene wrapper: procedural studio lighting (no external HDRI),
 * soft shadows, clamped DPR and adaptive resolution.
 */
export default function SceneCanvas({
  mode,
  trigger,
}: {
  mode: SceneMode;
  trigger?: string;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 10], fov: 40, near: 0.1, far: 100 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[4, 8, 6]}
        intensity={2.3}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-6, -2, 4]} intensity={0.5} color="#ffe9c0" />

      <Environment resolution={256}>
        <Lightformer intensity={2.4} position={[0, 6, -6]} scale={[12, 12, 1]} />
        <Lightformer intensity={1.4} position={[-6, 1, 1]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer intensity={1.4} position={[6, -1, 1]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer intensity={2} position={[0, 0, 6]} scale={[12, 12, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <TakoyakiScene mode={mode} trigger={trigger} />
      </Suspense>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
