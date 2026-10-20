/**
 * Dev/preview server helpers for testing the wallet from a phone (TEST ONLY, synthetic data).
 *
 * - IQDI_ALLOWED_HOSTS: comma-separated extra Host names Vite may serve, e.g. ".trycloudflare.com" for a
 *   temporary Cloudflare Quick Tunnel. Vite rejects unknown hosts by default (DNS-rebinding protection);
 *   nothing is opened unless this variable is set.
 * - IQDI_DEV_HOST: interface to bind (default 127.0.0.1; "0.0.0.0" to reach it from the LAN).
 * - The demo API refuses POSTs whose Origin is not loopback (cross-site protection). Requests that reach the
 *   API through this proxy from the wallet's *own* page (Origin host == Host header, e.g. the tunnel URL or
 *   http://192.168.x.x:5173) get the API's loopback origin, so approve/reject work; a foreign Origin is
 *   forwarded unchanged and still refused.
 */
export function allowedHostsFromEnv(value: string | undefined): string[] {
  return (value ?? '').split(',').map((h) => h.trim()).filter(Boolean);
}

export function isSameOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
