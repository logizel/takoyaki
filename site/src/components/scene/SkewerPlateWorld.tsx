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

const BALLS = 8;

type BallState = { insert: number; transfer: number; lift: number };

/**
 * One world for the features + commands pages: the same eight balls are
 * stacked on the chopstick, then arc off it and land on the plate.
 */
export default function SkewerPlateWorld() {
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

  const chopstickRef = useRef<THREE.Group>(null);
  const plateRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const ballRefs = useRef<(THREE.Group | null)[]>([]);
  const drizzleRefs = useRef<(THREE.Group | null)[]>([]);
  const state = useRef<BallState[]>(
    Array.from({ length: BALLS }, () => ({ insert: 0, transfer: 0, lift: 0 })),
  );
  const rectsRef = useRef<{
    skewer: DOMRect | null;
    plate: DOMRect | null;
    sticks: DOMRect[];
    plates: DOMRect[];
  }>({ skewer: null, plate: null, sticks: [], plates: [] });

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const toList = (kind: string) =>
        Array.from(document.querySelectorAll<HTMLElement>(`[data-kind="${kind}"]`)).map((el) =>
          el.getBoundingClientRect(),
        );
      const skewer = document.querySelector("[data-skewer]");
      const plate = document.querySelector("[data-plate]");
      rectsRef.current = {
        skewer: skewer ? skewer.getBoundingClientRect() : null,
        plate: plate ? plate.getBoundingClientRect() : null,
        sticks: toList("stick"),
        plates: toList("plate"),
      };
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const interval = window.setInterval(schedule, 400);
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
          insert: target ? 1 : ball.insert,
          duration: target ? 0.55 : 0.4,
          ease: target ? "back.out(2.2)" : "power2.out",
        });
      });
    };
    window.addEventListener("tako:hover", onHover);
    return () => window.removeEventListener("tako:hover", onHover);
  }, []);

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);

    drizzleRefs.current.forEach((drizzle, index) => {
      if (!drizzle) return;
      gsap.fromTo(
        drizzle.position,
        { y: 3.2 },
        { y: 0, duration: 1.1, delay: 0.5 + index * 0.16, ease: "bounce.out" },
      );
    });

    const insert = gsap.timeline({
      scrollTrigger: { trigger: "#features", start: "top top", end: "bottom bottom", scrub: 1 },
    });
    state.current.forEach((ball, index) => {
      insert.to(ball, { insert: 1, duration: 1, ease: "bounce.out" }, index * 0.34);
    });

    const transfer = gsap.timeline({
      scrollTrigger: { trigger: "#commands", start: "top bottom", end: "center center", scrub: 1 },
    });
    state.current.forEach((ball, index) => {
      transfer.to(ball, { transfer: 1, duration: 1, ease: "power2.inOut" }, index * 0.22);
    });
  }, { dependencies: [] });

  useFrame(() => {
    const { skewer, plate: plateRect, sticks, plates } = rectsRef.current;
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = perspective.fov * (Math.PI / 180);
    const wpp = (2 * Math.tan(fov / 2) * perspective.position.z) / size.height;
    const toX = (px: number) => (px - size.width / 2) * wpp;
    const toY = (py: number) => -(py - size.height / 2) * wpp;
    const topWorld = (size.height / 2) * wpp;

    if (chopstickRef.current && skewer) {
      const chopRadius = skewer.width * 0.5 * wpp;
      chopstickRef.current.position.set(
        toX(skewer.left + skewer.width * 0.5),
        toY(skewer.top + skewer.height * 0.5),
        0,
      );
      chopstickRef.current.rotation.set(0, 0, 0.02);
      chopstickRef.current.scale.set(chopRadius / 0.08, skewer.height * wpp, chopRadius / 0.08);
    }

    if (plateRef.current && plateRect) {
      const plateRadius = plateRect.width * 0.44 * wpp;
      const cx = toX(plateRect.left + plateRect.width * 0.5);
      const anchorY = plates.length
        ? plates.reduce((sum, rect) => sum + (rect.top + rect.height * 0.5), 0) / plates.length
        : plateRect.top + plateRect.height * 0.6;
      plateRef.current.position.set(cx, toY(anchorY) - plateRadius * 0.24, -0.14);
      plateRef.current.rotation.set(-0.3, 0, 0);
      plateRef.current.scale.set(plateRadius, plateRadius * 0.5, plateRadius * 0.76);
    }

    if (shadowRef.current && plateRect) {
      const plateRadius = plateRect.width * 0.44 * wpp;
      shadowRef.current.position.set(
        toX(plateRect.left + plateRect.width * 0.5),
        toY(plateRect.top + plateRect.height * 0.9) - plateRadius * 0.3,
        -0.4,
      );
      shadowRef.current.scale.set(plateRadius * 2, plateRadius * 0.55, 1);
    }

    const stick0 = sticks[0];
    const radius = stick0 ? stick0.width * 0.5 * wpp : 0.55;

    for (let i = 0; i < BALLS; i++) {
      const ball = ballRefs.current[i];
      if (!ball) continue;
      const s = state.current[i];
      const stick = sticks[i] ?? sticks[0];
      const seat = plates[i] ?? plates[0];
      if (!stick || !seat) continue;

      const sx = toX(stick.left + stick.width * 0.5);
      const sy = toY(stick.top + stick.height * 0.5);
      const px = toX(seat.left + seat.width * 0.5);
      const py = toY(seat.top + seat.height * 0.5) - radius * 0.3;

      const dropY = topWorld + radius * 3 + i * radius * 0.6;
      const baseY = THREE.MathUtils.lerp(dropY, sy, s.insert);
      const x = THREE.MathUtils.lerp(sx, px, s.transfer);
      const arc = radius * 3.4 * Math.sin(Math.PI * s.transfer);
      const y = THREE.MathUtils.lerp(baseY, py, s.transfer) + arc + s.lift * radius * 2.2;

      ball.position.set(x, y, 0.3 + s.lift * 0.6 + s.transfer * 0.1);
      ball.rotation.y = performance.now() / 4000 + i;
      ball.rotation.z = (1 - s.insert) * 0.5 * Math.sin(i);
      ball.scale.setScalar(radius * (1 + s.lift * 0.14));
    }
  });

  return (
    <group>
      <group ref={plateRef}>
        <mesh geometry={plateGeometry} castShadow receiveShadow>
          <meshPhysicalMaterial
            color="#EDEBE6"
            roughness={0.36}
            metalness={0}
            clearcoat={0.4}
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
          <meshStandardMaterial color="#E6CD9E" roughness={0.68} />
        </mesh>
      </group>

      {Array.from({ length: BALLS }).map((_, index) => (
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
          </group>
        </group>
      ))}
    </group>
  );
}
