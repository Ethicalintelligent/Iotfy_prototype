// Step 6 check: the shared screens (packages/app-kit) render with demo data in the gallery, and
// the editing model works: read-only until Edit, Save writes, Cancel reverts, the leave guard,
// Neon's error text, Delete refused with Neon's reason. Runs on the test branch.
import { expect, test } from '@playwright/test';
import { URL, one, pageTitle, signIn, signInReady, sql } from './helpers';

const SCREENS: [string, string][] = [
  ['dash', 'Dashboard'],
  ['map', 'Live map'],
  ['floor', 'Floor view'],
  ['alerts', 'Alerts'],
  ['live', 'Devices & features'],
  ['trips', 'Trips'],
  ['geofences', 'Geofences'],
  ['drivers', 'Drivers'],
  ['commands', 'Commands'],
  ['reports', 'Reports'],
  ['rules', 'Alert rules'],
  ['assets', 'Assets'],
  ['sites', 'Sites & zones'],
  ['users', 'Users'],
  ['subscription', 'My subscription'],
];

test('the gallery shows every shared screen with data; demo activity is labelled', async ({
  page,
}) => {
  for (const [key, title] of SCREENS) {
    await page.goto(`${URL.customer}/ui/screens?screen=${key}`);
    await expect(pageTitle(page), key).toHaveText(title);
    await expect(page.locator('.ui-page .ui-loading'), key).toHaveCount(0, { timeout: 20_000 });
    await expect(page.locator('.ui-page .ui-card, .ui-page tbody tr').first(), key).toBeVisible();
    if (['dash', 'map', 'floor', 'alerts', 'trips', 'reports'].includes(key))
      await expect(page.getByTestId('demo-note'), key).toContainText('Demo activity');
  }
  // Devices & features: paid features that need hardware say what's missing
  await page.goto(`${URL.customer}/ui/screens?screen=live`);
  await expect(
    page
      .locator('.ak-featline small')
      .filter({ hasText: /^Needs: / })
      .first(),
  ).toBeVisible();
});

test('gallery: leave guard (Stay / Discard) and a refused save show in place', async ({ page }) => {
  await page.goto(`${URL.customer}/ui/screens?screen=assets`);
  await page.locator('.ui-page tbody tr.ui-click').first().click();
  const card = page.locator('.ui-page .ui-card').last();
  const name = card.getByLabel('Name');
  await expect(name).toHaveAttribute('readonly', '');
  await card.getByRole('button', { name: 'Edit' }).click();
  await name.fill('Renamed in gallery');
  await expect(page.locator('.ui-editbar')).toContainText('Unsaved changes in Asset');

  await page.getByRole('button', { name: 'Dashboard' }).click();
  await page
    .getByRole('dialog', { name: 'Unsaved changes' })
    .getByRole('button', { name: 'Stay' })
    .click();
  await expect(page).toHaveURL(/screen=assets/);
  await expect(name).toHaveValue('Renamed in gallery');

  await card.getByRole('button', { name: 'Save' }).click();
  await expect(card.getByRole('alert')).toContainText('Screens gallery: changes are not saved.');
  await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();

  await page.getByRole('button', { name: 'Dashboard' }).click();
  await page
    .getByRole('dialog', { name: 'Unsaved changes' })
    .getByRole('button', { name: 'Discard' })
    .click();
  await expect(page).toHaveURL(/screen=dash/);
  await expect(page.locator('.ui-editbar')).toHaveCount(0);
});

test('product app: Edit → Save writes to Neon, Cancel reverts, Delete is refused with the reason', async ({
  page,
}) => {
  const asset = await one<{ id: string; name: string; plate_serial: string | null }>(
    "SELECT a.id, a.name, a.plate_serial FROM core.assets a WHERE a.company_id = 'C1' AND a.asset_type_id IN (SELECT asset_type_id FROM core.product_asset_types WHERE product_id = 'N004') AND EXISTS (SELECT 1 FROM core.device_units u WHERE u.asset_id = a.id) ORDER BY a.id LIMIT 1",
  );
  try {
    await page.goto(URL.customer + '/app/N004');
    await signInReady(page);
    await signIn(page, 'U4');
    await page.getByRole('button', { name: 'Assets' }).click();
    await page.getByRole('row', { name: new RegExp(asset.name) }).click();
    const card = page.locator('.ui-page .ui-card').last();

    // Cancel reverts
    await card.getByRole('button', { name: 'Edit' }).click();
    await card.getByLabel('Name').fill('Should not be saved');
    await card.getByRole('button', { name: 'Cancel' }).click();
    await expect(card.getByLabel('Name')).toHaveValue(asset.name);
    expect(
      (await one<{ name: string }>('SELECT name FROM core.assets WHERE id = $1', [asset.id])).name,
    ).toBe(asset.name);

    // Save writes only the changed field
    await card.getByRole('button', { name: 'Edit' }).click();
    await card.getByLabel('Plate / serial').fill('E2E-123');
    await card.getByRole('button', { name: 'Save' }).click();
    await expect(card.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await one<{ p: string }>('SELECT plate_serial AS p FROM core.assets WHERE id = $1', [
              asset.id,
            ])
          ).p,
      )
      .toBe('E2E-123');

    // Delete: confirmed, then refused because a device unit still uses the asset
    await card.getByRole('button', { name: 'Edit' }).click();
    await card.getByRole('button', { name: `Delete ${asset.name}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText("Can't delete.");
    await expect(page.getByRole('dialog')).toContainText('foreign key');
    expect(
      (await one<{ n: number }>('SELECT count(*) AS n FROM core.assets WHERE id = $1', [asset.id]))
        .n,
    ).toBe(1);
  } finally {
    // put the demo record back as it was
    await sql('UPDATE core.assets SET plate_serial = $1 WHERE id = $2', [
      asset.plate_serial,
      asset.id,
    ]);
  }
});
