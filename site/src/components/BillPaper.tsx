"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const PaperBill = dynamic(() => import("./scene/PaperBill"), { ssr: false });

/** Mounts the 3D paper bill when WebGL is available; the flat receipt is the fallback. */
export default function BillPaper() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

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
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.add("paper3d");
    return () => document.documentElement.classList.remove("paper3d");
  }, [ready]);

  if (!enabled) return null;
  return (
    <div className="bill__canvas" aria-hidden="true">
      <PaperBill onReady={() => setReady(true)} />
    </div>
  );
}
