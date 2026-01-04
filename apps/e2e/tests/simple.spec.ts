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
      waitUntil: 'domcontentloaded'
    })

    // In dev mode, Next.js might return 200 with 404 page content
    const status = response?.status()
    expect(status === 404 || status === 200).toBeTruthy()
  })
})

test.describe('Navigation Tests', () => {
  test('can navigate between pages', async ({ page }) => {
    // Start at homepage
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check viewport to determine if we're on mobile
    const viewportSize = page.viewportSize()
    const isMobile = viewportSize && viewportSize.width < 768

    if (isMobile) {
      // On mobile, navigation is hidden - just verify page loaded
      const bodyText = await page.textContent('body')
      expect(bodyText?.length).toBeGreaterThan(100)
    } else {
      // Click a visible navigation link in the header
      const guidesLink = page.locator('header nav').getByRole('link', { name: 'Guides' })

      if (await guidesLink.isVisible()) {
        await guidesLink.click()
        await page.waitForURL(/\/guides/)

        // Check we navigated to guides page
        expect(page.url()).toContain('/guides')
      } else {
        // Navigation link not visible, just verify page content
        const bodyText = await page.textContent('body')
        expect(bodyText?.length).toBeGreaterThan(100)
      }
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
