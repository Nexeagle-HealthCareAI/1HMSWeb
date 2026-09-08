import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// E2E config for exercising the app against a REAL running environment (dev VM by default) --
// this is not a component/unit-test harness, it drives a real browser against E2E_BASE_URL with
// a real login. Loads e2e/.env.e2e (see e2e/.env.e2e.example) if present, or reads the same vars
// from the shell environment - never commit real credentials to .env.e2e.
loadEnv({ path: 'e2e/.env.e2e' });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // tests share one logged-in storage state; avoid racing on shared server data
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  timeout: 45_000,
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
