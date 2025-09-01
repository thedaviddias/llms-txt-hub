import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2, // Use 2 workers locally for stability
  reporter: process.env.CI ? 'github' : 'html',

  // Performance optimizations
  timeout: 60000, // 60 seconds per test (more generous for loaded apps)
  expect: {
    timeout: 15000 // 15 seconds for assertions
  },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Performance optimizations
    actionTimeout: 15000,
    navigationTimeout: 30000, // More time for navigation

    // Reduce visual noise during local development
    launchOptions: {
      slowMo: process.env.CI ? 0 : 0 // No slow motion
    }
  },
  projects: [
    // Primary desktop testing
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Optimize for speed
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      }
    },

    // Mobile testing (reduced for speed)
    {
      name: 'mobile',
      testMatch: ['**/pages.spec.ts', '**/interactions.spec.ts'],
      use: {
        ...devices['Pixel 5']
      }
    }

    // Additional browsers commented out for speed
    // Uncomment for comprehensive cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] }
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] }
    // }
  ],
  webServer: {
    command: 'cd ../web && pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60000, // 1 minute to start server
    env: {
      // Minimize external dependencies for testing
      NEXT_PUBLIC_SENTRY_DSN:
        process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://dummy@dummy.ingest.sentry.io/123',
      SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN || 'dummy_token',
      SENTRY_ORG: process.env.SENTRY_ORG || 'dummy_org',
      SENTRY_PROJECT: process.env.SENTRY_PROJECT || 'dummy_project',
      LOG_LEVEL: process.env.LOG_LEVEL || 'error',
      // Clerk test keys (if needed for auth testing)
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
      // Faster builds
      NEXT_TELEMETRY_DISABLED: '1'
    }
  }
})
