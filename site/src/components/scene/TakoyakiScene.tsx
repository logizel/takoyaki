"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import {
  createBallGeometry,
  createChopstickGeometry,
  createMayoGeometry,
  createOnionRingGeometry,
  createPlateGeometry,
  createSauceGeometry,
} from "./geometry";

export type SceneMode = "hero" | "skewer" | "bowl";

const BALLS = 8;

type BallState = { p: number; lift: number };

const HERO_LAYOUT = [
  [-0.92, 0.2],
  [0.0, 0.42],
  [0.92, 0.2],
  [-0.52, -0.24],
  [0.52, -0.24],
];

export default function TakoyakiScene({ mode, trigger }: { mode: SceneMode; trigger?: string }) {
  const { camera, size } = useThree();

  const segments = size.width < 720 ? 40 : 64;
  const ballGeometry = useMemo(() => createBallGeometry(segments), [segments]);
  const chopstickGeometry = useMemo(() => createChopstickGeometry(), []);
  const plateGeometry = useMemo(() => createPlateGeometry(), []);
  const sauceGeometry = useMemo(() => createSauceGeometry(), []);
  const mayoGeometry = useMemo(() => createMayoGeometry(), []);
  const onionGeometry = useMemo(() => createOnionRingGeometry(), []);
  const shadowTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      gradient.addColorStop(0, "rgba(20,26,12,0.5)");
      gradient.addColorStop(1, "rgba(20,26,12,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  const groupRef = useRef<THREE.Group>(null);
  const chopstickRef = useRef<THREE.Group>(null);
  const plateRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const ballRefs = useRef<(THREE.Group | null)[]>([]);
  const drizzleRefs = useRef<(THREE.Group | null)[]>([]);
  const state = useRef<BallState[]>(Array.from({ length: BALLS }, () => ({ p: mode === "hero" ? 1 : 0, lift: 0 })));
  const rectsRef = useRef<{ ball: DOMRect | null; plate: DOMRect | null }>({ ball: null, plate: null });

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const ball = document.querySelector("[data-slot]");
      const plate = document.querySelector("[data-plate]");
      rectsRef.current = {
        ball: ball ? ball.getBoundingClientRect() : null,
        plate: plate ? plate.getBoundingClientRect() : null,
      };
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const interval = window.setInterval(schedule, 500);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onHover = (event: Event) => {
      const index = (event as CustomEvent<{ index: number }>).detail?.index ?? -1;
      state.current.forEach((ball, i) => {
        const target = i === index;
        gsap.to(ball, {
          lift: target ? 1 : 0,
          duration: target ? 0.55 : 0.4,
          ease: target ? "back.out(2.2)" : "power2.out",
        });
        // On the skewer, moving the cursor inserts the ball onto the chopstick.
        if (mode === "skewer" && target) {
          gsap.to(ball, { p: 1, duration: 0.6, ease: "back.out(2)" });
        }
      });
    };
    window.addEventListener("tako:hover", onHover);
    return () => window.removeEventListener("tako:hover", onHover);
  }, [mode]);

  useGSAP(() => {
    // The drizzle falls onto each ball once, then stays put.
    drizzleRefs.current.forEach((drizzle, index) => {
      if (!drizzle) return;
      gsap.fromTo(
        drizzle.position,
        { y: 3.2 },
        { y: 0, duration: 1.1, delay: 0.5 + index * 0.16, ease: "bounce.out" },
      );
      gsap.fromTo(
        drizzle.scale,
        { x: 0.35, y: 0.35, z: 0.35 },
        { x: 1, y: 1, z: 1, duration: 1.1, delay: 0.5 + index * 0.16, ease: "back.out(1.6)" },
      );
    });

    if (!trigger) return;
    gsap.registerPlugin(ScrollTrigger);
    const timeline = gsap.timeline({
      scrollTrigger: { trigger, start: "top top", end: "bottom bottom", scrub: 1 },
    });
    state.current.forEach((ball, index) => {
      timeline.to(ball, { p: 1, duration: 1, ease: "bounce.out" }, index * 0.34);
    });
  }, { dependencies: [trigger, mode] });

  useFrame(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = perspective.fov * (Math.PI / 180);
    const wpp = (2 * Math.tan(fov / 2) * perspective.position.z) / size.height;
    const toX = (px: number) => (px - size.width / 2) * wpp;
    const toY = (py: number) => -(py - size.height / 2) * wpp;
    const time = performance.now() / 1000;

    const slot = rectsRef.current.ball;
    const slotRadius = slot ? slot.width * 0.5 * wpp : mode === "hero" ? 1.05 : 0.62;
    const radius = mode === "bowl" ? slotRadius * 0.92 : slotRadius;
    const topWorld = (size.height / 2) * wpp;

    if (groupRef.current && mode === "hero") {
      groupRef.current.rotation.y = Math.sin(time * 0.22) * 0.34;
      groupRef.current.position.y = 0.62 + Math.sin(time * 0.7) * 0.08;
    }

    if (chopstickRef.current) {
      const chopRadius = Math.max(0.022, radius * 0.32);
      chopstickRef.current.position.set(0, radius * 0.1, -0.12);
      chopstickRef.current.rotation.set(0, 0, 0.02);
      chopstickRef.current.scale.set(chopRadius / 0.08, radius * 7.4, chopRadius / 0.08);
      chopstickRef.current.visible = mode === "skewer";
    }

    const plateRect = rectsRef.current.plate;
    const plateRadius = plateRect ? plateRect.width * 0.5 * wpp : mode === "hero" ? 3.1 : 2.6;
    const plateCy = plateRect ? toY(plateRect.top + plateRect.height * 0.42) : mode === "hero" ? -1.5 : -2.4;
    const plateCx = plateRect ? toX(plateRect.left + plateRect.width * 0.5) : 0;

    if (plateRef.current) {
      plateRef.current.position.set(plateCx, plateCy + (mode === "hero" ? 0.62 : 0), -0.18);
      plateRef.current.rotation.set(-0.62, 0, 0);
      plateRef.current.scale.set(plateRadius, plateRadius * 0.34, plateRadius * 0.82);
      plateRef.current.visible = mode !== "skewer";
    }

    if (shadowRef.current) {
      shadowRef.current.position.set(plateCx, plateCy - plateRadius * 0.34, -0.45);
      shadowRef.current.scale.set(plateRadius * 2.1, plateRadius * 0.8, 1);
      shadowRef.current.visible = mode !== "skewer";
    }

    for (let i = 0; i < BALLS; i++) {
      const ball = ballRefs.current[i];
      if (!ball) continue;
      const s = state.current[i];

      let targetX = 0;
      let targetY = 0;

      if (mode === "hero") {
        const [lx, ly] = HERO_LAYOUT[i % HERO_LAYOUT.length];
        targetX = lx;
        targetY = ly;
      } else if (slot) {
        const el = document.querySelectorAll<HTMLElement>("[data-slot]")[i];
        const rect = el ? el.getBoundingClientRect() : slot;
        targetX = toX(rect.left + rect.width * 0.5);
        targetY = toY(rect.top + rect.height * 0.5);
      }

      const startY = topWorld + radius * 3 + i * radius * 0.6;
      const y = THREE.MathUtils.lerp(startY, targetY, s.p) + s.lift * radius * 2.4;
      const z = 0.25 + s.lift * 0.6;

      ball.position.set(targetX, y + Math.sin(time * 2.4 + i) * radius * 0.04 * s.p, z);
      ball.rotation.y = time * 0.2 + i;
      ball.rotation.z = (1 - s.p) * 0.5 * Math.sin(i);

      const squash = 1 - 0.2 * Math.sin(Math.min(1, Math.max(0, (s.p - 0.86) * 6.6)) * Math.PI);
      ball.scale.setScalar(radius * squash * (1 + s.lift * 0.14));
    }
  });

  return (
    <group>
      <group ref={plateRef}>
        <mesh geometry={plateGeometry} castShadow receiveShadow>
          <meshPhysicalMaterial
            color="#EFE7D2"
            roughness={0.34}
            metalness={0}
            clearcoat={0.5}
            clearcoatRoughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      <mesh ref={shadowRef}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
      </mesh>

      <group ref={chopstickRef}>
        <mesh geometry={chopstickGeometry} castShadow>
          <meshStandardMaterial color="#E6CD9E" roughness={0.68} metalness={0} />
        </mesh>
      </group>

      <group ref={groupRef}>
        {state.current.map((_, index) => (
          <group
            key={index}
            ref={(element) => {
              ballRefs.current[index] = element;
            }}
          >
            <mesh geometry={ballGeometry} castShadow receiveShadow>
              <meshPhysicalMaterial
                color="#CE8A3E"
                roughness={0.6}
                metalness={0}
                clearcoat={0.5}
                clearcoatRoughness={0.45}
                sheen={0.45}
                sheenColor="#E0A94A"
              />
            </mesh>

            <group
              ref={(element) => {
                drizzleRefs.current[index] = element;
              }}
            >
              <mesh geometry={sauceGeometry}>
                <meshPhysicalMaterial color="#5E2A0E" roughness={0.2} metalness={0} clearcoat={0.95} clearcoatRoughness={0.15} />
              </mesh>
              <mesh geometry={mayoGeometry}>
                <meshStandardMaterial color="#F7F1E0" roughness={0.7} />
              </mesh>
              <mesh geometry={onionGeometry} position={[0.15, 0.9, 0.35]} rotation={[0.4, 0, 0.3]} scale={1.6}>
                <meshStandardMaterial color="#6FA53A" roughness={0.6} />
              </mesh>
              <mesh geometry={onionGeometry} position={[-0.45, 0.6, 0.6]} rotation={[0.2, 0.6, -0.4]} scale={1.3}>
                <meshStandardMaterial color="#6FA53A" roughness={0.6} />
              </mesh>
              <mesh position={[0.55, 0.45, 0.6]}>
                <sphereGeometry args={[0.055, 12, 12]} />
                <meshStandardMaterial color="#F7F1E0" roughness={0.5} />
              </mesh>
              <mesh position={[-0.2, 0.72, 0.65]}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#F7F1E0" roughness={0.5} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
