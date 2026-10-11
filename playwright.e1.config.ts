import { defineConfig, devices } from '@playwright/test';

/**
 * Onewill Academy | M4.1-E1 Dedicated Authenticated Read-Only E2E Configuration
 * STRICT ISOLATION CONSTRAINTS:
 * 1. Connects to existing development server on http://localhost:3000.
 * 2. Does NOT launch server with ENABLE_TEST_HARNESS=true.
 * 3. Runs serially (1 worker) in a single headed browser context.
 * 4. Zero artifacts on disk: trace, screenshot, video, and HTML reporter all OFF.
 * 5. Zero disk persistence of session cookies, credentials, or storageState.
 * 6. Generous timeout (300s) to allow manual owner Google Sign-In.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'reports-authenticated-readonly.spec.ts',
  timeout: 300 * 1000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    headless: false,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'headed-chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled'],
          ignoreDefaultArgs: ['--enable-automation'],
        },
      },
    },
  ],
});
