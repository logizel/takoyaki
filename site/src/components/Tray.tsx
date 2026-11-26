/** The folded kraft-paper tray, drawn flat with ink outlines. */
export function Tray({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 220" aria-hidden="true">
      <path
        d="M24 62 L396 62 L344 178 Q210 214 76 178 Z"
        fill="var(--tray)"
        stroke="var(--line-ink)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M24 62 L76 178" fill="none" stroke="var(--line-ink)" strokeWidth="3" />
      <path d="M396 62 L344 178" fill="none" stroke="var(--line-ink)" strokeWidth="3" />
      <path
        d="M64 68 L112 172 M356 68 L308 172"
        fill="none"
        stroke="var(--line-ink)"
        strokeWidth="2.5"
        opacity="0.45"
      />
    </svg>
  );
}
