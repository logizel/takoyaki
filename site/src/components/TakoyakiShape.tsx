/**
 * One takoyaki, drawn in a 100×100 box centred on the origin.
 * Shared by the hero scene, the plate art and the inline balls.
 *
 * Matches the hand-drawn reference: a light mocha fried ball under a
 * dark sauce cap, a thin cursive mayo drizzle and green onion bits.
 */

/** Thin cursive mayo drizzle, like the reference sketch. */
const mayoDrizzle = [
  "M23 31C27 26 32 25 34 28C36 31 32 33 30 31C28 29 31 27 34 27",
  "M39 21C44 18 49 20 50 23",
  "M53 20C58 22 60 26 58 29",
  "M28 40C32 37 36 39 37 42",
  "M43 33C47 31 51 33 52 36",
];

export function TakoyakiShape() {
  return (
    <g transform="translate(-50 -50)">
      {/* Fried base, a light mocha with a thinner warm outline. */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="url(#takoBall)"
        stroke="#5b3a27"
        strokeWidth="2.2"
      />
      <ellipse cx="50" cy="78" rx="33" ry="9" fill="#7a4a2f" opacity="0.16" />

      {/* Dark sauce cap with a wavy edge and one big drip on the right. */}
      <path
        d="M10 44C10 23 27 11 50 11C73 11 90 23 90 44C90 49 88 53 85 50C82 47 79 49 79 55C79 63 71 66 68 58C66 52 61 52 59 57C57 62 51 62 49 56C47 50 42 50 40 56C38 62 31 61 30 53C29 46 23 45 21 51C19 57 13 56 10 48Z"
        fill="url(#takoSauce)"
      />

      {/* Thin mayo squiggles, with a soft shadow underneath. */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g stroke="#c9ad84" strokeWidth="3.4" opacity="0.28" transform="translate(0.4 0.8)">
          {mayoDrizzle.map((d) => (
            <path key={`ms-${d}`} d={d} />
          ))}
        </g>
        <g stroke="#f8ecd4" strokeWidth="2.3">
          {mayoDrizzle.map((d) => (
            <path key={`m-${d}`} d={d} />
          ))}
        </g>
      </g>

      {/* Green onion bits. */}
      <g fill="#4f7a2b">
        <rect x="29" y="23" width="5" height="3" rx="1.2" transform="rotate(-18 29 23)" />
        <rect x="42" y="17" width="5" height="3" rx="1.2" transform="rotate(12 42 17)" />
        <rect x="54" y="21" width="5" height="3" rx="1.2" transform="rotate(-8 54 21)" />
        <rect x="63" y="26" width="5" height="3" rx="1.2" transform="rotate(20 63 26)" />
        <rect x="36" y="32" width="5" height="3" rx="1.2" transform="rotate(10 36 32)" />
        <rect x="47" y="29" width="5" height="3" rx="1.2" transform="rotate(-25 47 29)" />
        <rect x="69" y="35" width="4.6" height="2.8" rx="1.1" transform="rotate(6 69 35)" />
        <rect x="26" y="38" width="4.6" height="2.8" rx="1.1" transform="rotate(30 26 38)" />
      </g>
    </g>
  );
}
