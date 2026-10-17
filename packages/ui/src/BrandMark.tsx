import { IQDIBrand } from './IQDIBrand.tsx';

/** Header symbol (kept for compatibility): the IQDI app icon, decorative next to the app name. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return <IQDIBrand variant="symbol" size={size} decorative className="brand-mark" />;
}
