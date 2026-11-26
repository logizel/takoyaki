import { useId } from "react";

/**
 * The plate the takoyaki are served on: a shallow stainless-steel dish,
 * the kind takoyaki arrives on in Japan. Drawn with layered metal
 * gradients, a sunken well, a rolled rim, brushed rings and two
 * specular highlights so it reads as a real, polished object.
 *
 * `SteelDishDefs` + `SteelDish` can be dropped into any SVG scene;
 * `Plate` wraps them in a standalone SVG.
 */

export const PLATE_VIEWBOX = "0 0 1000 480";

type DishProps = {
  uid: string;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  detail?: boolean;
  shadow?: boolean;
};

/** Gradients and filters for the dish — must live in the same <svg>. */
export function SteelDishDefs({ uid }: { uid: string }) {
  return (
    <defs>
      {/* Polished top face: mirrored bands of light and shadow. */}
      <linearGradient id={`${uid}-rim`} x1="0.12" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="#f8fbfd" />
        <stop offset="14%" stopColor="#dbe3ea" />
        <stop offset="30%" stopColor="#a9b4c0" />
        <stop offset="47%" stopColor="#d3dbe3" />
        <stop offset="63%" stopColor="#8d97a4" />
        <stop offset="82%" stopColor="#c6cfd8" />
        <stop offset="100%" stopColor="#717c88" />
      </linearGradient>

      {/* Thick outer wall of the dish. */}
      <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#48525c" />
        <stop offset="55%" stopColor="#2c343c" />
        <stop offset="100%" stopColor="#1b2127" />
      </linearGradient>

      {/* The sunken well — light from the upper left. */}
      <radialGradient id={`${uid}-well`} cx="36%" cy="24%" r="82%">
        <stop offset="0%" stopColor="#f4f8fb" />
        <stop offset="30%" stopColor="#d0d8e0" />
        <stop offset="58%" stopColor="#a3aeba" />
        <stop offset="82%" stopColor="#7b8692" />
        <stop offset="100%" stopColor="#59636e" />
      </radialGradient>

      {/* Rolled bevel just inside the outer edge. */}
      <linearGradient id={`${uid}-bevel`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="42%" stopColor="#8f9aa6" stopOpacity="0.35" />
        <stop offset="72%" stopColor="#ffffff" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.7" />
      </linearGradient>

      {/* Inner lip of the well: dark on the far side, lit on the near side. */}
      <linearGradient id={`${uid}-innerLip`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2d353d" />
        <stop offset="38%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.14" />
      </linearGradient>

      <radialGradient id={`${uid}-spec`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="55%" stopColor="#ffffff" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>

      <radialGradient id={`${uid}-shadow`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.5" />
        <stop offset="65%" stopColor="#000000" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>

      {/* Warm bounce light picked up from the red room. */}
      <linearGradient id={`${uid}-bounce`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ff9d6b" stopOpacity="0" />
        <stop offset="50%" stopColor="#ff7a52" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#ff9d6b" stopOpacity="0" />
      </linearGradient>

      <filter id={`${uid}-blur`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="7" />
      </filter>

      <filter id={`${uid}-softBlur`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.4" />
      </filter>
    </defs>
  );
}

export function SteelDish({
  uid,
  cx = 500,
  cy = 268,
  rx = 452,
  ry = 124,
  detail = true,
  shadow = true,
}: DishProps) {
  const wellRx = rx * 0.855;
  const wellRy = ry * 0.72;
  const wellCy = cy + ry * 0.05;

  return (
    <g>
      {/* Contact shadow on the counter. */}
      {shadow && (
        <ellipse
          cx={cx}
          cy={cy + ry * 0.72}
          rx={rx * 1.01}
          ry={ry * 0.3}
          fill={`url(#${uid}-shadow)`}
        />
      )}

      {/* Thick outer wall, peeking below the polished rim. */}
      <ellipse cx={cx} cy={cy + ry * 0.07} rx={rx} ry={ry} fill={`url(#${uid}-edge)`} />

      {/* Mirror-polished top face. */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={`url(#${uid}-rim)`}
        stroke="#4a545f"
        strokeWidth={3}
      />

      {/* Rolled bevel inside the outer edge. */}
      <ellipse
        cx={cx}
        cy={cy - ry * 0.015}
        rx={rx - rx * 0.035}
        ry={ry - ry * 0.08}
        fill="none"
        stroke={`url(#${uid}-bevel)`}
        strokeWidth={ry * 0.055}
        opacity="0.95"
      />

      {/* The sunken well. */}
      <ellipse
        cx={cx}
        cy={wellCy}
        rx={wellRx}
        ry={wellRy}
        fill={`url(#${uid}-well)`}
        stroke="#39424b"
        strokeWidth={4.5}
      />

      {/* Soft inner shadow along the far side of the well. */}
      <ellipse
        cx={cx}
        cy={wellCy - ry * 0.03}
        rx={wellRx - 6}
        ry={wellRy - 5}
        fill="none"
        stroke={`url(#${uid}-innerLip)`}
        strokeWidth={2.5}
        opacity="0.8"
      />

      {detail && (
        <>
          {/* Brushed-metal concentric grain. */}
          <g fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1.4">
            {[0.28, 0.46, 0.64, 0.82].map((scale) => (
              <ellipse
                key={`light-${scale}`}
                cx={cx}
                cy={wellCy}
                rx={wellRx * scale}
                ry={wellRy * scale}
              />
            ))}
          </g>
          <g fill="none" stroke="rgba(30,36,42,0.14)" strokeWidth="1.2">
            {[0.37, 0.55, 0.73, 0.9].map((scale) => (
              <ellipse
                key={`dark-${scale}`}
                cx={cx}
                cy={wellCy}
                rx={wellRx * scale}
                ry={wellRy * scale}
              />
            ))}
          </g>
        </>
      )}

      {/* Big blurred specular smear on the upper-left rim. */}
      <ellipse
        cx={cx - rx * 0.3}
        cy={cy - ry * 0.32}
        rx={rx * 0.36}
        ry={ry * 0.2}
        fill={`url(#${uid}-spec)`}
        transform={`rotate(-9 ${cx - rx * 0.3} ${cy - ry * 0.32})`}
        filter={`url(#${uid}-blur)`}
      />

      {/* Crisp highlight along the top edge of the well. */}
      <path
        d={`M ${cx - wellRx * 0.82} ${wellCy - wellRy * 0.3} Q ${cx - wellRx * 0.2} ${
          wellCy - wellRy * 1.02
        } ${cx + wellRx * 0.62} ${wellCy - wellRy * 0.62}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={ry * 0.045}
        strokeLinecap="round"
        opacity="0.5"
        filter={`url(#${uid}-softBlur)`}
      />

      {/* Warm red bounce on the near rim, so it sits in the room. */}
      <path
        d={`M ${cx - rx * 0.66} ${cy + ry * 0.5} Q ${cx} ${cy + ry * 0.92} ${
          cx + rx * 0.66
        } ${cy + ry * 0.5}`}
        fill="none"
        stroke={`url(#${uid}-bounce)`}
        strokeWidth={ry * 0.08}
        strokeLinecap="round"
        opacity="0.7"
        filter={`url(#${uid}-blur)`}
      />

      {/* Tiny glint on the rim. */}
      <ellipse
        cx={cx - rx * 0.52}
        cy={cy - ry * 0.18}
        rx={rx * 0.05}
        ry={ry * 0.03}
        fill="#ffffff"
        opacity="0.9"
        filter={`url(#${uid}-softBlur)`}
      />
    </g>
  );
}

export function Plate({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg className={className} viewBox={PLATE_VIEWBOX} aria-hidden="true">
      <SteelDishDefs uid={uid} />
      <SteelDish uid={uid} />
    </svg>
  );
}
