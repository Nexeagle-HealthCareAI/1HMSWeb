import { test, expect, type Locator, type Page } from '@playwright/test';

// Sign-up and hospital onboarding, start to finish, with a TESTER number on the Dev server
// (1HMSAPI docs/TESTER-ACCOUNTS.md). The number is reset first, so this can run again and again:
//
//   reset the tester  ->  Register Now  ->  account type  ->  mobile + code (shown on the page, nothing is sent)
//   ->  hospital basics  ->  hospital location  ->  name, email, password  ->  signed in
//
// Needs E2E_BASE_URL plus E2E_TESTER_MOBILE and E2E_TESTER_RESET_KEY (see e2e/README.md); skipped without them.
// It runs in its own Playwright project ("onboarding"): no saved login, since it starts signed out.

const MOBILE = process.env.E2E_TESTER_MOBILE ?? '';
const RESET_KEY = process.env.E2E_TESTER_RESET_KEY ?? '';
const API_URL = (process.env.E2E_API_URL ?? 'https://1hms-dev-api.nexeagle.com').replace(/\/$/, '');
const PASSWORD = process.env.E2E_TESTER_PASSWORD ?? 'Tester@12345';

// The login and sign-up layouts render their content twice (a phone tree and a desktop tree, one hidden by CSS).
const shown = (page: Page, locator: Locator) => locator.and(page.locator(':visible'));

// The hospital steps put a <label> next to its <input> without linking them, so find the input by its label's text.
const fieldAfterLabel = (page: Page, label: RegExp) =>
  shown(page, page.locator('label').filter({ hasText: label }).locator('xpath=following-sibling::input[1]'));

test.describe('Registration and onboarding (tester number)', () => {
  test.skip(!MOBILE || !RESET_KEY, 'Set E2E_TESTER_MOBILE and E2E_TESTER_RESET_KEY to run the onboarding journey.');

  test.use({
    geolocation: { latitude: 26.0982, longitude: 87.9450 }, // Kishanganj, Bihar
    permissions: ['geolocation'],
  });

  test.beforeEach(async ({ request }) => {
    const reset = await request.post(`${API_URL}/internal/tester-accounts/reset`, {
      headers: { 'X-Tester-Key': RESET_KEY },
      data: { mobileNumber: MOBILE, dryRun: false },
    });
    expect(reset.status(), `tester reset answered ${reset.status()}: ${await reset.text()}`).toBe(200);
  });

  test('a new hospital admin signs up and reaches the app', async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto('/login');
    await shown(page, page.getByRole('button', { name: 'Register Now' })).click();

    // 1. Account type
    await shown(page, page.getByText('Admin Only', { exact: true })).click();

    // 2. Mobile number and code. For a tester number the code comes back to the page.
    await shown(page, page.getByLabel('Mobile Number')).fill(MOBILE);
    await shown(page, page.getByRole('button', { name: 'Send OTP' })).click();
    const code = shown(page, page.getByTestId('dev-otp-code'));
    await expect(code, 'the tester code is shown (is this number in STAFF_TESTER_MOBILES on Dev?)').toBeVisible({ timeout: 20_000 });
    await expect(code).toHaveText(/^\d{6}$/);
    await shown(page, page.getByRole('button', { name: 'Use it' })).click();

    // 3. Hospital basics (the code step verifies by itself once six digits are in)
    const hospitalName = shown(page, page.getByPlaceholder('e.g. City Care Hospital'));
    await expect(hospitalName).toBeVisible({ timeout: 20_000 });
    await hospitalName.fill('Tester Onboarding Hospital');
    await shown(page, page.getByRole('combobox')).first().click();
    await page.getByRole('option').first().click();
    await shown(page, page.getByPlaceholder('Hospital phone')).fill(MOBILE);
    await shown(page, page.getByRole('button', { name: 'Continue' })).click();

    // 4. Hospital location: the pin comes from the browser's (faked) location; the address is typed in case the lookup found none.
    await shown(page, page.getByRole('button', { name: /Use my current location/ })).click();
    await page.waitForTimeout(3_000); // reverse lookup fills what it finds
    const address: [RegExp, string][] = [
      [/^Address/, 'Station Road'],
      [/^City/, 'Kishanganj'],
      [/^State/, 'Bihar'],
      [/^Country/, 'India'],
      [/^Pincode/, '855107'],
    ];
    for (const [label, value] of address) {
      const field = fieldAfterLabel(page, label);
      if (!(await field.inputValue())) await field.fill(value);
    }
    await shown(page, page.getByRole('button', { name: 'Continue' })).click();

    // 5. Name, email, password
    await shown(page, page.getByPlaceholder('e.g. Dr. Anita Sharma')).fill('Tester Admin');
    await shown(page, page.getByPlaceholder('Enter your email address')).fill(`tester+${MOBILE}@example.com`);
    await shown(page, page.getByPlaceholder('Create a strong password')).fill(PASSWORD);
    await shown(page, page.getByPlaceholder('Confirm your password')).fill(PASSWORD);
    await shown(page, page.getByRole('button', { name: 'Complete Setup' })).click();

    // Signed in: off the login page and into the app (which screen depends on role and plan state).
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/(admin|dashboard|appointment-dashboard|subscription|configuration|profile)/);
  });
});
