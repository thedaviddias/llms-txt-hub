import { expect, test } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/')

    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded')

    // Verify that we're on the homepage by checking the URL
    expect(page.url()).toBe('http://localhost:3000/')

    // Check if the page is accessible
    expect(await page.title()).toBeTruthy()
  })
})
