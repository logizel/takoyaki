"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { SceneMode } from "./scene/TakoyakiScene";

const SceneCanvas = dynamic(() => import("./scene/SceneCanvas"), { ssr: false });

/** Mounts a 3D scene only when motion is welcome and WebGL is available. */
export default function SceneMount({ mode, trigger }: { mode: SceneMode; trigger?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webglOk = false;
    try {
      const canvas = document.createElement("canvas");
      webglOk = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webglOk = false;
    }
    if (motionOk && webglOk) setEnabled(true);
    else document.documentElement.classList.remove("fx");
  }, []);

  if (!enabled) return null;
  return <SceneCanvas mode={mode} trigger={trigger} />;
}
