import { defineConfig, devices } from '@playwright/test'

const fallbackClerkPublishableKey = 'pk_test_Y2xlcmsuZXhhbXBsZS5jb20k'
const fallbackClerkSecretKey = 'sk_test_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || fallbackClerkPublishableKey
const clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim() || fallbackClerkSecretKey

/**
 * Optimized Playwright configuration for CI environments
 * Uses production build for faster execution
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: true,
  retries: 1, // Single retry for flaky tests
  workers: 3, // Optimal for GitHub Actions (2 core machines)
  reporter: [
    ['github'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results.json' }]
  ],

  // Tighter timeouts for CI
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Faster timeouts for CI
    actionTimeout: 10000,
    navigationTimeout: 20000,

    // Disable animations for faster tests
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--disable-features=IsolateOrigins,site-per-process,TranslateUI',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-ipc-flooding-protection'
      ]
    }
  },

  projects: [
    // Only run chromium on CI for speed
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Force headless for CI
        headless: true,
        // Disable service workers for speed
        serviceWorkers: 'block',
        // Reduce viewport for faster rendering
        viewport: { width: 1280, height: 720 }
      }
    }
    // Skip mobile tests on CI for speed
  ],

  // Use production build for much faster performance
  webServer: {
    command: 'cd ../web && pnpm build && pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: false, // Always fresh for CI
    timeout: 180000, // 3 minutes for build + start
    env: {
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      // Disable external services for speed
      NEXT_PUBLIC_SENTRY_DSN: '',
      SENTRY_AUTH_TOKEN: '',
      LOG_LEVEL: 'error',
      // Prefer real CI secrets when available; fall back for fork/untrusted PR runs.
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPublishableKey,
      CLERK_SECRET_KEY: clerkSecretKey
    }
  }
})
