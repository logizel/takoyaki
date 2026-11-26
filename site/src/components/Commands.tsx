"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Ball } from "@/components/Ball";
import BillPaper from "@/components/BillPaper";
import Chopsticks from "@/components/Chopsticks";
import { Plate } from "@/components/Plate";
import { commands, setupSteps } from "@/lib/data";

const tilts = [-6, 4, -3, 6, -5, 3, -7, 5];

/** How far a ball rises once the chopsticks are in it. */
const LIFT = 22;

/**
 * Where each takoyaki sits on the plate, in the plate's own 1000×480 space.
 * Four in the back row, four in front — all the same size, neatly spaced,
 * and the front row overlaps the back one so the pile reads as heaped.
 */
const spots = [
  { x: 275, y: 226, z: 1 },
  { x: 425, y: 220, z: 1 },
  { x: 575, y: 220, z: 1 },
  { x: 725, y: 226, z: 1 },
  { x: 275, y: 318, z: 2 },
  { x: 425, y: 322, z: 2 },
  { x: 575, y: 322, z: 2 },
  { x: 725, y: 318, z: 2 },
];

export function Commands() {
  const scope = useRef<HTMLDivElement>(null);
  const ballsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const quickRef = useRef<{ x: (v: number) => void; y: (v: number) => void }[]>([]);
  const dragRef = useRef<{ el: HTMLButtonElement; sx: number; sy: number } | null>(null);
  const placedRef = useRef<boolean[]>([]);
  // Which ball is being pointed at — the chopsticks descend to it and lift it.
  const [active, setActive] = useState<number | null>(null);
  const slotsRef = useRef<(HTMLDivElement | null)[]>([]);
  const pickRef = useRef<number | null>(null);
  const prevActive = useRef<number | null>(null);
  // Carrying the picked ball: where the cursor was when it was grabbed,
  // and the tweens that slide its slot around.
  const grabbedAt = useRef<{ x: number; y: number } | null>(null);
  const cursorPos = useRef({ x: 0, y: 0 });
  const followRef = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null);
  // Which side of the carried ball the command card sits on.
  const [noteSide, setNoteSide] = useState<"left" | "right">("left");

  // Pick up the pointed ball / put it back down.
  useEffect(() => {
    const prev = prevActive.current;
    if (prev != null) {
      const slot = slotsRef.current[prev];
      if (slot) {
        gsap.killTweensOf(slot);
        gsap.to(slot, { x: 0, y: 0, scale: 1, duration: 0.55, ease: "power3.out" });
      }
    }
    followRef.current = null;
    if (active != null) {
      const slot = slotsRef.current[active];
      const ball = ballsRef.current[active];
      if (ball) {
        // Put the note on whichever side of the screen has room before the
        // next pointer move can decide it.
        const rect = ball.getBoundingClientRect();
        const nextSide = rect.left + rect.width / 2 > window.innerWidth * 0.55 ? "left" : "right";
        setNoteSide((current) => (current === nextSide ? current : nextSide));
      }
      if (slot) {
        grabbedAt.current = { ...cursorPos.current };
        gsap.to(slot, { scale: 1.08, duration: 0.4, ease: "back.out(2)" });
        followRef.current = {
          x: gsap.quickTo(slot, "x", { duration: 0.35, ease: "power3" }),
          y: gsap.quickTo(slot, "y", { duration: 0.35, ease: "power3" }),
        };
        // Skewer it: pop the ball up off the plate as the hand closes in.
        followRef.current.x(0);
        followRef.current.y(-LIFT);
      }
    } else {
      grabbedAt.current = null;
    }
    pickRef.current = active;
    prevActive.current = active;
  }, [active]);

  // Press Escape (or scroll away) to set a carried ball down again.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    const onWheel = () => setActive(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  const renderBall = (item: (typeof commands)[number], index: number) => {
    const spot = spots[index];
    return (
      <div
        className="plate-slot"
        key={item.id}
        ref={(element) => {
          slotsRef.current[index] = element;
        }}
        style={{
          left: `${(spot.x / 1000) * 100}%`,
          top: `${(spot.y / 480) * 100}%`,
          zIndex: active === index ? 10 : spot.z,
        }}
      >
        <button
          type="button"
          className="ball ball--plate"
          data-ball
          data-slot
          aria-label={`${item.command}. ${item.note}`}
          ref={(element) => {
            ballsRef.current[index] = element;
          }}
          onPointerEnter={(event) => {
            cursorPos.current = { x: event.clientX, y: event.clientY };
            setActive(index);
          }}
          onPointerLeave={() =>
            // A lagging carried ball must not "leave" its own cursor — the
            // pick only ends on click or Escape.
            setActive((current) => (pickRef.current === index || current !== index ? current : null))
          }
          onFocus={() => setActive(index)}
          onBlur={() =>
            setActive((current) => (pickRef.current === index || current !== index ? current : null))
          }
          onPointerDown={(event) => {
            // Already carrying this one? A click sets it back down.
            if (pickRef.current === index) {
              setActive(null);
              return;
            }
            const ball = ballsRef.current[index];
            if (!ball) return;
            event.preventDefault();
            try {
              (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
            } catch {
              /* ignore */
            }
            dragRef.current = { el: ball, sx: event.clientX, sy: event.clientY };
            placedRef.current[index] = true;
            gsap.to(ball, { scale: 1.12, duration: 0.25, ease: "back.out(2)" });
          }}
        >
          <Ball size={200} tilt={tilts[index % tilts.length]} shadow={active !== index} />
        </button>

        {/* The command, riding beside the lifted ball with room to read. */}
        {active === index && (
          <div className={`pick-note pick-note--${noteSide} pick-note--on`} aria-hidden="true">
            <span className="note__cmd">{item.command}</span>
            <span className="note__desc">{item.note}</span>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    quickRef.current = ballsRef.current.map((ball) =>
      ball
        ? {
            x: gsap.quickTo(ball, "x", { duration: 0.6, ease: "power3" }),
            y: gsap.quickTo(ball, "y", { duration: 0.6, ease: "power3" }),
          }
        : { x: () => {}, y: () => {} },
    );

    const onMove = (event: PointerEvent) => {
      cursorPos.current = { x: event.clientX, y: event.clientY };

      // A picked takoyaki is carried along with the cursor.
      const follower = followRef.current;
      const grabbed = grabbedAt.current;
      if (follower && grabbed) {
        const roomX = window.innerWidth * 0.42;
        const roomY = window.innerHeight * 0.42;
        const tx = Math.max(-roomX, Math.min(roomX, event.clientX - grabbed.x));
        const ty = Math.max(-roomY, Math.min(roomY, event.clientY - grabbed.y));
        follower.x(tx);
        follower.y(ty - LIFT);
        // Put the card on whichever side has room.
        const nextSide = event.clientX > window.innerWidth * 0.55 ? "left" : "right";
        setNoteSide((current) => (current === nextSide ? current : nextSide));
      }

      const dragging = dragRef.current;
      if (dragging) {
        gsap.set(dragging.el, { x: event.clientX - dragging.sx, y: event.clientY - dragging.sy });
        return;
      }
      ballsRef.current.forEach((ball, index) => {
        if (!ball) return;
        // A ball the user has placed keeps its position — no magnetic pull.
        if (placedRef.current[index]) return;
        // A ball being lifted by the chopsticks is not tugged by the cursor.
        if (pickRef.current === index) return;
        const rect = ball.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy);
        const reach = 260;
        const pull = distance < reach ? (1 - distance / reach) * 0.24 : 0;
        quickRef.current[index]?.x(dx * pull);
        quickRef.current[index]?.y(dy * pull);
      });
    };

    const onUp = () => {
      // The ball stays exactly where the cursor left it — no springing back.
      if (dragRef.current) {
        gsap.to(dragRef.current.el, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.5)" });
      }
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);

    const intro = gsap.timeline({
      scrollTrigger: { trigger: "#commands", start: "top 70%", end: "top 20%", scrub: true },
    });
    intro.fromTo("[data-commands-head]", { opacity: 0, y: 20 }, { opacity: 1, y: 0 });

    // Each takoyaki falls onto the plate, bounces, and settles for good.
    const fall = gsap.timeline({
      scrollTrigger: {
        trigger: "#commands",
        start: "top 55%",
        toggleActions: "play none none none",
      },
    });

    gsap.utils.toArray<HTMLElement>("[data-ball]", scope.current).forEach((ball, index) => {
      const at = index * 0.14;
      const spin = (index % 2 === 0 ? 1 : -1) * (8 + index * 2);

      fall
        .fromTo(
          ball,
          { y: -window.innerHeight * 1.1, opacity: 0, rotation: spin * 3 },
          { opacity: 1, duration: 0.08 },
          at,
        )
        // Gravity: accelerating drop onto the plate.
        .to(ball, { y: 0, duration: 1.05, ease: "power1.in" }, at)
        // Impact: the ball squashes and hops.
        .to(ball, { scaleY: 0.76, scaleX: 1.18, duration: 0.09, ease: "power2.out" }, at + 1.05)
        .to(ball, { y: -46, duration: 0.24, ease: "power2.out" }, at + 1.09)
        // Settle: it bounces a couple of times, then comes to rest.
        .to(ball, { y: 0, duration: 0.85, ease: "bounce.out" }, at + 1.33)
        .to(ball, { scaleY: 1, scaleX: 1, duration: 0.45, ease: "elastic.out(1, 0.4)" }, at + 1.14)
        .to(ball, { rotation: spin, duration: 0.9, ease: "elastic.out(1, 0.35)" }, at + 1.14);
    });

    // The bill unrolls downward like a letter, then floats.
    gsap.fromTo(
      "[data-receipt]",
      { clipPath: "inset(0% 0% 100% 0%)", y: 0 },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        ease: "none",
        scrollTrigger: { trigger: "[data-bill]", start: "top 85%", end: "bottom bottom", scrub: 1 },
      },
    );
    gsap.fromTo(
      "[data-receipt-roll]",
      { top: "0%" },
      {
        top: "100%",
        ease: "none",
        scrollTrigger: { trigger: "[data-bill]", start: "top 85%", end: "bottom bottom", scrub: 1 },
      },
    );
    gsap.to("[data-receipt]", {
      y: -10,
      rotate: 0.8,
      duration: 3.6,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: 0.4,
    });
    gsap.to("[data-receipt-shadow]", {
      scaleX: 1.08,
      opacity: 0.34,
      duration: 3.6,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: 0.4,
    });
  }, { scope });

  return (
    <div ref={scope}>
      <section id="commands" className="stage stage--tray">
        <div className="stage__sticky">
          <div className="stage__head" data-commands-head>
            <p className="stage__eyebrow">Commands</p>
            <h2 className="stage__title">Point at a takoyaki for its command</h2>
          </div>

          {/* The chopstick hand rides above the plate, following the cursor. */}
          <Chopsticks ballEl={active != null ? (ballsRef.current[active] ?? null) : null} />

          <div className="stage-plate-wrap">
            <div className="plate-scene">
              <Plate className="plate-scene__back" />
              <div className="plate-scene__balls">
                {commands.map((item, index) => renderBall(item, index))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bill" data-bill>
        <div className="bill__sticky">
          <div className="bill__shadow" data-receipt-shadow aria-hidden="true" />
          <BillPaper />
          <div className="bill__stage">
            <svg className="receipt__chopsticks receipt__chopsticks--back" viewBox="0 0 900 220" aria-hidden="true">
              {/* Back stick — tucks behind the paper. */}
              <polygon
                points="0,112 900,15 900,25 0,128"
                fill="url(#takoWood)"
                stroke="var(--line-ink)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <line x1="40" y1="112" x2="880" y2="20" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" />
            </svg>

            <div className="receipt" data-receipt>
              <p className="receipt__thanks">Setup</p>
              <p className="receipt__lead">Three steps, then it just runs</p>
              <p className="receipt__note">From install to your first ping in under a minute.</p>

              <div className="receipt__steps">
                {setupSteps.map((step) => (
                  <div className="receipt__step" key={step.num}>
                    <span className="receipt__num">{step.num}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="receipt__divider" aria-hidden="true" />

              <p className="receipt__brand">Takoyaki</p>
              <p className="receipt__estd">estd 2025</p>
              <p className="receipt__tag">hot off the grill!</p>

              <span className="receipt__roll-edge" data-receipt-roll aria-hidden="true" />
            </div>

            <svg className="receipt__chopsticks receipt__chopsticks--front" viewBox="0 0 900 220" aria-hidden="true">
              {/* Front stick — lies across the paper. */}
              <polygon
                points="0,92 900,195 900,205 0,108"
                fill="url(#takoWood)"
                stroke="var(--line-ink)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <line x1="40" y1="100" x2="880" y2="200" stroke="rgba(255,255,255,0.32)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}
