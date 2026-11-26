import { SteelDish, SteelDishDefs } from "@/components/Plate";
import { TakoyakiShape } from "@/components/TakoyakiShape";

const dishUid = "heroDish";

/**
 * The hero illustration: a cluster of saucy takoyaki resting on a polished
 * stainless-steel plate, drawn flat with bold ink outlines.
 */
export function TakoyakiPlate({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 460 330"
      role="img"
      aria-label="A steel plate of takoyaki with sauce, mayo, green onion, and bonito flakes"
    >
      <SteelDishDefs uid={dishUid} />
      <SteelDish uid={dishUid} cx={230} cy={252} rx={216} ry={54} />

      {/* Contact shadows so each ball sits on the steel. */}
      <g fill={`url(#${dishUid}-shadow)`} opacity="0.6">
        <ellipse cx="152" cy="212" rx="46" ry="12" />
        <ellipse cx="302" cy="212" rx="46" ry="12" />
        <ellipse cx="190" cy="268" rx="50" ry="13" />
        <ellipse cx="282" cy="270" rx="50" ry="13" />
        <ellipse cx="234" cy="240" rx="52" ry="13" />
      </g>

      {/* Back row. */}
      <g transform="translate(152 170) rotate(6) scale(1.42)">
        <TakoyakiShape />
      </g>
      <g transform="translate(302 170) rotate(-8) scale(1.42)">
        <TakoyakiShape />
      </g>

      {/* Front row. */}
      <g transform="translate(190 224) rotate(-4) scale(1.5)">
        <TakoyakiShape />
      </g>
      <g transform="translate(282 226) rotate(9) scale(1.5)">
        <TakoyakiShape />
      </g>

      {/* The one on top. */}
      <g transform="translate(234 192) rotate(2) scale(1.62)">
        <TakoyakiShape />
      </g>
    </svg>
  );
}
