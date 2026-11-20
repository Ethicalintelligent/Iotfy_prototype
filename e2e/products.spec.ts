// Step 10 check: the reference products come from their folders and every menu screen renders.
// Al Bina site admin → ConstructSafe (package); Company India admin → AIS 140 (edition).
import { expect, test, type Page } from '@playwright/test';
import { URL, signIn, signInReady } from './helpers';

async function everyScreenRenders(page: Page) {
  const items = page.locator('.ui-rail .ui-rail__item');
  const labels = (await items.allInnerTexts())
    .map((t) => t.trim())
    .filter((t) => t !== 'All my apps');
  for (const label of labels) {
    await page
      .locator('.ui-rail .ui-rail__item', { hasText: new RegExp(`^${label}$`) })
      .first()
      .click();
    await expect(page.locator('h1').first(), label).toHaveText(
      label === 'Dashboard' ? 'Dashboard' : /.+/,
    );
    await expect(page.getByText('This screen is being designed.'), label).toHaveCount(0);
  }
  return labels;
}

test('Al Bina site admin: ConstructSafe composes its members and adds Safety', async ({ page }) => {
  await page.goto(URL.customer + '/');
  await signInReady(page);
  await signIn(page, 'U19');
  await page.locator('button[data-app="N051"]').click();
  await expect(page).toHaveURL(/\/app\/N051$/);
  const labels = await everyScreenRenders(page);
  for (const l of [
    'Floor view',
    'Live map',
    'Cameras',
    'Trips',
    'Workers on site',
    'Gas readings',
    'Work permits',
  ])
    expect(labels).toContain(l);
  await page.locator('.ui-rail .ui-rail__item', { hasText: /^Work permits$/ }).click();
  await expect(page.getByTestId('demo-note')).toBeVisible();
});

test('Company India admin: the AIS 140 edition adds Panic & ERSS and real certificates', async ({
  page,
}) => {
  await page.goto(URL.customer + '/');
  await signInReady(page);
  await signIn(page, 'U7');
  await expect(page).toHaveURL(/\/app\/N009$/);
  const labels = await everyScreenRenders(page);
  expect(labels).toEqual(expect.arrayContaining(['Trips', 'Panic & ERSS', 'Certificates']));
  await page.locator('.ui-rail .ui-rail__item', { hasText: /^Certificates$/ }).click();
  await expect(page.getByRole('table', { name: 'Certificates' })).toContainText('AIS 140');
});
