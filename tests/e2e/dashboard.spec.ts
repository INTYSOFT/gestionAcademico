import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should render dashboard headline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});
