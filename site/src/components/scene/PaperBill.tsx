"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setupSteps } from "@/lib/data";

const TEX_W = 1024;
const TEX_H = 1500;
const PAPER_W = 1.8;
const PAPER_H = (TEX_H / TEX_W) * PAPER_W;

/** Outer radius of the loose paper roll, in screen pixels. */
const ROLL_RADIUS_PX = 70;

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let cursor = y;
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, cursor);
      line = word;
      cursor += lineHeight;
    } else {
      line = test;
    }
  });
  if (line) {
    ctx.fillText(line, cx, cursor);
    cursor += lineHeight;
  }
  return cursor;
}

function drawReceipt(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  // A slightly irregular, deckled sheet silhouette rather than a perfect
  // printer-paper rectangle.
  ctx.beginPath();
  ctx.moveTo(42, 18);
  for (let y = 18; y < TEX_H - 18; y += 24) {
    ctx.lineTo(42 + Math.sin(y * 0.031) * 4 + Math.sin(y * 0.009) * 3, y);
  }
  ctx.lineTo(TEX_W - 44, TEX_H - 18);
  for (let y = TEX_H - 18; y > 18; y -= 24) {
    ctx.lineTo(TEX_W - 44 + Math.sin(y * 0.027) * 4 + Math.cos(y * 0.011) * 3, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#e8d9b6";
  ctx.fill();
  ctx.strokeStyle = "rgba(105, 76, 40, 0.28)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.save();
  ctx.clip();

  // Deterministic paper grain and fibres (stable when fonts trigger redraw).
  let seed = 2025;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 11000; i++) {
    ctx.fillStyle = `rgba(94, 67, 34, ${random() * 0.052})`;
    ctx.fillRect(46 + random() * (TEX_W - 92), 18 + random() * (TEX_H - 36), 1 + random() * 1.5, 1 + random() * 1.5);
  }

  // Soft light from the top, warmer shading at the bottom.
  const light = ctx.createLinearGradient(0, 0, 0, TEX_H);
  light.addColorStop(0, "rgba(255,250,224,0.34)");
  light.addColorStop(0.42, "rgba(255,255,255,0)");
  light.addColorStop(1, "rgba(103,69,34,0.2)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Age-darkened edges and corners.
  const edge = ctx.createLinearGradient(0, 0, TEX_W, 0);
  edge.addColorStop(0, "rgba(92,58,26,0.27)");
  edge.addColorStop(0.075, "rgba(120,91,48,0.02)");
  edge.addColorStop(0.925, "rgba(120,91,48,0.02)");
  edge.addColorStop(1, "rgba(92,58,26,0.25)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Faint water/age marks, kept subtle so the printed letter stays legible.
  for (const stain of [
    [108, 212, 84],
    [894, 482, 74],
    [120, 1210, 105],
    [870, 1328, 90],
  ]) {
    const stainGlow = ctx.createRadialGradient(stain[0], stain[1], 3, stain[0], stain[1], stain[2]);
    stainGlow.addColorStop(0, "rgba(122,83,39,0.075)");
    stainGlow.addColorStop(0.72, "rgba(122,83,39,0.028)");
    stainGlow.addColorStop(1, "rgba(122,83,39,0)");
    ctx.fillStyle = stainGlow;
    ctx.fillRect(stain[0] - stain[2], stain[1] - stain[2], stain[2] * 2, stain[2] * 2);
  }

  // Visible crease/fold lines on the paper - looser spacing
  ctx.strokeStyle = "rgba(120,100,58,0.18)";
  ctx.lineWidth = 1.5;
  // Vertical center crease
  ctx.beginPath();
  ctx.moveTo(TEX_W / 2, 150);
  ctx.lineTo(TEX_W / 2, TEX_H - 80);
  ctx.stroke();
  // Horizontal crease lines - fewer, looser spacing
  for (let cy = 340; cy < 1350; cy += 300) {
    ctx.beginPath();
    ctx.moveTo(100, cy);
    ctx.lineTo(TEX_W - 100, cy);
    ctx.stroke();
  }

  // Faint fibre flecks, like pressed recycled paper.
  for (let i = 0; i < 260; i++) {
    ctx.strokeStyle = `rgba(116,87,46,${0.04 + random() * 0.065})`;
    ctx.lineWidth = 1;
    const fx = 50 + random() * (TEX_W - 100);
    const fy = 24 + random() * (TEX_H - 48);
    const len = 6 + random() * 26;
    const ang = random() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(ang) * len, fy + Math.sin(ang) * len);
    ctx.stroke();
  }

  // Perforated tear strip along the bottom edge.
  ctx.fillStyle = "rgba(120,100,58,0.14)";
  for (let px = 40; px < TEX_W - 20; px += 26) {
    ctx.beginPath();
    ctx.arc(px, TEX_H - 26, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(120,100,58,0.28)";
  ctx.setLineDash([10, 9]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, TEX_H - 56);
  ctx.lineTo(TEX_W - 40, TEX_H - 56);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = "center";
  ctx.fillStyle = "#161616";
  ctx.font = '600 22px "Zen Kaku Gothic New", sans-serif';
  ctx.fillStyle = "rgba(65, 48, 29, 0.76)";
  ctx.fillText("TAKOYAKI SERVICE  ·  EST. 2025", TEX_W / 2, 92);
  ctx.strokeStyle = "rgba(78, 58, 34, 0.38)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(170, 116);
  ctx.lineTo(TEX_W - 170, 116);
  ctx.stroke();

  ctx.fillStyle = "#161616";
  ctx.font = '400 84px "Dela Gothic One", "Zen Kaku Gothic New", sans-serif';
  ctx.fillText("SETUP", TEX_W / 2, 176);

  ctx.font = '700 32px "Zen Kaku Gothic New", sans-serif';
  ctx.fillText("THREE STEPS, THEN IT JUST RUNS", TEX_W / 2, 246);

  ctx.font = '500 25px "Zen Kaku Gothic New", sans-serif';
  ctx.fillStyle = "#3a3a3a";
  wrap(ctx, "From install to your first ping in under a minute.", TEX_W / 2, 300, 760, 36);

  let y = 430;
  setupSteps.forEach((step) => {
    ctx.strokeStyle = "rgba(22,22,22,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(92, y);
    ctx.lineTo(TEX_W - 92, y);
    ctx.stroke();
    y += 62;

    ctx.textAlign = "left";
    ctx.fillStyle = "#161616";
    ctx.font = '400 44px "Dela Gothic One", "Zen Kaku Gothic New", sans-serif';
    ctx.fillText(step.num, 92, y);

    ctx.font = '400 36px "Dela Gothic One", "Zen Kaku Gothic New", sans-serif';
    ctx.fillText(step.title, 196, y);

    y += 46;
    ctx.font = '500 25px "Zen Kaku Gothic New", sans-serif';
    ctx.fillStyle = "#3a3a3a";
    y = wrap(ctx, step.body, 196, y, 730, 34) + 54;
  });

  // Double rule before the brand.
  ctx.strokeStyle = "rgba(22,22,22,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(250, 1180);
  ctx.lineTo(TEX_W - 250, 1180);
  ctx.moveTo(250, 1192);
  ctx.lineTo(TEX_W - 250, 1192);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#161616";
  ctx.font = '400 100px "Dela Gothic One", "Zen Kaku Gothic New", sans-serif';
  ctx.fillText("Takoyaki", TEX_W / 2, 1330);

  ctx.font = '600 21px "Zen Kaku Gothic New", sans-serif';
  ctx.fillText("ESTD 2025", TEX_W / 2, 1378);

  ctx.font = '700 30px "Zen Kaku Gothic New", sans-serif';
  ctx.fillText("HOT OFF THE GRILL!", TEX_W / 2, 1430);
  ctx.restore();
}

function Paper({
  progress,
}: {
  progress: React.MutableRefObject<number>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const rollCoreRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Frozen copy of the flat grid: every frame is rebuilt from this, so the
  // displaced values can never feed back into themselves.
  const base = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(PAPER_W, PAPER_H, 64, 112);
    return Float32Array.from(geometry.attributes.position.array as Float32Array);
  }, []);

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext("2d");
    if (ctx) drawReceipt(ctx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    // Redraw once the webfonts are available. Loading them explicitly matters:
    // `fonts.ready` can resolve before the browser has requested the faces the
    // canvas needs, which left the bill printed in a fallback font.
    const fonts = document.fonts;
    if (fonts) {
      Promise.all([
        fonts.load('400 84px "Dela Gothic One"'),
        fonts.load('400 36px "Dela Gothic One"'),
        fonts.load('600 22px "Zen Kaku Gothic New"'),
      ])
        .catch(() => undefined)
        .then(() => {
          if (ctx) drawReceipt(ctx);
          tex.needsUpdate = true;
        });
    }
    return tex;
  }, []);

  useFrame(({ clock, gl, camera }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const geometry = mesh.geometry as THREE.PlaneGeometry;
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const time = clock.getElapsedTime();
    // Scroll progress drives the letter from fully rolled to fully open.
    const p = THREE.MathUtils.clamp(progress.current, 0, 1);
    const roll = 1 - p; // normalised height of the roll edge (1 top → 0 bottom)
    const rollY = roll * PAPER_H - PAPER_H / 2;
    // Keep the curl a constant size on screen: convert the wanted pixel
    // radius into world units for this canvas, no matter its size.
    const perspective = camera as THREE.PerspectiveCamera;
    const visibleH = 2 * camera.position.z * Math.tan(((perspective.fov ?? 40) * Math.PI) / 360);
    const pixelsPerUnit = gl.domElement.clientHeight / visibleH;
    const R = THREE.MathUtils.clamp(ROLL_RADIUS_PX / pixelsPerUnit, 0.18, 1.1);
    const coreRadius = R * 0.16;
    const maxLength = PAPER_H;
    const availableLength = Math.max(0, (1 - p) * maxLength);
    const sheetThickness = (Math.PI * (R * R - coreRadius * coreRadius)) / maxLength;

    // A visible tube at the centre of the paper spiral. The loose sheet
    // winds around it rather than collapsing after an arbitrary angle.
    if (rollCoreRef.current) {
      rollCoreRef.current.position.set(0, rollY, R);
      rollCoreRef.current.scale.set(coreRadius, PAPER_W, coreRadius);
      rollCoreRef.current.visible = p < 0.995;
    }

    for (let i = 0; i < position.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const yn = (by + PAPER_H / 2) / PAPER_H;
      const edge = Math.abs(bx) / (PAPER_W / 2); // 0 centre → 1 edge

      // Tiny, irregular side edges: old laid paper is never perfectly cut.
      const edgeFray = Math.pow(edge, 10) * (Math.sin(by * 31) * 0.003 + Math.sin(by * 9.3) * 0.002);
      const paperX = bx + Math.sign(bx) * edgeFray;

      if (yn < roll - 0.002) {
        // Below the roll edge the remaining letter winds into a loose,
        // expanding spiral. Radius decreases gently inward; angle is
        // derived from the paper length, so every row stays distinct.
        const d = (roll - yn) * PAPER_H;
        const wrappedLength = Math.min(d, availableLength);
        const radiusSq = Math.max(coreRadius * coreRadius, R * R - (wrappedLength * sheetThickness) / Math.PI);
        const radius = Math.sqrt(radiusSq);
        const theta = (Math.PI * 2 * (R - radius)) / sheetThickness;
        const ripple = Math.sin(theta * 2.4 + edge * 2) * 0.006;

        position.setX(i, paperX);
        position.setY(i, rollY - (radius + ripple) * Math.sin(theta));
        position.setZ(i, R - (radius + ripple) * Math.cos(theta) + Math.sin(bx * 2 + time * 0.25) * 0.006);
      } else {
        // Above it the letter is revealed, hanging with a soft flutter that
        // swings forward and backward and grows toward the loose bottom end.
        const loose = Math.pow(1 - yn, 1.6);
        const sway = Math.sin(time * 0.9) * 0.09 * loose;
        const flutter =
          Math.sin(yn * 6 + time * 1.25) * 0.03 +
          Math.sin(bx * 2.4 + time * 0.9) * 0.02 +
          Math.sin(yn * 13 - time * 1.7) * 0.01;
        // The free edges of the paper curl a little, like real paper.
        const edgeCurl = Math.pow(edge, 2.2) * 0.05 * loose;
        position.setX(i, paperX + sway);
        position.setY(i, by);
        position.setZ(i, flutter * (0.4 + yn) + Math.sin(yn * Math.PI) * 0.16 + edgeCurl);
      }
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();

    if (groupRef.current) {
      // Keep the sheet nearly planar at rest; only a barely perceptible
      // sway remains so the heavy paper does not look like fabric.
      groupRef.current.rotation.y = Math.sin(time * 0.25) * 0.012;
      groupRef.current.rotation.x = -0.006 + Math.sin(time * 0.3) * 0.004;
      groupRef.current.position.y = Math.sin(time * 0.4) * 0.008;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={rollCoreRef} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1, 1, 1, 48, 1, true]} />
        <meshStandardMaterial color="#9a7950" roughness={0.96} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={meshRef} castShadow>
        <planeGeometry args={[PAPER_W, PAPER_H, 64, 112]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.96}
          metalness={0}
          side={THREE.DoubleSide}
          transparent
          alphaTest={0.04}
        />
      </mesh>
    </group>
  );
}

function Scene({
  progress,
}: {
  progress: React.MutableRefObject<number>;
}) {
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} />
      <directionalLight position={[-4, -2, 2]} intensity={0.45} color="#ffe9c0" />
      <Paper progress={progress} />
    </>
  );
}

export default function PaperBill({ onReady }: { onReady?: () => void }) {
  const progress = useRef(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const tween = gsap.to(progress, {
      current: 1,
      ease: "none",
      scrollTrigger: { trigger: "[data-bill]", start: "top 85%", end: "bottom bottom", scrub: 1.2 },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      onCreated={onReady}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 4.6], fov: 40, near: 0.1, far: 50 }}
    >
      <Scene progress={progress} />
    </Canvas>
  );
}
