// legacy/tests/tcross.js: two people in two browsers on the same database. What one creates,
// changes or deletes, the other sees on the next page change. (The legacy test used a dealer for
// the second browser; interfaces are admin-only now, so both are admin console sessions.)
import { expect, test } from '@playwright/test';
import { URL, one } from './helpers';
import { adminPage, cleanupAdminTests, recordCard } from './admin-helpers';

test.beforeAll(cleanupAdminTests);
test.afterAll(cleanupAdminTests);

test('create, update and delete show up in the other browser after a page change', async ({
  browser,
}) => {
  const a = await adminPage(browser, '/interfaces');
  const b = await adminPage(browser, '/tree');

  // A creates (a pop-up form's Save writes at once)
  await a.getByRole('button', { name: 'Interface', exact: true }).click();
  const form = a.getByRole('dialog', { name: 'New · Interface' });
  await form.getByLabel('Name').fill('CROSS-TEST');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(a).toHaveURL(/\/interfaces\/I\d+$/);
  const id = a.url().split('/').pop()!;
  expect(
    (await one<{ n: number }>('SELECT count(*) AS n FROM core.interfaces WHERE id = $1', [id])).n,
  ).toBe(1);

  // B sees it on its next page change
  await b.getByRole('button', { name: 'Interfaces' }).click();
  await expect(b.getByRole('row', { name: /CROSS-TEST/ })).toBeVisible();

  // B changes it
  await b.getByRole('row', { name: /CROSS-TEST/ }).click();
  const card = recordCard(b);
  await card.getByRole('button', { name: 'Edit' }).click();
  await card.getByLabel('Name', { exact: true }).fill('CROSS-UPDATED');
  await card.getByRole('button', { name: 'Save' }).click();
  await expect
    .poll(
      async () =>
        (await one<{ name: string }>('SELECT name FROM core.interfaces WHERE id = $1', [id])).name,
    )
    .toBe('CROSS-UPDATED');

  // A sees the change after moving pages
  await a.getByRole('button', { name: 'Product Tree' }).click();
  await a.getByRole('button', { name: 'Interfaces' }).click();
  await expect(a.getByRole('row', { name: /CROSS-UPDATED/ })).toBeVisible();

  // B deletes it
  await card.getByRole('button', { name: 'Edit' }).click();
  await card.getByRole('button', { name: 'Delete CROSS-UPDATED' }).click();
  await b.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(b).toHaveURL(new RegExp(`${URL.admin}/interfaces$`));
  expect(
    (await one<{ n: number }>('SELECT count(*) AS n FROM core.interfaces WHERE id = $1', [id])).n,
  ).toBe(0);

  // A sees it gone after moving pages
  await a.getByRole('button', { name: 'Product Tree' }).click();
  await a.getByRole('button', { name: 'Interfaces' }).click();
  await expect(a.getByRole('table', { name: 'Interfaces' })).toBeVisible();
  await expect(a.getByRole('row', { name: /CROSS-/ })).toHaveCount(0);
});
