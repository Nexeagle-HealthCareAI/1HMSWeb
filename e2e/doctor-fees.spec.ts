import { test, expect } from '@playwright/test';

// Covers Bug #1's UI: DoctorFee.FreeFollowUpDays must be visible, editable and persisted from
// Configuration > Doctor Fees. Needs a hospital-admin (or equivalent) account with at least one
// doctor row in the Doctor Fees table - see e2e/README.md.
//
// Desktop table column order: Doctor | Department | OPD | IPD | Emergency | Free Follow-up | Save
const FREE_FOLLOW_UP_COLUMN_INDEX = 5;

test.describe('Doctor Fees - free follow-up window', () => {
  test('free follow-up days column is visible, editable, and saves', async ({ page }) => {
    await page.goto('/configuration');
    await page.getByText('Doctor Fees', { exact: true }).click();

    await expect(page.getByRole('columnheader', { name: 'Free Follow-up (days)' })).toBeVisible({ timeout: 10_000 });

    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible();

    const freeFollowUpCell = firstRow.locator('td').nth(FREE_FOLLOW_UP_COLUMN_INDEX).locator('input');
    const original = await freeFollowUpCell.inputValue();
    const next = original === '5' ? '9' : '5';

    await freeFollowUpCell.fill(next);
    await firstRow.getByRole('button', { name: /save/i }).click();

    // The row's dirty/amber styling clears and the Save button disables again once persisted.
    await expect(firstRow.getByRole('button', { name: /save/i })).toBeDisabled({ timeout: 10_000 });

    await page.reload();
    await page.getByText('Doctor Fees', { exact: true }).click();
    const reloadedRow = page.locator('table tbody tr').first();
    await expect(reloadedRow.locator('td').nth(FREE_FOLLOW_UP_COLUMN_INDEX).locator('input')).toHaveValue(next);

    // Restore the original value so repeated runs don't drift the doctor's real config.
    await reloadedRow.locator('td').nth(FREE_FOLLOW_UP_COLUMN_INDEX).locator('input').fill(original);
    await reloadedRow.getByRole('button', { name: /save/i }).click();
    await expect(reloadedRow.getByRole('button', { name: /save/i })).toBeDisabled({ timeout: 10_000 });
  });
});
