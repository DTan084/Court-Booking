import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['.next/**', 'node_modules/**', 'dist/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@court-booking/shared': path.resolve(__dirname, '../../packages/shared/index.ts'),
    },
    preserveSymlinks: true,
  },
});
