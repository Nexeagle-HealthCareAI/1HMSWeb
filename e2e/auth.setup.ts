import { test as setup, expect } from '@playwright/test';

// Logs in once via the real PasswordLoginForm and saves the resulting session so every spec
// reuses it instead of re-authenticating per test (see playwright.config.ts's `setup` project).
const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // The dashboard keeps a live connection open (auto-refreshing queue, live clock), which can
  // make Playwright's own context teardown hang well past the default 45s - closing the page
  // explicitly once the session is saved avoids waiting on that during teardown.
  setup.setTimeout(90_000);

  const email = process.env.E2E_LOGIN_EMAIL;
  const password = process.env.E2E_LOGIN_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD must be set - see e2e/README.md.');
  }

  await page.goto('/login');
  // LoginLayout renders the form in both a mobile and a desktop breakpoint tree at once (only one
  // of which is actually visible via CSS at any given viewport), so getByLabel/getByRole here can
  // resolve two elements - `.and(':visible')` picks the one that's actually rendered.
  const visible = page.locator(':visible');
  await page.getByLabel('Mobile Number or Email').and(visible).fill(email);
  await page.getByLabel('Password').and(visible).fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).and(visible).click();

  // Any of these confirms a successful login - which one depends on the account's role
  // (admin / hospital staff / doctor). See PublicRoutes.tsx's role-based redirect.
  await expect(page).toHaveURL(/\/(admin|dashboard|appointment-dashboard)/, { timeout: 15_000 });

  await page.context().storageState({ path: authFile });
  await page.close();
});
