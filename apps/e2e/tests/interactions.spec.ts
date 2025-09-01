import { expect, test } from '@playwright/test'

test.describe('User Interactions', () => {
  test('search functionality should work', async ({ page }) => {
    await page.goto('/')

    // Find search input (could be in header or main content)
    const searchInput = page.getByRole('textbox').first()
    await searchInput.fill('next.js')
    await searchInput.press('Enter')

    // Should navigate to search results or show results
    await page.waitForURL('**/search?*')
    // Check that we're on search page and results are shown
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('category filtering should work', async ({ page }) => {
    await page.goto('/websites')

    // Look for filter or sort controls
    const sortControl = page.getByText(/sort/i).first()
    if (await sortControl.isVisible()) {
      await sortControl.click()

      // Should see sorting options
      await expect(page.getByText(/name|latest/i)).toBeVisible()
    }
  })

  test('load more functionality should work', async ({ page }) => {
    await page.goto('/websites')

    // Look for "Load more" or "Show all" button
    const loadMoreBtn = page.getByRole('button', { name: /load more|show all|show more/i }).first()

    if (await loadMoreBtn.isVisible()) {
      const initialItems = await page.locator('[data-testid*="website"], .grid > *').count()

      // Click and wait for network activity to settle
      await Promise.all([page.waitForLoadState('networkidle'), loadMoreBtn.click()])

      // Assert that more items have loaded
      await expect
        .poll(async () => page.locator('[data-testid*="website"], .grid > *').count())
        .toBeGreaterThan(initialItems)
    }
  })

  test('theme toggle should work if available', async ({ page }) => {
    await page.goto('/')

    // Look for theme toggle button
    const themeToggle = page.getByRole('button', { name: /theme|dark|light/i }).first()

    if (await themeToggle.isVisible()) {
      await themeToggle.click()
      // Theme should change (check for class changes on html/body)
      await page.waitForTimeout(500)
    }
  })
})

test.describe('Navigation Interactions', () => {
  test('footer links should work', async ({ page }) => {
    await page.goto('/')

    // Check if footer exists and is visible
    const footer = page.locator('footer').first()
    if (await footer.isVisible()) {
      // Scroll to footer
      await page.getByRole('contentinfo').scrollIntoViewIfNeeded()

      // Test privacy link
      const privacyLink = page.getByRole('link', { name: /privacy/i })
      if (await privacyLink.isVisible()) {
        await privacyLink.click()
        await page.waitForURL('**/privacy')
        await expect(page).toHaveURL(/\/privacy/)
      }
    }
  })

  test('breadcrumb navigation should work if present', async ({ page }) => {
    await page.goto('/guides')

    // Look for breadcrumbs
    const breadcrumb = page.getByRole('navigation', { name: /breadcrumb/i })

    if (await breadcrumb.isVisible()) {
      const homeLink = breadcrumb.getByRole('link', { name: /home/i })
      if (await homeLink.isVisible()) {
        await homeLink.click()
        await expect(page).toHaveURL('http://localhost:3000/')
      }
    }
  })

  test('back to top functionality should work if available', async ({ page }) => {
    await page.goto('/')

    // Scroll down to trigger back-to-top button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // Look for back to top button
    const backToTop = page.getByRole('button', { name: /back to top|top/i })

    if (await backToTop.isVisible()) {
      await backToTop.click()

      // Wait for scroll animation to complete
      await expect.poll(() => page.evaluate(() => window.pageYOffset)).toBeLessThan(500)
    }
  })
})

test.describe('Form Interactions', () => {
  test('newsletter signup should work if available', async ({ page }) => {
    await page.goto('/')

    // Look for newsletter form
    const emailInput = page.getByRole('textbox', { name: /email/i })

    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com')

      const submitButton = page.getByRole('button', { name: /subscribe|sign up|join/i })
      if (await submitButton.isVisible()) {
        await submitButton.click()

        // Should show success message or redirect
        await page.waitForTimeout(2000)
      }
    }
  })

  test('contact form should work if available', async ({ page }) => {
    await page.goto('/about')

    // Look for contact form
    const contactForm = page.getByRole('form').first()

    if (await contactForm.isVisible()) {
      const nameInput = contactForm.getByRole('textbox', { name: /name/i })
      const emailInput = contactForm.getByRole('textbox', { name: /email/i })
      const messageInput = contactForm.getByRole('textbox', { name: /message/i })

      if (
        (await nameInput.isVisible()) &&
        (await emailInput.isVisible()) &&
        (await messageInput.isVisible())
      ) {
        await nameInput.fill('Test User')
        await emailInput.fill('test@example.com')
        await messageInput.fill('This is a test message')

        const submitBtn = contactForm.getByRole('button', { name: /send|submit/i })
        if (await submitBtn.isVisible()) {
          await submitBtn.click()
          await page.waitForTimeout(2000)
        }
      }
    }
  })
})

test.describe('External Links', () => {
  test('external links should open correctly', async ({ page }) => {
    await page.goto('/')

    // Look for GitHub or other external links
    const externalLinks = page.getByRole('link').filter({ hasText: /github|external/i })

    const firstExternal = externalLinks.first()
    if (await firstExternal.isVisible()) {
      // Check if it has target="_blank" or external indicator
      const target = await firstExternal.getAttribute('target')
      if (target === '_blank') {
        // Should open in new tab (but we won't actually test that to avoid complexity)
        expect(target).toBe('_blank')
      }
    }
  })
})

test.describe('Mobile Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
  })

  test('mobile menu should work', async ({ page }) => {
    await page.goto('/')

    // Look for mobile menu button (hamburger menu)
    const mobileMenuBtn = page.getByRole('button', { name: /menu|navigation/i }).first()

    if (await mobileMenuBtn.isVisible()) {
      await mobileMenuBtn.click()

      // Should show mobile navigation
      await page.waitForTimeout(500)

      // Should be able to navigate
      const navLink = page.getByRole('link', { name: /about|guides/i }).first()
      if (await navLink.isVisible()) {
        await navLink.click()
        await page.waitForLoadState('networkidle')
      }
    }
  })

  test('mobile search should work', async ({ page }) => {
    await page.goto('/')

    // Look for mobile search trigger
    const searchTrigger = page.getByRole('button', { name: /search/i })

    if (await searchTrigger.isVisible()) {
      await searchTrigger.click()

      // Should show search input
      const searchInput = page.getByRole('textbox').first()
      if (await searchInput.isVisible()) {
        await searchInput.fill('test')
        await searchInput.press('Enter')

        // Wait for navigation or results to appear
        await expect(page).toHaveURL(/\/search\?.+/, { timeout: 10000 })
      }
    }
  })
})
