"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const WorldCanvas = dynamic(() => import("./scene/WorldCanvas"), { ssr: false });

/** Mounts the persistent 3D world when motion is welcome and WebGL works. */
export default function WorldMount() {
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
  return <WorldCanvas />;
}
