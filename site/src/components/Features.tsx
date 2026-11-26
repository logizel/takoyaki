"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Ball } from "@/components/Ball";
import { HandArrow } from "@/components/HandArrow";
import { features } from "@/lib/data";

const tilts = [-6, 4, -3, 6, -5, 3, -7, 5];
const shortLabels = ["Pings", "Stats", "Streak", "Leaders", "Compare", "Top day", "Modes", "Setup"];

/** Balls split 4 + 4 between a left and a right chopstick. */
export function Features() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reveal = gsap.timeline({
      scrollTrigger: { trigger: scope.current, start: "top 70%", end: "top 25%", scrub: true },
    });
    reveal.fromTo("[data-feature-head]", { opacity: 0, y: 20 }, { opacity: 1, y: 0 });

    const balls = gsap.utils.toArray<HTMLElement>("[data-ball]", scope.current);
    const drop = gsap.timeline({
      scrollTrigger: { trigger: scope.current, start: "top top", end: "bottom bottom", scrub: 1 },
    });
    balls.forEach((ball, index) => {
      const side = index % 2 === 0 ? -1 : 1;
      const landedLabel = ball.querySelector<HTMLElement>("[data-landed-label]");
      const contactShadow = ball.querySelector<HTMLElement>("[data-contact-shadow]");
      const at = index * 0.3;
      drop.fromTo(
        ball,
        { yPercent: -420, opacity: 0, rotate: side * 12 },
        { yPercent: 0, opacity: 1, rotate: 0, ease: "power2.in", duration: 0.78 },
        at,
      );
      // Compress on contact, then spring back to a plump resting shape.
      drop.to(ball, { scaleX: 1.13, scaleY: 0.84, duration: 0.1, ease: "power2.in" }, at + 0.76);
      drop.to(ball, { scaleX: 1, scaleY: 1, duration: 0.42, ease: "elastic.out(1, 0.38)" }, at + 0.86);
      if (contactShadow) {
        drop.fromTo(contactShadow, { opacity: 0, scaleX: 0.35 }, { opacity: 0.42, scaleX: 1, duration: 0.35 }, at + 0.76);
      }
      if (landedLabel) {
        drop.fromTo(
          landedLabel,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, ease: "power2.out", duration: 0.35 },
          index * 0.3 + 0.75,
        );
      }
    });
  }, { scope });

  return (
    <section id="features" className="stage" ref={scope}>
      <div className="stage__sticky">
        <div className="stage__head" data-feature-head>
          <p className="stage__eyebrow">Features</p>
          <h2 className="stage__title">Everything you’d check a dashboard for</h2>
          <p className="stage__sub">Except you don’t have to. It shows up where your team already talks.</p>
        </div>

        <div className="chopstick-pair">
          {[0, 1].map((column) => (
            <div className={`chopstick-col chopstick-col--${column === 0 ? "l" : "r"}`} key={column}>
              <div className="skewer-stack">
                <span className="chopstick" aria-hidden="true" />
                <div className="skewer-balls">
                {features.slice(column * 4, column * 4 + 4).map((feature, index) => (
                  <button
                    type="button"
                    className="ball ball--skewer"
                    data-ball
                    key={feature.id}
                    aria-label={`${feature.label}. ${feature.desc}`}
                  >
                    <span className="ball-contact-shadow" data-contact-shadow aria-hidden="true" />
                    <Ball size={152} tilt={tilts[(column * 4 + index) % tilts.length]} />
                    <span className={`tag tag--landed ${column === 0 ? "tag--left" : "tag--right"}`} data-landed-label>
                      <HandArrow className={`tag__arrow ${column === 0 ? "tag__arrow--right" : ""}`} />
                      <span>{shortLabels[column * 4 + index]}</span>
                    </span>
                    <span className={`tag tag--glass ${column === 0 ? "tag--right" : "tag--left"} ${index === 0 ? "tag--glass--high" : index === 3 ? "tag--glass--low" : ""}`}>
                      <strong>{feature.label}</strong>
                      <span className="tag__desc">{feature.desc}</span>
                      <em>{feature.note}</em>
                    </span>
                  </button>
                ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="stage-hint">point at a takoyaki for its feature in detail</p>
      </div>
    </section>
  );
}
