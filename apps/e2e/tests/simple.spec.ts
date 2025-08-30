import { expect, test } from '@playwright/test'

test.describe('Basic Page Load Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set a more generous timeout for navigation
    page.setDefaultNavigationTimeout(45000)
    page.setDefaultTimeout(30000)
  })

  test('homepage loads', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)

    // Basic check - page has some content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText?.length).toBeGreaterThan(100)
  })

  test('about page loads', async ({ page }) => {
    const response = await page.goto('/about', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)

    // Check for about content
    await expect(page.locator('text=/about/i').first()).toBeVisible()
  })

  test('guides page loads', async ({ page }) => {
    const response = await page.goto('/guides', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)

    // Check page loaded with some content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    expect(bodyText?.length).toBeGreaterThan(100)
  })

  test('websites page loads', async ({ page }) => {
    const response = await page.goto('/websites', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)

    // Check page loaded
    const hasContent = await page.locator('main').first().isVisible()
    expect(hasContent).toBeTruthy()
  })

  test('members page loads', async ({ page }) => {
    const response = await page.goto('/members', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)

    // Check page has content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
  })

  test('search functionality exists', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Look for any search input
    const searchInput = page.locator('input[type="text"], input[type="search"]').first()
    const hasSearch = await searchInput.isVisible()

    // Search should exist somewhere on the page
    expect(hasSearch).toBeTruthy()
  })

  test('404 page handles non-existent routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345', {
      waitUntil: 'domcontentloaded',
      waitForSelector: 'body'
    })

    // Should return 404 status
    expect(response?.status()).toBe(404)
  })
})

test.describe('Navigation Tests', () => {
  test('can navigate between pages', async ({ page }) => {
    // Start at homepage
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Try to find and click a navigation link
    const navLink = page
      .locator('a[href*="/about"], a[href*="/guides"], a[href*="/websites"]')
      .first()

    if (await navLink.isVisible()) {
      await navLink.click()
      await page.waitForLoadState('domcontentloaded')

      // Check we navigated away from homepage
      const currentUrl = page.url()
      expect(currentUrl).not.toBe('http://localhost:3000/')
    }
  })
})

test.describe('Responsive Tests', () => {
  test('homepage works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)

    // Page should still have content
    const bodyText = await page.textContent('body')
    expect(bodyText?.length).toBeGreaterThan(100)
  })
})
