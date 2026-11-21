// Step 11 check (legacy/tests/tallapps.js): every product, every screen, for its demo customer.
// Opens each product's own sign-in page, signs in as the first demo account listed there and
// clicks through the whole menu: each screen has a title and nothing says "being designed".
import { expect, test } from '@playwright/test';
import { URL, pageTitle, signInReady } from './helpers';

const PRODUCTS = [
  'N003',
  'N004',
  'N008',
  'N009',
  'N010',
  'N011',
  'N013',
  'N014',
  'N016',
  'N017',
  'N019',
  'N020',
  'N021',
  'N026',
  'N027',
  'N028',
  'N030',
  'N031',
  'N033',
  'N047',
  'N048',
  'N051',
  'N052',
];

for (const id of PRODUCTS)
  test(`${id}: every screen renders for its demo customer`, async ({ page }) => {
    await page.goto(`${URL.customer}/app/${id}`);
    await signInReady(page);
    await page.locator('button[data-user]').first().click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${id}$`));
    const items = page.locator('.ui-rail .ui-rail__item');
    await expect(items.first()).toBeVisible();
    const n = await items.count();
    for (let i = 0; i < n; i++) {
      const label = (await items.nth(i).innerText()).trim();
      if (label === 'All my apps') continue;
      await items.nth(i).click();
      await expect(pageTitle(page), `${id} · ${label}`).not.toBeEmpty();
      await expect(
        page.getByText('This screen is being designed.'),
        `${id} · ${label}`,
      ).toHaveCount(0);
      await expect(page.locator('.ui-page'), `${id} · ${label}`).not.toContainText(/undefined|NaN/);
    }
  });
