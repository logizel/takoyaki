/** A quick black hand-drawn arrow, pointing left toward the ball. */
export function HandArrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 40" aria-hidden="true">
      <path
        d="M60 6C46 30 26 34 8 22"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M20 14 6 21 18 30"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
