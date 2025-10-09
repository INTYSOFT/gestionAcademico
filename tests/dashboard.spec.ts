import { test, expect } from '@playwright/test';

function buildPayload(overrides: Record<string, unknown> = {}): string {
  const payload = {
    id: 'admin-1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    roles: ['admin'],
    redirectUri: '/dashboard',
    ...overrides
  };

  return encodeURIComponent(JSON.stringify(payload));
}

test.describe('Authentication flow', () => {
  test('logs in from mock callback and shows admin menu', async ({ page }) => {
    await page.goto(`/auth/callback?test_user=${buildPayload()}`);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('dashboard')).toBeVisible();
    await expect(page.getByTestId('ecommerce')).toBeVisible();

    await page.getByRole('button', { name: /Menú de usuario|User menu/i }).click();
    await page.getByTestId('logout-button').click();

    await expect(page).toHaveURL(/sign-in$/);
  });

  test('shows limited navigation for manager role', async ({ page }) => {
    await page.goto(
      `/auth/callback?test_user=${buildPayload({ id: 'manager-1', roles: ['manager'], name: 'Grace Hopper' })}`
    );

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('dashboard')).toBeVisible();
    await expect(page.getByTestId('ecommerce')).toHaveCount(0);
  });
});
