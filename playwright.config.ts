import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:4200',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000
  },
  projects: [
    {
      name: 'Chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
