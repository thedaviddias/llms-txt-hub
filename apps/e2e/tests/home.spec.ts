import { expect, test } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Verify that we're on the homepage
    await expect(page).toHaveURL(/\/$/)

    // Check if the page is accessible
    expect(await page.title()).toBeTruthy()
  })
})
