// Step 8: partner portal flows on the test branch. A dealer sees only its own customers; fits a
// device, SIM and sensor from stock (each saves at once); quotes and accepts (creates the
// subscriptions); checks compatibility. Puts everything back afterwards.
import { expect, test, type Browser } from '@playwright/test';
import { URL, one, signIn, signInReady, sql } from './helpers';

let maxSub = 0;
async function restore() {
  await sql(
    "UPDATE core.device_units SET asset_id = NULL, company_id = NULL, status = 'In stock' WHERE id = 'DU2'",
  );
  await sql(
    "UPDATE core.connectivity SET device_unit_id = NULL, status = 'In stock' WHERE id = 'CN02'",
  );
  await sql(
    "UPDATE core.sensor_units SET device_unit_id = NULL, slot = NULL, interface_id = NULL WHERE id = 'SU4'",
  );
  await sql(
    "DELETE FROM core.quote_lines WHERE quote_id IN (SELECT id FROM core.quotes WHERE crm_id = 'E2E')",
  );
  await sql("DELETE FROM core.quotes WHERE crm_id = 'E2E'");
  if (maxSub)
    await sql(
      "DELETE FROM core.subscriptions WHERE substring(id from 4)::int > $1 AND seller_id = 'DL1'",
      [maxSub],
    );
}
test.beforeAll(async () => {
  maxSub = (
    await one<{ n: number }>(
      "SELECT coalesce(max(substring(id from 4)::int), 0) AS n FROM core.subscriptions WHERE id ~ '^SUB[0-9]+$'",
    )
  ).n;
  await restore();
});
test.afterAll(restore);

async function dealerPage(browser: Browser, user: string, path = '/companies') {
  const page = await (await browser.newContext()).newPage();
  await page.goto(URL.partner + '/');
  await signInReady(page);
  await signIn(page, user);
  await expect(page).toHaveURL(/\/companies/);
  if (path !== '/companies') await page.goto(URL.partner + path);
  return page;
}

test('a dealer sees only its own customers', async ({ browser }) => {
  const page = await dealerPage(browser, 'U3'); // Sample Dealer
  const table = page.getByRole('table', { name: 'Companys' });
  await expect(table.locator('tbody tr.ui-click')).toHaveCount(2);
  await expect(table).toContainText('Sample Company B');
  await expect(table).not.toContainText('Sample Company A');
});

test('installation: fit a device, a SIM and a sensor from stock', async ({ browser }) => {
  const asset = await one<{ id: string; name: string }>(
    `SELECT a.id, a.name FROM core.assets a JOIN core.companies c ON c.id = a.company_id
     WHERE c.dealer_id = 'DL1' AND NOT EXISTS (SELECT 1 FROM core.device_units u WHERE u.asset_id = a.id) ORDER BY a.id LIMIT 1`,
  );
  const page = await dealerPage(browser, 'U2', '/assets/' + asset.id);
  const inst = page
    .locator('.ui-card')
    .filter({ has: page.locator('.ui-card__title', { hasText: /^Installation$/ }) });
  await inst.getByLabel('Device from stock').selectOption('DU2');
  await inst.getByRole('button', { name: 'Fit device' }).click();
  await expect
    .poll(
      async () =>
        await one<{ a: string; s: string }>(
          "SELECT asset_id AS a, status AS s FROM core.device_units WHERE id = 'DU2'",
        ),
    )
    .toEqual({
      a: asset.id,
      s: 'Installed',
    });

  await inst.getByLabel('SIM from stock').selectOption('CN02');
  await inst.getByRole('button', { name: 'Add SIM' }).click();
  await expect
    .poll(
      async () =>
        (
          await one<{ d: string }>(
            "SELECT device_unit_id AS d FROM core.connectivity WHERE id = 'CN02'",
          )
        ).d,
    )
    .toBe('DU2');

  await inst.getByLabel('Sensor for RS485 1').selectOption('SU4');
  await inst
    .locator('[data-slot="RS485 1"]')
    .getByRole('button', { name: '+ Attach sensor' })
    .click();
  await expect
    .poll(
      async () =>
        await one<{ d: string; s: string }>(
          "SELECT device_unit_id AS d, slot AS s FROM core.sensor_units WHERE id = 'SU4'",
        ),
    )
    .toEqual({
      d: 'DU2',
      s: 'RS485 1',
    });

  // and off again
  await inst.locator('[data-slot="RS485 1"]').getByRole('button', { name: 'Detach' }).click();
  await expect
    .poll(
      async () =>
        (
          await one<{ d: string | null }>(
            "SELECT device_unit_id AS d FROM core.sensor_units WHERE id = 'SU4'",
          )
        ).d,
    )
    .toBeNull();
  await inst.getByRole('button', { name: 'Remove device' }).click();
  await expect
    .poll(
      async () =>
        (
          await one<{ a: string | null }>(
            "SELECT asset_id AS a FROM core.device_units WHERE id = 'DU2'",
          )
        ).a,
    )
    .toBeNull();
});

test('quote: add a product, accept → subscriptions created and prices frozen', async ({
  browser,
}) => {
  const page = await dealerPage(browser, 'U2', '/quotes');
  await page.getByRole('button', { name: 'Quote', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'New · Quote' });
  await form.getByLabel('Company').selectOption('C1');
  await form.getByLabel('CRM id').fill('E2E');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form).toHaveCount(0);
  await expect(page).toHaveURL(/\/quotes\/Q\d+$/);
  const qid = page.url().split('/').pop()!;

  await page.getByLabel('Add product').selectOption('N004');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Product lines' })).toContainText(
    'GPS Vehicle Tracking',
  );
  await expect(page.getByTestId('quote-totals')).toContainText('Monthly');

  await page.getByRole('button', { name: 'Accept → create subscriptions' }).click();
  await expect
    .poll(
      async () =>
        (await one<{ s: string }>('SELECT status AS s FROM core.quotes WHERE id = $1', [qid])).s,
    )
    .toBe('Accepted');
  const sub = await one<{
    buyer_id: string;
    seller_id: string;
    product_id: string;
    status: string;
  }>(
    "SELECT buyer_id, seller_id, product_id, status FROM core.subscriptions WHERE substring(id from 4)::int > $1 AND seller_id = 'DL1' ORDER BY id DESC LIMIT 1",
    [maxSub],
  );
  expect(sub).toEqual({ buyer_id: 'C1', seller_id: 'DL1', product_id: 'N004', status: 'Active' });
  expect(
    (
      await one<{ frozen: boolean }>(
        'SELECT bool_and(unit_price IS NOT NULL) AS frozen FROM core.quote_lines WHERE quote_id = $1',
        [qid],
      )
    ).frozen,
  ).toBe(true);
  // an accepted quote can't be changed
  await expect(page.getByRole('button', { name: 'Accept → create subscriptions' })).toHaveCount(0);
  await expect(page.getByLabel('Add product')).toHaveCount(0);
});

test('compatibility: picked products show the devices that fit', async ({ browser }) => {
  const page = await dealerPage(browser, 'U2', '/compat');
  await page.getByLabel('GPS Vehicle Tracking', { exact: true }).check();
  const devices = page
    .locator('.ui-card')
    .filter({ has: page.locator('.ui-card__title', { hasText: '5. Devices' }) });
  await expect(devices).toContainText('EIT 4G GPS');
  await expect(page.getByRole('table', { name: 'Result by device model' })).toContainText('Fits');
});
