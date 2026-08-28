import { test, expect } from '@playwright/test';

// Covers the system-generated default letterhead: choosing it must not error, and the preview
// must actually render (the PDF is generated client-side via pdf-lib - see defaultLetterhead.ts,
// rendered inline via PreviewPanel.tsx's <iframe src={previewUrl}>).
// Needs a doctor account with a Prescription Designer reachable from /configuration.
test.describe('Default letterhead preview', () => {
  test('choosing the system default and previewing produces a PDF with no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/configuration');
    await page.getByText('Prescriptions', { exact: true }).click();

    await page.getByText('Use system-generated default', { exact: true }).click();
    await expect(page.getByText('Using the system-generated default letterhead', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Preview Prescription' }).click();

    const previewFrame = page.locator('iframe[src^="blob:"]');
    await expect(previewFrame.first()).toBeVisible({ timeout: 15_000 });

    expect(consoleErrors, `Unexpected console/page errors while generating the default letterhead:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
