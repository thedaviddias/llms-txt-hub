import { expect, test } from '@playwright/test'

test.describe('Website routes', () => {
  test('should load websites list page successfully', async ({ page }) => {
    // Navigate to the websites list page
    await page.goto('/websites')

    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded')

    // Verify that we're on the websites page
    expect(page.url()).toBe('http://localhost:3000/websites')

    // Verify page has loaded by checking for heading
    const heading = page.getByRole('heading', { name: /All LLMs Websites/i, exact: false })
    await expect(heading).toBeVisible()

    // Check for website cards in the list
    const websiteCards = page.locator('[data-testid="website-card"]')
    await expect(await websiteCards.count()).toBeGreaterThan(0)
  })

  // Test for website detail page with static slug (using a reliable slug we know exists)
  test('should load website detail page by slug', async ({ page }) => {
    // We use ux-patterns-for-devs because it's mentioned in the websites.json file
    const slug = 'ux-patterns-for-devs'
    await page.goto(`/websites/${slug}`)

    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded')

    // Verify that we're on the expected detail page
    expect(page.url()).toBe(`http://localhost:3000/websites/${slug}`)

    // Verify the page shows the website name
    const heading = page.getByRole('heading', { name: /UX Patterns for Devs/i, exact: false })
    await expect(heading).toBeVisible()

    // Verify that the website detail information is displayed
    // Check for description section
    const description = page.locator('p.text-muted-foreground')
    await expect(description).toBeVisible()

    // Check for navigation to the website
    const websiteLink = page.getByRole('link', { name: /visit website/i })
    await expect(websiteLink).toBeVisible()

    // Check for llms.txt link
    const llmsLink = page.getByTestId('llm-llms-button')
    await expect(llmsLink).toBeVisible()
  })

  // Test for non-existent website slug (should return 404)
  test('should return 404 for non-existent website slug', async ({ page }) => {
    // Navigate to a non-existent website slug
    await page.goto('/websites/non-existent-website-slug-123')

    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded')

    // Check for 404 indication (assuming your 404 page has specific text)
    const notFoundText = page.getByText(/not found/i, { exact: false })
    await expect(notFoundText).toBeVisible()
  })

  // Test navigating from list page to detail page
  test('should navigate from websites list to website detail page', async ({ page }) => {
    // Start on the websites list page
    await page.goto('/websites')
    await page.waitForLoadState('domcontentloaded')

    // Find a website card and click on it
    const websiteCards = page.locator('[data-testid="website-card"]').first()
    await websiteCards.click()

    // Verify we're now on a detail page
    await page.waitForURL(/\/websites\/[\w-]+/)

    // Verify detail page components
    const heading = page.getByRole('heading')
    await expect(heading).toBeVisible()

    const websiteLink = page.getByRole('link', { name: /visit website/i })
    await expect(websiteLink).toBeVisible()
  })
})
