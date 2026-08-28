import { test as setup, expect } from '@playwright/test';

// Logs in once via the real PasswordLoginForm and saves the resulting session so every spec
// reuses it instead of re-authenticating per test (see playwright.config.ts's `setup` project).
const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_LOGIN_EMAIL;
  const password = process.env.E2E_LOGIN_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD must be set - see e2e/README.md.');
  }

  await page.goto('/login');
  await page.getByLabel('Mobile Number or Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Any of these confirms a successful login - which one depends on the account's role
  // (admin / hospital staff / doctor). See PublicRoutes.tsx's role-based redirect.
  await expect(page).toHaveURL(/\/(admin|dashboard|appointment-dashboard)/, { timeout: 15_000 });

  await page.context().storageState({ path: authFile });
});
