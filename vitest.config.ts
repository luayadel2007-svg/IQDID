import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    projects: [
      {
        test: { name: 'node', environment: 'node', include: ['packages/{shared-types,api-client,mock-services}/**/*.test.ts'] },
      },
      {
        plugins: [react()],
        test: {
          name: 'dom',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./test/setup-dom.ts'],
          include: ['packages/ui/**/*.test.tsx', 'apps/**/*.test.tsx', 'test/**/*.test.tsx'],
          testTimeout: 20_000,
        },
      },
    ],
  },
});
