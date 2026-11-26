# DESIGN_SPEC.md — Takoyaki Landing Page Visual Direction

Scope: `docs/` static landing page only (`index.html`, `style.css`, `script.js`, `octopus-logo.png`).
Product being represented: **Takoyaki — a Discord bot that bridges GitHub webhook activity into Discord channels**, with OAuth account linking and contribution-stat commands. No restaurant, no CP-bot framing.

Reference pass (principles only, no assets or copy lifted):
- **withanimation.app** — restrained library of small, single-purpose micro-animations; each animation has one job (reveal, loop, state change). Principle: *few, legible, purposeful motion primitives*.
- **cosmos.so** — JS-rendered visual feed; could not be meaningfully inspected via text fetch, so it is used only as a reminder that a single strong image/object can carry a page. No claims made about its actual styling.
- **colorhunt.co** — palette discovery; used as method (4–5 swatch limits), not a specific copied palette.
- **indisea.com** — numbered sections (`01 / hero`), calm editorial spacing, one message per section. Principle: *structural numbering and generous whitespace as design*.
- **ohhmydesign.com** — strong oversized display type, playful system labels (`hero.frame`, `STATEMENT.TXT`). Principle: *type as the hero; small "system" labels add character without clutter*.
- **inkgames.com** — full-bleed product imagery with minimal chrome. Principle: *let the product's one visual object dominate*.
- **alihahamed-portfolio** — motion as communication ("animation isn't decoration"), subtraction as craft. Principle: *cut anything that doesn't pull its weight*.

---

## 1. Concept statement

**"The Plate."** Takoyaki is a bridge: GitHub events are dropped in at the top, and finished notifications are served to Discord. The whole site reads like a single takoyaki plate seen from above — one warm, round, charred-sphere visual anchors the hero, and the rest of the page is quiet editorial typography around it. One object, one palette, one motion idea (things *surface* from below, like takoyaki being turned in the pan). Japanese influence comes from restraint, vertical rhythm, and small kana/numbered labels — not from torii gates, sakura petals, or brush fonts.

## 2. Palette (5 swatches, Color Hunt-style limit)

Takoyaki is: dark cast-iron pan, golden-brown sphere, pale sauce, aonori green, katsuobushi white.

| Role | Hex | Use |
| --- | --- | --- |
| Pan (base) | `#1A1614` | Page background, footer |
| Charred crust (surface) | `#2E2622` | Cards, section panels, code blocks |
| Tako gold (accent) | `#E8A33D` | Primary CTA, signature visual highlights, links on hover |
| Sauce ivory (text) | `#F5EFE6` | Headlines and body text |
| Aonori (support) | `#7C9A6D` | Small labels, success/live dots, secondary accents — max ~5% of any screen |

Rules: no gradients except a single soft radial warm glow behind the hero object; no glassmorphism; aonori never used for large areas.

## 3. Fonts (available, properly licensed)

All free / open license, loaded via Google Fonts (already the existing loading pattern) with local fallbacks:

- **Display + headings: "Zen Kaku Gothic New"** (SIL OFL, Google Fonts). A contemporary Japanese gothic typeface with full Latin coverage — gives subtle Japanese typographic DNA without a clichéd "Japanese brush" look. Weights: 500, 700.
  - Fallback stack: `system-ui, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`
- **Body: "Inter"** (OFL, Google Fonts — already in use on the current page). Weights: 400, 500. Keep it; it earns its place and avoids adding a third family.
  - Fallback stack: `system-ui, -apple-system, sans-serif`
- **Mono (command/code, e.g. `/setchannel`, `/stats`): "IBM Plex Mono"** (OFL, Google Fonts). Weights: 400, 500.
  - Fallback: `ui-monospace, "SF Mono", Menlo, monospace`

Maximum three families. No serif display (retires the current Playfair Display pairing — it reads editorial-food-blog, not product).

## 4. Typography & spacing tokens

```css
--step--1: clamp(0.8rem, 0.75rem + 0.25vw, 0.9rem);   /* labels, captions */
--step-0:  clamp(1rem, 0.95rem + 0.3vw, 1.125rem);    /* body */
--step-1:  clamp(1.25rem, 1.1rem + 0.6vw, 1.6rem);    /* h3 */
--step-2:  clamp(1.7rem, 1.4rem + 1.2vw, 2.4rem);     /* h2 */
--step-3:  clamp(2.6rem, 2rem + 3vw, 4.2rem);         /* h1 desktop */

--space-1: 8px;  --space-2: 16px;  --space-3: 24px;
--space-4: 40px; --space-5: 64px;  --space-6: 96px;   /* mobile: *0.6 */
--section-gap: var(--space-6);
--maxw: 1120px;
--radius: 14px;               /* round like the plate/sphere; used sparingly */
--border: 1px solid #2E2622;  /* hairlines, no shadows-as-depth */
```

Desktop h1 is the only place step-3 appears. Whitespace is the layout device: each section opens with a numbered label (`01 — Features`) in aonori/mono, then a full `--space-5` before the headline, in the Indisea manner.

## 5. Section-by-section mapping of existing content

Preserves all current content and section anchors; CTAs get real destinations.

| Current | New treatment |
| --- | --- |
| Nav pill (Features / Commands / Setup) + "Add to Discord" | Slim top bar, Pan background, mono numbered links; CTA → real Discord OAuth invite URL (bot's application invite — confirm application ID with owner before wiring) |
| Hero ("Invite the Chef" / "View Menu (Source)") | "The Plate" hero (§7). Primary CTA **"Add to Discord"** (same invite URL), secondary **"View Source"** → `https://github.com/khushikantaria310/takoyaki` |
| `#features` (moving-features-section) | `01 — Features`: three-to-four plain rows (webhook routing, Standard/Org channel modes, OAuth linking, contribution stats) as a numbered list, not cards |
| `#commands` (commands-section) | `02 — Commands`: `/setchannel`, `/github link` (+ `unlink`), `/stats` (+ subcommands `me`, `compare`, `top`, `top-day`, `streak`) rendered in IBM Plex Mono as a terminal-style block on Charred crust — real README content |
| `#setup` (setup-section) | `03 — Setup`: actual setup steps (invite bot → `/setchannel` → `/github link`) as a three-step vertical sequence with the numbered-label style |
| Footer links (Source / Docs / Support / Discord / GitHub / Twitter) | Trim to only real destinations: **Source → repo**, **Discord → invite/support server**, **GitHub → repo**. Drop Twitter and Docs unless real URLs exist. Footer "Invite" CTA = same invite URL |

Every `href="#"` placeholder is either given a real destination or removed — no dead links ship.

## 6. Hero composition

**Desktop (>1024px):** Split at 55/45. Left: mono eyebrow `DISCORD × GITHUB — WEBHOOK BRIDGE`, h1 in Zen Kaku Gothic New 700 at step-3, two-line claim ("Your GitHub activity, / served in Discord."), one supporting sentence at step-0, two CTAs. Right: the signature visual (§7) at ~420px, sitting on a faint warm radial glow, slightly rotated (−4°) with the octopus-logo silhouette rendered as its "face" detail. Bottom of viewport: a single hairline with a small mono `scroll ↓` and section index `01–03`.

**Mobile (<768px):** Single column. Eyebrow, h1 at step-2 (one line shorter claim), single full-width primary CTA ("Add to Discord"; source link demotes to a text link under it), then the signature visual at ~260px full-width, cropped at the bottom edge by the first hairline — it should feel like the plate is half-slid into the Features section. No horizontal overflow, no pinning on mobile.

## 7. Signature visual — ONE only

**"The Turning"**: a single takoyaki sphere rendered as pure CSS/SVG — two-tone (Tako gold body, Charred crust shadow crescent), sitting in a minimal cast-iron pan ellipse, with three tiny aonori flecks as asymmetry. The one motion idea: the sphere **slowly rotates in place** (browning turn), its crust crescent shifting around the sphere on a ~9s loop, as if being flipped in the pan. On scroll, the sphere parallaxes slightly and its rotation ties to scroll progress. It appears once, in the hero, and is echoed only as a tiny 12px static mark beside the numbered section labels (a bullet, not a decoration).

No second mascot, no particle fields, no blobs. Existing `octopus-logo.png` is retained only as favicon / OG image; it does not appear on the page itself.

## 8. Animation responsibilities

Current stack is CDN GSAP + ScrollTrigger + Lenis; keep GSAP/Lenis, drop nothing to add Motion/Three.js.

- **CSS**: everything stateful and small — hover lifts on CTAs/links, hairline reveals, the sphere's idle rotation loop, focus-visible styles, footer live-dot pulse. CSS owns anything that must survive JS failure.
- **Lenis**: smooth scrolling and anchor scrolling only (already implemented; keep as-is).
- **GSAP + ScrollTrigger**: entrance orchestration and scroll narrative — rise-in of the h1 (once, on load), `01–03` section labels drawing their hairline on enter, feature rows staggering in, the desktop pin/curtain structure replaced by one scrubbed parallax on the hero sphere. Cap: no more than one ScrollTrigger per section.
- **Motion (Framer Motion / motion.dev)**: **not used.** The page is plain HTML with no component framework; adding it would be overhead without payoff. Explicitly out of this direction.
- **Three.js**: **not used.** The sphere is achievable in SVG/CSS at a fraction of the cost, and a 3D takoyaki would push toward the SaaS-3D cliché. Explicitly out of this direction.

## 9. Static fallback & reduced motion

- All content, CTAs, and section structure are fully readable with JS disabled; GSAP/Lenis load with `defer` and are feature-detected (`typeof gsap !== 'undefined'`). Entrance states are applied **by JS** (e.g., adding a class that sets initial opacity/transform) rather than hidden by default in CSS, so no-JS users never see blank sections.
- `@media (prefers-reduced-motion: reduce)`: Lenis is not initialized; all GSAP animations are skipped (`gsap.matchMedia()` / early return); the sphere's rotation loop is `animation: none`, showing the sphere in a fixed, well-composed rotation angle; hover states reduce to color changes only.
- The sphere still renders without JS (it is static SVG at heart), so no `<noscript>` messaging is needed.
- Performance floor: no animation may run on the main thread continuously (rotation is a transform on one element; parallax is ScrollTrigger-scrubbed transform only).

## 10. Non-goals

- No glassmorphism, mesh gradients, aurora blobs, or neon-glow SaaS styling.
- No fake metrics ("10k servers", "99.9% uptime") — the commands section stays factual (command list, not invented numbers).
- No restaurant menu metaphors in functional copy — the name is playful; the CTAs and features are literal ("Add to Discord", not "Order now").
- No clichés: no sakura petals, torii gates, rising-sun circles, brush-stroke fonts, or gratuitous kanji.
- No Three.js/WebGL, no component framework migration, no restructure of `src/` bot code.
- No competing decorative systems: the sphere is the only illustrated object; everything else is type, hairlines, and space.
- No new fonts beyond the three listed; no asset re-licensing; no dead `#` links ship.
- No dark/light toggle — the Pan palette is the identity.
