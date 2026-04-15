import { test, expect } from "@playwright/test"

test.describe("Homepage interactions", () => {
  test("homepage search suggestions and submit work", async ({ page }) => {
    await page.goto("/")

    const input = page.locator('input[name="q"]').first()
    await expect(input).toBeVisible()
    await input.fill("amanita")

    const suggestionsResponse = page.waitForResponse((response) =>
      response.url().includes("/api/search/suggestions?q=amanita")
    )

    await input.press("a")
    await input.press("Backspace")

    await suggestionsResponse
    await expect(page.getByText("Fly Agaric").first()).toBeVisible({ timeout: 15000 })

    await input.press("Enter")
    await page.waitForURL(/\/search\?q=amanita/)
    await expect(page).toHaveURL(/\/search\?q=amanita/)
  })

  test("header and footer links navigate on first click", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("link", { name: /about us/i }).first().click()
    await page.waitForURL(/\/about$/)
    await expect(page).toHaveURL(/\/about$/)

    await page.goto("/")
    await page.locator("footer").scrollIntoViewIfNeeded()

    const researchButton = page.locator("footer button", { hasText: "Research" }).first()
    await expect(researchButton).toBeVisible()
    await researchButton.click()
    await page.waitForURL(/\/science$/)
    await expect(page).toHaveURL(/\/science$/)

    await page.goto("/")
    await page.locator("footer").scrollIntoViewIfNeeded()

    const privacyButton = page.locator("footer button", { hasText: "Privacy Policy" }).first()
    await expect(privacyButton).toBeVisible()
    await privacyButton.click()
    await page.waitForURL(/\/privacy$/)
    await expect(page).toHaveURL(/\/privacy$/)
  })
})
