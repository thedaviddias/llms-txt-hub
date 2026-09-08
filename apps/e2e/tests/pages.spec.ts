import { expect, test } from '@playwright/test'

test.describe('Main Pages', () => {
  test('homepage should load and display key elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check page title
    await expect(page).toHaveTitle(/llms\.txt/i)

    // Check main navigation exists
    await expect(page.getByRole('navigation').first()).toBeVisible()

    // Verify hero section with heading is visible
    const heroHeading = page.getByRole('heading', { level: 1, name: /^llms\.txt hub$/i })
    await expect(heroHeading).toBeVisible()

    // Verify hero section description is visible
    await expect(page.getByText(/largest directory for.*AI-ready documentation/i)).toBeVisible()

    // Verify primary CTA button is present
    await expect(page.getByRole('link', { name: /add your llms\.txt/i })).toBeVisible()

    // Verify secondary CTA button is present
    await expect(page.getByRole('link', { name: /learn more/i })).toBeVisible()
  })

  test('about page should load and display content', async ({ page }) => {
    await page.goto('/about')

    await expect(page).toHaveTitle(/About.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify about page has meaningful content sections
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('guides page should load and display guides', async ({ page }) => {
    await page.goto('/guides')

    await expect(page).toHaveTitle(/Guides.*llms\.txt/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify the rendered guide collection through its stable, accessible links.
    const guideLinks = page.locator('main a[href^="/guides/"]')
    await expect(guideLinks.first()).toBeVisible({ timeout: 5000 })
    expect(await guideLinks.count()).toBeGreaterThan(0)
  })

  test('websites page should load and display website list', async ({ page }) => {
    await page.goto('/websites')

    await expect(page).toHaveTitle(/Websites.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check for search/filter functionality (use first textbox to avoid ambiguity)
    await expect(page.getByRole('textbox').first()).toBeVisible()
  })

  test('members page should load and display member list', async ({ page }) => {
    await page.goto('/members')

    await expect(page).toHaveTitle(/Members.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // On mobile, header search is hidden - check for members-specific search instead
    const viewportSize = page.viewportSize()
    const isMobile = viewportSize && viewportSize.width < 768

    if (!isMobile) {
      // Should have search functionality on desktop
      await expect(page.getByPlaceholder(/search/i).first()).toBeVisible()
    }
  })

  test('projects page should load and display projects', async ({ page }) => {
    await page.goto('/projects')

    await expect(page).toHaveTitle(/Projects.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('faq page should load and display FAQ content', async ({ page }) => {
    await page.goto('/faq')

    await expect(page).toHaveTitle(/FAQ.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify FAQ content area is visible
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('news route follows its configured homepage redirect', async ({ page }) => {
    await page.goto('/news')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: /^llms\.txt hub$/i })).toBeVisible()
  })
})

test.describe('Category Pages', () => {
  test('developer-tools category should load', async ({ page }) => {
    await page.goto('/developer-tools')

    await expect(page).toHaveTitle(/Developer Tools.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('featured category should load', async ({ page }) => {
    await page.goto('/featured')

    await expect(page).toHaveTitle(/Featured.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('Search and Navigation', () => {
  test('search page should work with query parameter', async ({ page }) => {
    await page.goto('/search?q=api')

    await expect(page).toHaveTitle(/Search.*llms\.txt/i)

    // Verify the search query is displayed in the heading
    await expect(
      page.getByRole('heading', { level: 1, name: /Search Results for "api"/i })
    ).toBeVisible()

    // The compact mobile header exposes search from its overlay instead.
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      await expect(page.getByRole('textbox').first()).toBeVisible()
    }

    // Wait for search results to load (client-side search)
    await page.waitForTimeout(1000)

    // Verify results through stable destination links instead of CSS class names.
    const websiteLinks = page.locator('main a[href^="/websites/"]')
    await expect(websiteLinks.first()).toBeVisible()
    expect(await websiteLinks.count()).toBeGreaterThan(0)

    // Verify results contain favicons (FaviconWithFallback component)
    const favicons = page.locator('img[alt=""], img[src*="google.com/s2/favicons"]').first()
    await expect(favicons).toBeVisible()

    // Verify at least one result card has a description
    const descriptions = page.locator('p.text-muted-foreground, p[class*="text-muted"]').first()
    await expect(descriptions).toBeVisible()
  })

  test('navigation should work between pages', async ({ page }) => {
    await page.goto('/')

    // Test navigation to guides - use direct URL navigation for reliability
    await page.goto('/guides')
    await expect(page).toHaveURL(/\/guides/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Test navigation to about
    await page.goto('/about')
    await expect(page).toHaveURL(/\/about/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('navigation links should work correctly', async ({ page }) => {
    // Start at homepage
    await page.goto('/')

    // Find and click the guides link
    const guidesLink = page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Guides', exact: true })
    await guidesLink.click()

    // Verify navigation to guides page
    await expect(page).toHaveURL(/\/guides/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Find and click the about link
    const aboutLink = page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'About', exact: true })
    await aboutLink.click()

    // Verify navigation to about page
    await expect(page).toHaveURL(/\/about/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('Legal Pages', () => {
  test('privacy policy should load', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page).toHaveTitle(/Privacy.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify privacy policy content is visible
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('terms of service should load', async ({ page }) => {
    await page.goto('/terms')

    await expect(page).toHaveTitle(/Terms.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify terms of service content is visible
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('cookies policy should load', async ({ page }) => {
    await page.goto('/cookies')

    await expect(page).toHaveTitle(/Cookie.*llms\.txt/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify cookies policy content is visible
    await expect(page.getByRole('main')).toBeVisible()
  })
})

test.describe('Error Pages', () => {
  test('unknown protected routes stay closed in public E2E mode', async ({ page }) => {
    const response = await page.goto('/non-existent-page')

    expect(response?.status()).toBe(401)
    await expect(page.getByText('{"error":"Unauthorized"}')).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('homepage should work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Should still load and display content
    await expect(page).toHaveTitle(/llms\.txt/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('Performance and Accessibility', () => {
  test('homepage should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime

    // Dev-mode cold compilation must remain within the configured navigation budget.
    expect(loadTime).toBeLessThan(30000)
  })

  test('pages should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/')

    // Check for basic accessibility elements
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('navigation').first()).toBeVisible()

    // Check for proper heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
  })
})
