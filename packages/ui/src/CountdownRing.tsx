/** Circular session timer. The number is text (screen readers get "N ثانية متبقية"); the ring is decorative. */
export function CountdownRing({ seconds, total, size = 64 }: { seconds: number; total: number; size?: number }) {
  const r = 26, c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const tone = seconds <= 15 ? 'danger' : seconds <= 45 ? 'warning' : 'info';
  return (
    <span className={`ring ring--${tone}`} style={{ width: size, height: size }} role="timer" aria-label={`${seconds} ثانية متبقية`}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
        <circle className="ring__track" cx="32" cy="32" r={r} />
        <circle className="ring__bar" cx="32" cy="32" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} />
      </svg>
      <span className="ring__value" aria-hidden="true">{seconds}</span>
    </span>
  );
}
