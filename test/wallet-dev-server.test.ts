// Wallet dev/preview server helpers for phone testing over a LAN address or a temporary HTTPS tunnel.
import { describe, expect, it } from 'vitest';
import { allowedHostsFromEnv, isSameOrigin } from '../apps/wallet-web/dev-server.ts';

describe('wallet dev server helpers', () => {
  it('opens no extra hosts unless IQDI_ALLOWED_HOSTS is set', () => {
    expect(allowedHostsFromEnv(undefined)).toEqual([]);
    expect(allowedHostsFromEnv('')).toEqual([]);
    expect(allowedHostsFromEnv(' .trycloudflare.com , phone.local ')).toEqual(['.trycloudflare.com', 'phone.local']);
  });

  it('treats only the page\'s own origin as same-origin (tunnel URL, LAN address); foreign origins stay foreign', () => {
    expect(isSameOrigin('https://demo-abc.trycloudflare.com', 'demo-abc.trycloudflare.com')).toBe(true);
    expect(isSameOrigin('http://192.168.0.186:5173', '192.168.0.186:5173')).toBe(true);
    expect(isSameOrigin('https://evil.example', 'demo-abc.trycloudflare.com')).toBe(false);
    expect(isSameOrigin('http://192.168.0.186:5174', '192.168.0.186:5173')).toBe(false);
    expect(isSameOrigin(undefined, 'x')).toBe(false);
    expect(isSameOrigin('not a url', 'x')).toBe(false);
  });
});
