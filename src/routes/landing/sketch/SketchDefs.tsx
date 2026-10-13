/**
 * Bộ lọc nét chì, pattern và hình dùng chung cho mọi hình vẽ của landing.
 * Render đúng 1 lần ở gốc landing; hình khác tham chiếu qua id `sk-*`.
 * Hình vẽ thường dùng 2 lớp: nét chính `sk-rough-a` + nét phụ mờ `sk-rough-b` lệch 1px
 * cho cảm giác chì đi 2 lượt.
 */
export function SketchDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <filter id="sk-rough-a" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="sk-rough-b" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="G" yChannelSelector="R" />
        </filter>
        <filter id="sk-rough-text">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.2" />
        </filter>
        <pattern id="sk-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#2a2a2e" strokeWidth="0.9" opacity="0.45" />
        </pattern>
        <pattern id="sk-hatch-blue" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#2f5d8a" strokeWidth="1" opacity="0.55" />
        </pattern>
        <pattern id="sk-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#2a2a2e" opacity="0.22" />
        </pattern>
        <g
          id="sk-person"
          fill="none"
          stroke="#2a2a2e"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="0" cy="0" r="9" fill="#fffdf7" />
          <path d="M0 9 L0 40 M-14 28 L0 17 L14 28 M-11 62 L0 40 L11 62" />
        </g>
        {/* Note mini 120x80 */}
        <g id="sk-mini-note" fill="none" stroke="#2a2a2e" strokeWidth="1.6" strokeLinecap="round">
          <rect x="0" y="0" width="120" height="80" rx="5" fill="#fffdf7" />
          <rect x="0" y="0" width="120" height="4" fill="#2f5d8a" stroke="none" opacity="0.6" />
          <path d="M12 22 H80" strokeWidth="2.2" />
          <path d="M12 40 q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" strokeWidth="1.2" />
          <path d="M12 56 q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 t12 0" strokeWidth="1.2" />
        </g>
      </defs>
    </svg>
  );
}
