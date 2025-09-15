import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

// Single canonical base for app + tests
const BASE =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,

  reporter: isCI
    ? [
        ['github'],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['html', { open: 'never' }],
      ]
    : [['list'], ['html', { open: 'never' }]],

  // Per-test timeout & expect timeout
  timeout: 60_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Enable if/when you want cross-engine coverage
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari'] } },
  ],

  // Prefer a built server on CI; dev server locally
  webServer: isCI
    ? {
        // CI: server only (run `npm run build` in your CI step before tests)
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          PORT: '3000',
          SENECA_ONBOARDING_V1: 'true',
          // Keep app + tests aligned for auth redirects
          NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
          NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
          // Optional: expose same base to tests if you like
          PLAYWRIGHT_BASE_URL: 'http://localhost:3000',
        },
      }
    : {
        // Local: dev server is fine, pin port for reliability
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          PORT: '3000',
          SENECA_ONBOARDING_V1: 'true',
          NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
          NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
          PLAYWRIGHT_BASE_URL: 'http://localhost:3000',
        },
      },

  // Optional: skip @flaky on CI
  // grepInvert: isCI ? /@flaky/ : undefined,
});