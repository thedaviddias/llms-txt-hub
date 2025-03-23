import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] }
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] }
    // },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    }
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] }
    // }
  ],
  webServer: {
    command: 'cd ../web && pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://dummy.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dummy_anon_key',
      NEXT_PUBLIC_SENTRY_DSN: 'https://dummy@dummy.ingest.sentry.io/123',
      SENTRY_AUTH_TOKEN: 'dummy_token',
      SENTRY_ORG: 'dummy_org',
      SENTRY_PROJECT: 'dummy_project',
      LOG_LEVEL: 'error'
    }
  }
})
