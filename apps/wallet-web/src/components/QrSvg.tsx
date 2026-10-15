import qrcode from 'qrcode-generator';

/** Renders a QR matrix as React SVG rects (no innerHTML). */
export function QrSvg({ value, label }: { value: string; label: string }) {
  const qr = qrcode(0, 'M');
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  const cells: string[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) cells.push(`M${c + 4} ${r + 4}h1v1h-1z`);
  return (
    <svg viewBox={`0 0 ${n + 8} ${n + 8}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={n + 8} height={n + 8} fill="#fff" />
      <path d={cells.join('')} fill="#081a36" />
    </svg>
  );
}
