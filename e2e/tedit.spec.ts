// legacy/tests/tedit.js: fields are read-only until Edit; changes wait for Save; the leave guard;
// Neon's error text when it refuses; the rail opens on hover and closes after choosing a page.
import { expect, test } from '@playwright/test';
import { one, sql } from './helpers';
import { adminPage, recordCard } from './admin-helpers';

let original = '';
test.beforeAll(async () => {
  original = (await one<{ name: string }>("SELECT name FROM core.nodes WHERE id = 'N019'")).name;
});
test.afterAll(async () => {
  await sql("UPDATE core.nodes SET name = $1 WHERE id = 'N019'", [original]);
});

test('product tree: Edit → change → leave guard (Stay) → Save writes to Neon', async ({
  browser,
}) => {
  const page = await adminPage(browser, '/tree/N019');
  const card = recordCard(page);
  const name = card.getByLabel('Name', { exact: true });
  await expect(name).toHaveValue(original);
  await expect(name).toHaveAttribute('readonly', '');
  await expect(page.locator('.ui-editbar')).toHaveCount(0);

  await card.getByRole('button', { name: 'Edit' }).click();
  await expect(name).not.toHaveAttribute('readonly', '');
  await expect(page.locator('.ui-editbar')).toContainText('No changes yet');

  await name.fill('Edited by test');
  await expect(page.locator('.ui-editbar')).toContainText(`Unsaved changes in Product ${original}`);
  // nothing saved yet
  expect((await one<{ name: string }>("SELECT name FROM core.nodes WHERE id = 'N019'")).name).toBe(
    original,
  );

  // leaving asks first
  await page.getByRole('button', { name: 'App Features' }).click();
  const guard = page.getByRole('dialog', { name: 'Unsaved changes' });
  await expect(guard).toBeVisible();
  await guard.getByRole('button', { name: 'Stay' }).click();
  await expect(page).toHaveURL(/\/tree\/N019$/);

  await card.getByRole('button', { name: 'Save' }).click();
  await expect(card.getByRole('button', { name: 'Edit' })).toBeVisible();
  await expect(page.locator('.ui-editbar')).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await one<{ name: string }>("SELECT name FROM core.nodes WHERE id = 'N019'")).name,
    )
    .toBe('Edited by test');
});

test('hardware: deleting a model that is in use shows Neon’s refusal and keeps it', async ({
  browser,
}) => {
  const page = await adminPage(browser, '/hardware/D01');
  const card = recordCard(page);
  await card.getByRole('button', { name: 'Edit' }).click();
  await card.getByRole('button', { name: /^Delete / }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog).toContainText("Can't delete.");
  await expect(dialog).toContainText('foreign key');
  await dialog.getByRole('button', { name: 'Close' }).click();
  await card.getByRole('button', { name: /^(Done|Cancel)$/ }).click();
  await expect(card.getByRole('button', { name: 'Edit' })).toBeVisible();
  expect(
    (await one<{ n: number }>("SELECT count(*) AS n FROM core.device_models WHERE id = 'D01'")).n,
  ).toBe(1);
});

test('the rail opens on hover and closes after choosing a page', async ({ browser }) => {
  const page = await adminPage(browser);
  const rail = page.getByRole('complementary', { name: 'Main menu' });
  await rail.hover();
  await expect.poll(async () => (await rail.boundingBox())?.width).toBe(224);
  await rail.getByRole('button', { name: 'Lookups' }).click();
  await expect(page).toHaveURL(/\/lookups/);
  await page.mouse.move(700, 400);
  await expect.poll(async () => (await rail.boundingBox())?.width).toBe(56);
});
