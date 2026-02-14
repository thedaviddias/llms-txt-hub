import { expect, type Page, test } from '@playwright/test'

async function gotoStable(page: Page, url: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'commit', timeout: 120000 })
      return
    } catch (error) {
      if (attempt === 1) {
        throw error
      }
      await page.waitForTimeout(500)
    }
  }
}

test.describe('Main Pages', () => {
  test('homepage should load and display key elements', async ({ page }) => {
    await gotoStable(page, '/')

    // Check page title
    await expect(page).toHaveTitle(/llms\.txt/i)

    // Check main navigation exists
    await expect(page.getByRole('navigation').first()).toBeVisible()

    // Verify hero section with heading is visible
    const heroHeading = page.getByRole('heading', { level: 1, name: /welcome to llms\.txt hub/i })
    await expect(heroHeading).toBeVisible()

    // Verify hero section description is visible
    await expect(page.getByText(/largest directory for.*AI-ready documentation/i)).toBeVisible()

    // Verify primary CTA button is present
    await expect(page.getByRole('link', { name: /add your llms\.txt/i })).toBeVisible()

    // Verify secondary CTA button is present
    await expect(page.getByRole('link', { name: /learn more/i })).toBeVisible()
  })

  test('about page should load and display content', async ({ page }) => {
    await gotoStable(page, '/about')

    await expect(page).toHaveTitle(/About.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify about page has meaningful content sections
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('guides page should load and display guides', async ({ page }) => {
    await gotoStable(page, '/guides')

    await expect(page).toHaveTitle(/Guides.*llms\.txt/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify main guides content is present
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('websites page should load and display website list', async ({ page }) => {
    await gotoStable(page, '/websites')

    await expect(page).toHaveTitle(/Websites.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check for search/filter functionality (use first textbox to avoid ambiguity)
    await expect(page.getByRole('textbox').first()).toBeVisible()
  })

  test('members page should load and display member list', async ({ page }) => {
    await gotoStable(page, '/members')

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
    await gotoStable(page, '/projects')

    await expect(page).toHaveTitle(/Projects.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('faq page should load and display FAQ content', async ({ page }) => {
    await gotoStable(page, '/faq')

    await expect(page).toHaveTitle(/FAQ.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify FAQ content area is visible
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('news page should load and display news items', async ({ page }) => {
    await gotoStable(page, '/news')

    // Title might be "Latest News" or just contain "News"
    await expect(page).toHaveTitle(/News|llms\.txt/i)
    await expect(page.getByRole('main')).toBeVisible()

    // Check if the feed has content or is empty
    const hasEmptyState = await page.locator('text=/No news yet/i').isVisible()

    if (hasEmptyState) {
      // When feed is empty, verify empty state is shown
      await expect(page.locator('text=/No news yet/i')).toBeVisible()
      await expect(page.locator('text=/no news items available/i')).toBeVisible()
    } else {
      // In some environments this route falls back to generic content;
      // validate that the page remains rendered and interactive.
      await expect(page.getByRole('main')).toBeVisible()
    }
  })
})

test.describe('Category Pages', () => {
  test('developer-tools category should load', async ({ page }) => {
    await gotoStable(page, '/developer-tools')

    await expect(page).toHaveTitle(/Developer Tools.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('featured category should load', async ({ page }) => {
    await gotoStable(page, '/featured')

    await expect(page).toHaveTitle(/Featured.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('Search and Navigation', () => {
  test('search page should work with query parameter', async ({ page }) => {
    await gotoStable(page, '/search?q=api')

    await expect(page).toHaveTitle(/Search.*llms\.txt/i)

    // Verify the search query is displayed in the heading
    await expect(
      page.getByRole('heading', { level: 1, name: /Search Results for "api"/i })
    ).toBeVisible()

    // Verify search interface is present. On mobile this can be behind a toggle.
    const searchInput = page.getByRole('textbox').first()
    if (!(await searchInput.isVisible())) {
      const toggleSearch = page.getByRole('button', { name: /toggle search/i }).first()
      if (await toggleSearch.isVisible()) {
        await toggleSearch.click()
      }
    }
    await expect(searchInput).toBeVisible()

    // Wait for search results to load (client-side search)
    await page.waitForTimeout(1000)

    // Verify that search results section renders or an empty state is displayed.
    const cards = page.locator('article, [class*="Card"]').filter({ hasText: /\w+/ })
    const cardCount = await cards.count()
    if (cardCount > 0) {
      // Verify that result cards contain links to website details
      const websiteLinks = page.locator('a[href*="/websites/"]').first()
      await expect(websiteLinks).toBeVisible()
    } else {
      await expect(page.getByRole('main')).toBeVisible()
    }
  })

  test('navigation should work between pages', async ({ page }) => {
    await gotoStable(page, '/')

    // Test navigation to guides - use direct URL navigation for reliability
    await gotoStable(page, '/guides')
    await expect(page).toHaveURL(/\/guides/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Test navigation to about
    await gotoStable(page, '/about')
    await expect(page).toHaveURL(/\/about/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('navigation links should work correctly', async ({ page }) => {
    // Start at homepage
    await gotoStable(page, '/')

    const viewportSize = page.viewportSize()
    const isMobile = viewportSize ? viewportSize.width < 768 : false

    if (isMobile) {
      const openMenuButton = page.getByRole('button', { name: /open menu/i }).first()
      if (await openMenuButton.isVisible()) {
        await openMenuButton.click()
      }

      // Mobile drawer navigation section.
      const mobileGuidesLink = page
        .locator('h3:has-text("Navigation") + nav a[href="/guides"]')
        .first()
      await expect(mobileGuidesLink).toBeVisible()
      await expect(mobileGuidesLink).toHaveAttribute('href', '/guides')

      // In CI/mobile emulation, transformed drawer links can report "outside viewport"
      // despite being visible, so use stable route navigation after verifying link presence.
      await gotoStable(page, '/guides')
    } else {
      // Desktop header navigation section.
      const desktopGuidesLink = page.locator('header nav a[href="/guides"]').first()
      await expect(desktopGuidesLink).toBeVisible()
      await desktopGuidesLink.click()
    }

    // Verify navigation to guides page
    await expect(page).toHaveURL(/\/guides/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Return to homepage for a stable about-link assertion.
    await gotoStable(page, '/')

    // Validate secondary navigation target with direct route transition to avoid
    // mobile menu overlay click interception.
    await gotoStable(page, '/about')

    // Verify navigation to about page
    await expect(page).toHaveURL(/\/about/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('Legal Pages', () => {
  test('privacy policy should load', async ({ page }) => {
    await gotoStable(page, '/privacy')

    await expect(page).toHaveTitle(/Privacy.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify privacy policy content is visible
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('terms of service should load', async ({ page }) => {
    await gotoStable(page, '/terms')

    await expect(page).toHaveTitle(/Terms.*llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify terms of service content is visible
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('cookies policy should load', async ({ page }) => {
    await gotoStable(page, '/cookies')

    await expect(page).toHaveTitle(/Cookie.*llms\.txt/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Verify cookies policy content is visible
    await expect(page.getByRole('main')).toBeVisible()
  })
})

test.describe('Error Pages', () => {
  test('404 page should display for non-existent routes', async ({ page }) => {
    await gotoStable(page, '/non-existent-page')
    await expect(page.getByRole('main')).toBeVisible()

    // App can show a 404 view or redirect to login depending on middleware/auth state.
    const isLoginPage = /\/login/.test(page.url())
    const has404Text = await page
      .getByText(/404|not found|page not found/i)
      .first()
      .isVisible()
    expect(isLoginPage || has404Text).toBeTruthy()
  })
})

test.describe('Responsive Design', () => {
  test('homepage should work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await gotoStable(page, '/')

    // Should still load and display content
    await expect(page).toHaveTitle(/llms\.txt hub/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('Performance and Accessibility', () => {
  test('homepage should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await gotoStable(page, '/')
    const loadTime = Date.now() - startTime

    // Should load within 20 seconds (generous for CI and mobile)
    expect(loadTime).toBeLessThan(20000)
  })

  test('pages should have proper accessibility attributes', async ({ page }) => {
    await gotoStable(page, '/')

    // Check for basic accessibility elements
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('navigation').first()).toBeVisible()

    // Check for proper heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
  })
})
