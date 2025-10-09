import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

function createUserPayload() {
  const user = {
    id: 'user-123',
    name: 'Admin Test',
    email: 'admin@example.com',
    roles: ['admin'],
    avatarUrl: ''
  };
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

test.describe('Authentication flow', () => {
  test('handles IdP callback and logout', async ({ page }) => {
    const userParam = createUserPayload();
    const callbackUrl = `/auth/callback?user=${userParam}&access_token=fake-access-token&redirect_uri=%2Fdashboard`;

    await page.goto(callbackUrl);
    await page.waitForURL('**/dashboard');

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /(productos|products)/i })).toBeVisible();

    await page.getByTestId('user-menu-trigger').click();
    await page.getByRole('menuitem', { name: /cerrar sesión/i }).click();

    await expect(page).toHaveURL(/sign-in$/);
    await expect(page.getByRole('heading', { name: /bienvenido/i })).toBeVisible();
  });
});
