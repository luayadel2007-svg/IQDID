import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = process.env.DEMO_API_TARGET ?? 'http://127.0.0.1:4010';
const proxy = { '/demo-api': { target, changeOrigin: false } };

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5174, strictPort: true, proxy },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true, proxy },
  build: { sourcemap: true },
});
