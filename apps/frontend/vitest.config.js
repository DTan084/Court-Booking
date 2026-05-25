const path = require('path');
const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@court-booking/shared': path.resolve(__dirname, '../../packages/shared/index.ts'),
    },
  },
});
