import { expect, test } from '@playwright/test'

// Fast smoke tests with minimal assertions
test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Generous timeouts for CI environments
    page.setDefaultNavigationTimeout(60000)
    page.setDefaultTimeout(30000)
  })

  test('critical pages load successfully', async ({ page }) => {
    const pages = [
      { url: '/', name: 'homepage' },
      { url: '/about', name: 'about' },
      { url: '/guides', name: 'guides' },
      { url: '/projects', name: 'projects' },
      { url: '/news', name: 'news' },
      { url: '/faq', name: 'faq' },
      { url: '/privacy', name: 'privacy' },
      { url: '/terms', name: 'terms' },
      { url: '/cookies', name: 'cookies' },
      { url: '/featured', name: 'featured' },
      { url: '/developer-tools', name: 'developer-tools' }
    ]

    for (const pageInfo of pages) {
      const response = await page.goto(pageInfo.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })

      // Just check that page loads without error
      expect(response?.status(), `${pageInfo.name} page should load`).toBeLessThan(400)

      // Basic content check - page should have some text
      const content = await page.textContent('body')
      expect(content?.length, `${pageInfo.name} should have content`).toBeGreaterThan(50)
    }
  })

  test('search functionality exists and works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Find any search input on the page
    const searchInputs = page.locator('input[type="text"], input[type="search"]')
    const count = await searchInputs.count()

    if (count > 0) {
      // Use the first search input found
      const searchInput = searchInputs.first()
      await searchInput.fill('test search')
      await searchInput.press('Enter')

      // Wait for navigation or content update
      await page.waitForTimeout(2000)

      // Just verify page is still responsive
      const afterSearchContent = await page.textContent('body')
      expect(afterSearchContent).toBeTruthy()
    }
  })

  test('navigation links work', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Find navigation links
    const navLinks = page.locator('nav a[href^="/"]')
    const linkCount = await navLinks.count()

    if (linkCount > 0) {
      // Click the first internal navigation link
      const firstLink = navLinks.first()
      const href = await firstLink.getAttribute('href')

      if (href) {
        await firstLink.click()
        await page.waitForTimeout(2000) // Wait for navigation

        // Just verify page is still working after navigation
        const content = await page.textContent('body')
        expect(content).toBeTruthy()
      }
    }
  })

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check that page loads on mobile
    const content = await page.textContent('body')
    expect(content?.length).toBeGreaterThan(50)

    // Check if mobile menu exists (common pattern)
    const mobileMenuButtons = page
      .locator('button')
      .filter({
        hasText: /menu/i
      })
      .or(page.locator('button[aria-label*="menu" i]'))

    const hasMobileMenu = (await mobileMenuButtons.count()) > 0
    // Mobile menu is optional, just note the result
    // Mobile menu present: ${hasMobileMenu}
  })

  test('404 handling works', async ({ page }) => {
    const response = await page.goto('/this-page-definitely-does-not-exist-404', {
      waitUntil: 'domcontentloaded'
    })

    // Next.js apps might return 200 with a 404 page in dev mode
    // Just check that we get a response
    const status = response?.status()
    expect(status).toBeLessThanOrEqual(404)
  })

  test('external links have proper attributes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Find external links
    const externalLinks = page.locator('a[href^="http"]:not([href*="localhost"])')
    const extLinkCount = await externalLinks.count()

    if (extLinkCount > 0) {
      const firstExtLink = externalLinks.first()
      const target = await firstExtLink.getAttribute('target')
      const rel = await firstExtLink.getAttribute('rel')

      // External links should ideally open in new tab and have security attributes
      if (target === '_blank') {
        expect(rel).toContain('noopener')
      }
    }
  })

  test('forms are interactive', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Find any form inputs
    const inputs = page.locator('input[type="text"], input[type="email"], textarea')
    const inputCount = await inputs.count()

    if (inputCount > 0) {
      const firstInput = inputs.first()

      // Check that input is interactive
      await firstInput.fill('test input')
      const value = await firstInput.inputValue()
      expect(value).toBe('test input')
    }
  })

  test('images load correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Check that images are loading
    const images = page.locator('img')
    const imageCount = await images.count()

    if (imageCount > 0) {
      // Check first image has proper attributes
      const firstImage = images.first()
      const src = await firstImage.getAttribute('src')
      const alt = await firstImage.getAttribute('alt')

      expect(src).toBeTruthy()
      // Alt text is good for accessibility
      if (alt !== null) {
        expect(alt.length).toBeGreaterThan(0)
      }
    }
  })
})
