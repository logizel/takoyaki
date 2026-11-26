"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/** A bonito flake replaces the pointer on desktop. */
export default function BonitoCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    document.documentElement.classList.add("has-flake-cursor");

    const xTo = gsap.quickTo(el, "x", { duration: 0.14, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.14, ease: "power3" });
    const rTo = gsap.quickTo(el, "rotate", { duration: 0.3, ease: "power2" });

    let lastX = 0;
    const move = (event: PointerEvent) => {
      xTo(event.clientX);
      yTo(event.clientY);
      const dx = event.clientX - lastX;
      lastX = event.clientX;
      rTo(gsap.utils.clamp(-28, 28, dx * 1.2));
    };

    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.classList.remove("has-flake-cursor");
    };
  }, []);

  return (
    <div ref={ref} className="bonito-cursor" aria-hidden="true">
      <svg viewBox="0 0 44 30" width="44" height="30">
        <path
          d="M2 17C10 4 23 3 31 10c6 5 9 3 9-2 0 11-10 19-23 19C8 27 3 23 2 17Z"
          fill="#ead3a0"
          stroke="#6b5124"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M10 19c5-7 13-8 19-4" fill="none" stroke="#c8a86a" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}
