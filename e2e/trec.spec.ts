// legacy/tests/trec.js: record-level Edit / Save / Delete on the product tree. A new product can
// be renamed and deleted (confirmed); a product other records use can't be deleted.
import { expect, test } from '@playwright/test';
import { one } from './helpers';
import { adminPage, cleanupAdminTests, recordCard } from './admin-helpers';

test.beforeAll(cleanupAdminTests);
test.afterAll(cleanupAdminTests);

test('add a product, rename it, delete it (confirmed)', async ({ browser }) => {
  const page = await adminPage(browser, '/tree/N002');
  await page.getByRole('button', { name: '+ Product' }).click();
  const form = page.getByRole('dialog', { name: 'New · Product' });
  await form.getByLabel('Name').fill('REC-TEST');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/tree\/N002$/);
  await expect(page).toHaveURL(/\/tree\/N\d+$/);
  const id = page.url().split('/').pop()!;
  expect(
    await one<{ name: string; type: string; status: string }>(
      'SELECT name, type, status FROM core.nodes WHERE id = $1',
      [id],
    ),
  ).toEqual({
    name: 'REC-TEST',
    type: 'Product',
    status: 'Active',
  });

  const card = recordCard(page);
  await expect(card.locator('.ui-card__title')).toHaveText('REC-TEST');
  await card.getByRole('button', { name: 'Edit' }).click();
  // in Edit mode: Done (nothing changed yet) and the Delete link
  await expect(card.getByRole('button', { name: 'Done' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Delete REC-TEST' })).toBeVisible();
  await card.getByLabel('Name', { exact: true }).fill('REC-RENAMED');
  await expect(card.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await card.getByRole('button', { name: 'Save' }).click();
  await expect
    .poll(
      async () =>
        (await one<{ name: string }>('SELECT name FROM core.nodes WHERE id = $1', [id])).name,
    )
    .toBe('REC-RENAMED');
  await expect(card.getByRole('button', { name: 'Edit' })).toBeVisible();

  await card.getByRole('button', { name: 'Edit' }).click();
  await card.getByRole('button', { name: 'Delete REC-RENAMED' }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete REC-RENAMED?' });
  await expect(confirm).toContainText("It can't be undone.");
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page).toHaveURL(/\/tree$/);
  expect(
    (await one<{ n: number }>('SELECT count(*) AS n FROM core.nodes WHERE id = $1', [id])).n,
  ).toBe(0);
});

test('a product other records use can’t be deleted; the reason is shown', async ({ browser }) => {
  const page = await adminPage(browser, '/tree/N019');
  const card = recordCard(page);
  await card.getByRole('button', { name: 'Edit' }).click();
  await card.getByRole('button', { name: /^Delete / }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog).toContainText("Can't delete.");
  await expect(dialog).toContainText('foreign key');
  expect(
    (await one<{ n: number }>("SELECT count(*) AS n FROM core.nodes WHERE id = 'N019'")).n,
  ).toBe(1);
  // its own rows were not removed either (all or nothing)
  expect(
    (
      await one<{ n: number }>(
        "SELECT count(*) AS n FROM core.product_features WHERE product_id = 'N019'",
      )
    ).n,
  ).toBeGreaterThan(0);
});

test('other catalogue pages have the same record Edit', async ({ browser }) => {
  const page = await adminPage(browser, '/features/F01');
  await expect(recordCard(page).getByRole('button', { name: 'Edit' })).toBeVisible();
});
