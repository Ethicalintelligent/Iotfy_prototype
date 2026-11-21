// Step 9: the app switcher inside a product app. A company with several apps gets an
// "All my apps" button in the rail, and search (Ctrl+K) offers its other apps.
import { expect, test } from '@playwright/test';
import { URL, signIn, signInReady } from './helpers';

test('rail button and search switch between the company’s apps', async ({ page }) => {
  await page.goto(URL.customer + '/');
  await signInReady(page);
  await signIn(page, 'U4'); // Company A: four apps
  await page.locator('button[data-app="N004"]').click();
  await expect(page).toHaveURL(/\/app\/N004$/);

  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'Search' });
  await palette.getByLabel('Search').fill('health');
  await palette.getByText('HealthSafe').click();
  await expect(page).toHaveURL(/\/app\/N052$/);

  await page.locator('.ui-rail button[title="All my apps"]').click();
  await expect(page).toHaveURL(/\/apps$/);
});

test('a company with one app has no switcher', async ({ page }) => {
  await page.goto(URL.customer + '/');
  await signInReady(page);
  await signIn(page, 'U8'); // Company B: one app, goes straight in
  await expect(page).toHaveURL(/\/app\//);
  await expect(page.locator('.ui-rail button[title="All my apps"]')).toHaveCount(0);
});
