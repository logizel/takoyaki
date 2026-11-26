import type { CSSProperties } from "react";
import { TakoyakiShape } from "@/components/TakoyakiShape";

/**
 * A takoyaki drawn like the reference: golden fried base, a dark sauce cap
 * with drips running down, thick cream mayo ribbons, green onion and bonito.
 */
export function Ball({
  size = 84,
  tilt = 0,
  shadow = true,
  style,
}: {
  size?: number;
  tilt?: number;
  shadow?: boolean;
  style?: CSSProperties;
}) {
  return (
    <svg
      className="ball-art"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ transform: `rotate(${tilt}deg)`, ...style }}
      aria-hidden="true"
    >
      {shadow && <ellipse cx="50" cy="88" rx="34" ry="7" fill="rgba(24,30,12,0.22)" />}
      <g transform="translate(50 50)">
        <TakoyakiShape />
      </g>
    </svg>
  );
}
