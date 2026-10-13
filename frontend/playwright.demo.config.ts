import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/demo-api',
  workers: 1,
  timeout: 90000,
  expect: { timeout: 20000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.DEMO_WEB_URL || 'http://127.0.0.1:3010',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
  },
  projects: [{ name: 'demo-chromium', use: { ...devices['Desktop Chrome'] } }],
});
