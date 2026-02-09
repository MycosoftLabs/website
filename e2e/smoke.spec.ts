import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Mycosoft/i);
  });

  test('species page loads', async ({ page }) => {
    await page.goto('/species');
    await expect(page.locator('body')).toBeVisible();
  });

  test('CREP dashboard loads', async ({ page }) => {
    await page.goto('/crep');
    await expect(page.locator('body')).toBeVisible();
  });

  test('NatureOS page loads', async ({ page }) => {
    await page.goto('/natureos');
    await expect(page.locator('body')).toBeVisible();
  });

  test('API health endpoint', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });
});
