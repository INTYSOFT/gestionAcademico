import { test, expect } from '@playwright/test';

test.describe('Dashboard page', () => {
  test('should display dashboard title', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});
