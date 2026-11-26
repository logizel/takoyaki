"use client";

import { useEffect, useRef, useState } from "react";

/**
 * An illustrated hand gripping two chopsticks — a public-domain drawing
 * (freesvg.org, CC0), tinted into the site's ink-shadow look and flipped
 * so the chopstick tips reach down-left toward the plate.
 *
 * The tips sit at the bottom-left of the drawing. The hand is translated
 * so those tips land on the cursor — or on the takoyaki being picked —
 * and it presses down slightly while a ball is held.
 */
const TIP_X = 0.08; // tip position inside the drawing, as a fraction of its size
const TIP_Y = 0.9;

export default function Chopsticks({ ballEl }: { ballEl: HTMLElement | null }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const cursor = useRef({ x: 0, y: 0, known: false });
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      cursor.current.x = event.clientX;
      cursor.current.y = event.clientY;
      cursor.current.known = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    setPicking(Boolean(ballEl));
  }, [ballEl]);

  useEffect(() => {
    let raf = 0;
    const smooth = { x: 0, y: 0, rot: -3, known: false };
    const start = performance.now();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const stage = stageRef.current;
      const hand = handRef.current;
      if (!stage || !hand) return;

      const stageRect = stage.getBoundingClientRect();
      const handW = hand.offsetWidth;
      const handH = hand.offsetHeight;
      if (!handW || !handH) return;

      // Where should the chopstick tips point?
      let targetX: number;
      let targetY: number;
      if (ballEl) {
        const r = ballEl.getBoundingClientRect();
        targetX = r.left + r.width / 2;
        // Bury the tips in the upper half of the ball, so the ball covers
        // them and reads as skewered rather than resting on top.
        targetY = r.top + r.height * 0.44;
      } else if (cursor.current.known) {
        targetX = cursor.current.x;
        targetY = cursor.current.y;
      } else {
        // Idle: hang to the right of the plate until the cursor moves.
        targetX = stageRect.left + stageRect.width * 0.8;
        targetY = stageRect.top + stageRect.height * 0.55;
      }
      targetX -= stageRect.left;
      targetY -= stageRect.top;

      if (!smooth.known) {
        smooth.x = targetX;
        smooth.y = targetY;
        smooth.known = true;
      }
      // Ease the tips toward the target — tighter while carrying a ball so
      // the chopsticks stay visibly stuck inside it.
      const follow = ballEl ? 0.45 : 0.11;
      smooth.x += (targetX - smooth.x) * follow;
      smooth.y += (targetY - smooth.y) * follow;
      const targetRot = ballEl ? -9 : -3;
      smooth.rot += (targetRot - smooth.rot) * 0.12;

      // Place the drawing so its tips sit on the smoothed point.
      let x = smooth.x - handW * TIP_X;
      let y = smooth.y - handH * TIP_Y;
      // Never let the hand wander too far out of the stage. While a ball is
      // carried, allow it to follow toward the edges so the tips stay buried.
      const minX = ballEl ? -handW * 0.65 : -handW * 0.08;
      const maxX = ballEl ? stageRect.width - handW * 0.15 : stageRect.width - handW * 0.9;
      const minY = ballEl ? -handH * 0.92 : -handH * 0.04;
      const maxY = ballEl ? stageRect.height - handH * 0.3 : stageRect.height - handH * 0.86;
      x = Math.min(Math.max(x, minX), maxX);
      y = Math.min(Math.max(y, minY), maxY);

      const t = (performance.now() - start) / 1000;
      const bob = picking ? 0 : Math.sin(t * 1.6) * 2;
      hand.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + bob).toFixed(1)}px, 0) rotate(${smooth.rot.toFixed(2)}deg)`;
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ballEl, picking]);

  return (
    <div className="hand-stage" ref={stageRef}>
      <div className={`hand${picking ? " hand--picking" : ""}`} ref={handRef}>
        {/* Hand with chopsticks — freesvg.org image 136461 (public domain). */}
        <img className="hand__art" src="/hand.png" alt="" draggable={false} />
      </div>
    </div>
  );
}
