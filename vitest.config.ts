import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/**/*.test.{ts,tsx}',
      'products/**/*.test.{ts,tsx}',
      'apps/**/*.test.{ts,tsx}',
      'tools/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**'],
  },
});
