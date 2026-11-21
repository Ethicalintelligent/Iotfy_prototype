// Browser tests (pnpm e2e). They start their own dev servers on ports 6173–6175 with
// IOTIFY_TEST=1, which makes the apps use TEST_DATABASE_URL (a Neon test branch) and never
// DATABASE_URL. Tests change data, so they run one at a time and reset what they change.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    // The Edge already installed on Windows: no browser download needed.
    channel: 'msedge',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:6175/ui',
    env: { IOTIFY_TEST: '1' },
    // Never reuse a server: a running `pnpm dev` would point at the main database.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
