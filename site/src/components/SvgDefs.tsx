/** Shared SVG gradients, drawn once and referenced by every takoyaki. */
export function SvgDefs() {
  return (
    <svg className="svg-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="takoBall" cx="36%" cy="26%" r="82%">
          <stop offset="0%" stopColor="#dca984" />
          <stop offset="55%" stopColor="#c99069" />
          <stop offset="100%" stopColor="#a96f4b" />
        </radialGradient>
        <linearGradient id="takoSauce" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b3324" />
          <stop offset="55%" stopColor="#452417" />
          <stop offset="100%" stopColor="#2f1509" />
        </linearGradient>
        <linearGradient id="takoWood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a97b45" />
          <stop offset="38%" stopColor="#ecd6a6" />
          <stop offset="62%" stopColor="#dcc08d" />
          <stop offset="100%" stopColor="#a97b45" />
        </linearGradient>
      </defs>
    </svg>
  );
}
