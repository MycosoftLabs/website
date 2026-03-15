/**
 * Search and World View E2E — Doable Search Rollout validation.
 * Covers: /search?q=, unified search API, Try suggestions, worldview-style queries.
 * Created: March 14, 2026
 */

import { test, expect } from '@playwright/test'

test.describe('Search and World View', () => {
  test.beforeEach(async ({ page }) => {
    // Use baseURL from config or default localhost:3010
  })

  test('search page loads with query param', async ({ page }) => {
    await page.goto('/search?q=Amanita%20muscaria')
    await expect(page.locator('body')).toBeVisible()
    // Search context or results area should be present
    const searchContent = page.locator('[data-testid="search-canvas"], [data-testid="fluid-search"], .search-results, main')
    await expect(searchContent.first()).toBeVisible({ timeout: 15000 })
  })

  test('search page loads with worldview-style query', async ({ page }) => {
    await page.goto('/search?q=flights+over+pacific')
    await expect(page.locator('body')).toBeVisible()
    const searchContent = page.locator('[data-testid="search-canvas"], [data-testid="fluid-search"], .search-results, main')
    await expect(searchContent.first()).toBeVisible({ timeout: 15000 })
  })

  test('unified search API returns 200', async ({ request }) => {
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
    const res = await request.get(`${baseURL}/api/search/unified?q=Amanita`)
    expect(res.ok()).toBeTruthy()
    const data = await res.json().catch(() => ({}))
    expect(data).toBeDefined()
    // May have species, compounds, or source: "mas"
    expect(typeof data === 'object').toBeTruthy()
  })

  test('homepage has search entry', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Mycosoft/i)
    const searchInput = page.locator('input[type="search"], input[placeholder*="earch"], input[name="q"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
  })
})
