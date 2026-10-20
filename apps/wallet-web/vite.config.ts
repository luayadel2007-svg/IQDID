import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import { allowedHostsFromEnv, isSameOrigin } from './dev-server.ts';

const target = process.env.DEMO_API_TARGET ?? 'http://127.0.0.1:4010';
const host = process.env.IQDI_DEV_HOST ?? '127.0.0.1';
const allowedHosts = allowedHostsFromEnv(process.env.IQDI_ALLOWED_HOSTS);
const proxy: Record<string, ProxyOptions> = {
  '/demo-api': {
    target,
    changeOrigin: false,
    // Same-origin requests from the wallet page (LAN address or tunnel URL) are presented to the demo API as
    // loopback; foreign origins pass through unchanged and stay refused. See dev-server.ts.
    configure: (p) => p.on('proxyReq', (proxyReq, req) => {
      if (isSameOrigin(req.headers.origin, req.headers.host)) proxyReq.setHeader('origin', new URL(target).origin);
    }),
  },
};

export default defineConfig({
  plugins: [react()],
  server: { host, port: 5173, strictPort: true, proxy, allowedHosts },
  preview: { host, port: 4173, strictPort: true, proxy, allowedHosts },
  build: { sourcemap: true },
});
