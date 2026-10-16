/** IQDI mark: an abstract eight-point star (geometric motif) on the brand gradient. Decorative; the name is text. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="iqdi-mark-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a2350" />
          <stop offset=".6" stopColor="#1a46b8" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#iqdi-mark-g)" />
      <g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="12" y="12" width="16" height="16" rx="2" />
        <rect x="12" y="12" width="16" height="16" rx="2" transform="rotate(45 20 20)" />
      </g>
      <circle cx="20" cy="20" r="3" fill="#7dd3fc" />
    </svg>
  );
}
