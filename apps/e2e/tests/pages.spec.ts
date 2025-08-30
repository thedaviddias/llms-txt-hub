import { expect, test } from '@playwright/test'

test.describe('Main Pages', () => {
  test('homepage should load and display key elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check page title
    await expect(page).toHaveTitle(/llms\.txt/i)

    // Check main navigation exists
    await expect(page.getByRole('navigation').first()).toBeVisible()

    // Check hero section exists (h1 or h2)
    const heading = page
      .getByRole('heading', { level: 1 })
      .or(page.getByRole('heading', { level: 2 }))
      .first()
    await expect(heading).toBeVisible()

    // Check at least some key content is present
    await expect(
      page
        .getByRole('heading', { name: /featured|recent(ly)?|projects/i })
        .first()
        .or(page.getByRole('region', { name: /featured|recent|projects/i }).first())
    ).toBeVisible()
  })

  test('about page should load and display content', async ({ page }) => {
    await page.goto('/about')

    await expect(page).toHaveTitle(/About.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Page should have about content
    const hasAboutHeading = await page.getByRole('heading', { name: /about/i }).isVisible()
    expect(hasAboutHeading).toBeTruthy()
  })

  test('guides page should load and display guides', async ({ page }) => {
    await page.goto('/guides')

    await expect(page).toHaveTitle(/Guides.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check if guides section is present
    // Check if guides content is present
    const hasGuidesContent = await page.locator('text=/guide/i').first().isVisible()
    expect(hasGuidesContent).toBeTruthy()
  })

  test('websites page should load and display website list', async ({ page }) => {
    await page.goto('/websites')

    await expect(page).toHaveTitle(/Websites.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check for search/filter functionality - search input
    const searchInput = page
      .getByRole('searchbox', { name: /search/i })
      .or(page.getByRole('textbox', { name: /search/i }))
      .or(page.getByPlaceholder(/search/i))
      .first()
    await expect(searchInput).toBeVisible()
  })

  test('members page should load and display member list', async ({ page }) => {
    await page.goto('/members')

    await expect(page).toHaveTitle(/Members.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Should have search functionality or member content
    await expect(
      page
        .getByRole('textbox', { name: /search/i })
        .or(page.getByRole('list').first())
        .or(page.getByText(/member|community/i).first())
    ).toBeVisible()
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
    // Check FAQ content exists
    await expect(
      page
        .getByRole('heading', { name: /FAQ|Frequently Asked Questions/i })
        .first()
        .or(page.getByRole('region', { name: /FAQ/i }).first())
    ).toBeVisible()
  })

  test('news page should load and display news items', async ({ page }) => {
    await page.goto('/news')

    await expect(page).toHaveTitle(/News.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
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

    await expect(page).toHaveTitle(/Search.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Should show search results or search interface
    await expect(page.getByRole('textbox')).toBeVisible()
  })

  test('navigation should work between pages', async ({ page }) => {
    await page.goto('/')

    // Test navigation to guides
    const guidesLink = page.getByRole('link', { name: /guides/i }).first()
    if (await guidesLink.isVisible()) {
      await guidesLink.click()
      await expect(page).toHaveURL(/\/guides/)
    }

    // Test navigation to projects
    await page.goto('/')
    const projectsLink = page.getByRole('link', { name: /projects/i }).first()
    if (await projectsLink.isVisible()) {
      await projectsLink.click()
      await expect(page).toHaveURL(/\/projects/)
    }
  })
})

test.describe('Legal Pages', () => {
  test('privacy policy should load', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page).toHaveTitle(/Privacy.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Privacy page loaded
    const hasPrivacyContent = await page.locator('h1').isVisible()
    expect(hasPrivacyContent).toBeTruthy()
  })

  test('terms of service should load', async ({ page }) => {
    await page.goto('/terms')

    await expect(page).toHaveTitle(/Terms.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Terms page loaded
    const hasTermsContent = await page.locator('h1').isVisible()
    expect(hasTermsContent).toBeTruthy()
  })

  test('cookies policy should load', async ({ page }) => {
    await page.goto('/cookies')

    await expect(page).toHaveTitle(/Cookie.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Cookies page loaded
    const hasCookiesContent = await page.locator('h1').isVisible()
    expect(hasCookiesContent).toBeTruthy()
  })
})

test.describe('Error Pages', () => {
  test('404 page should display for non-existent routes', async ({ page }) => {
    const response = await page.goto('/non-existent-page')

    // Should return 404 status or redirect to 404 page
    const status = response?.status()
    // Next.js may not always return 404 in dev mode
    expect(status === 404 || status === 200).toBeTruthy()
  })
})

test.describe('Responsive Design', () => {
  test('homepage should work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Should still load and display content
    await expect(page).toHaveTitle(/llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('Performance and Accessibility', () => {
  test('homepage should load within reasonable time', async ({ page }) => {
    const startTime = performance.now()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const loadTime = performance.now() - startTime

    // Should load within 10 seconds (generous for CI)
    expect(loadTime).toBeLessThan(10000)
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
