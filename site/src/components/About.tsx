"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** The name reveals as you scroll, then the about copy fades in under it. */
export function About() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: scope.current, start: "top top", end: "bottom bottom", scrub: 1 },
    });
    timeline
      .fromTo(
        "[data-about-name]",
        { scale: 0.72, opacity: 0.25, yPercent: 14 },
        { scale: 1.5, opacity: 1, yPercent: -12, ease: "none", duration: 1 },
      )
      .fromTo(
        "[data-about-text]",
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, ease: "none", duration: 0.5 },
        0.55,
      )
      // Then it clears away as you scroll past, like a portfolio name.
      .to("[data-about-name]", { opacity: 0, scale: 1.8, ease: "none", duration: 0.3 }, 1.05)
      .to("[data-about-text]", { opacity: 0, y: -28, ease: "none", duration: 0.25 }, 1.08);
  }, { scope });

  return (
    <section id="about" className="about" ref={scope}>
      <div className="about__sticky">
        <h2 className="about__name" data-about-name>TAKOYAKI</h2>
        <p className="about__text" data-about-text>
          Takoyaki is a GitHub Discord bot. It watches your repositories and pings pushes, pull
          requests, issues, new repos, and CI runs then serves up contribution stats, streak
          heatmaps, and leaderboards, all hot off the grill.
        </p>
      </div>
    </section>
  );
}
