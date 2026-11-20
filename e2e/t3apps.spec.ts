// legacy/tests/t3apps.js: three apps, each admitting only its own roles; support sessions cross
// apps through a logged link that stops working once the session ends.
import { expect, test } from '@playwright/test';
import {
  URL,
  demoNames,
  one,
  resetTestData,
  signIn,
  signInReady,
  signInWithEmail,
  sql,
} from './helpers';

test.beforeAll(async () => {
  await resetTestData();
  await sql("UPDATE core.dealers SET support_access_until = current_date + 7 WHERE id = 'DL1'");
  await sql("UPDATE core.companies SET support_access_until = current_date + 7 WHERE id = 'C1'");
});
test.afterAll(resetTestData);

test('admin console → dealer console support link → partner portal → customer support link', async ({
  browser,
}) => {
  // ---------- admin console: EIT staff only
  const eit = await (await browser.newContext()).newPage();
  await eit.goto(URL.admin + '/');
  await signInReady(eit);
  await expect(eit).toHaveTitle('IoTIFY Admin Console');
  await expect(eit.locator('.ui-signin__heading')).toHaveText('IoTIFY Admin Console');
  expect(await demoNames(eit)).toBe('Platform admin');
  await signInWithEmail(eit, 'eit.direct.admin@iotify.demo');
  await expect(eit.getByRole('alert')).toHaveText(
    'EIT Direct admin signs in to the IoTIFY Partner Portal, not here.',
  );
  await signIn(eit, 'U1');
  await expect(eit).toHaveURL(/\/tree/);
  await eit.getByRole('button', { name: 'Dealers' }).click();
  await expect(eit).toHaveURL(/\/dealers/);

  // EIT opens EIT Direct's console as support
  await eit.getByRole('row', { name: /EIT Direct/ }).click();
  await eit.getByRole('button', { name: 'Open dealer console as support…' }).click();
  await eit.getByLabel('Reason (required)').fill('Pricing question');
  await eit.getByRole('button', { name: 'Start session' }).click();
  const link1 = await eit.getByTestId('support-link').getAttribute('href');
  expect(link1).toMatch(new RegExp(`^${URL.partner}/support/SS\\d+$`));

  // ---------- the link opens the dealer console, view-only
  const sup = await (await browser.newContext()).newPage();
  await sup.goto(link1!);
  await expect(sup).toHaveURL(/\/companies$/);
  const banner = sup.locator('.ui-supbar');
  await expect(banner).toContainText('Platform admin is viewing EIT Direct');
  await expect(banner).toContainText('view-only · Reason: Pricing question');
  await sup.getByRole('button', { name: 'End session' }).click();
  await expect(sup.getByRole('status').filter({ hasText: 'Support session ended' })).toHaveText(
    'Support session ended and logged. You can close this tab.',
  );
  expect(
    (
      await one<{ n: number }>(
        'SELECT count(*) AS n FROM core.support_sessions WHERE ended_at IS NOT NULL',
      )
    ).n,
  ).toBe(1);

  // the old link no longer works
  await sup.goto(link1!);
  await expect(sup.getByRole('status').filter({ hasText: 'support link' })).toHaveText(
    'This support link is not valid any more. Start a new session.',
  );

  // ---------- partner portal: dealers only
  const dealer = await (await browser.newContext()).newPage();
  await dealer.goto(URL.partner + '/');
  await signInReady(dealer);
  await expect(dealer).toHaveTitle('IoTIFY Partner Portal');
  expect(await demoNames(dealer)).toBe('EIT Direct admin, Sample Dealer admin');
  await signInWithEmail(dealer, 'company.a.admin@iotify.demo');
  await expect(dealer.getByRole('alert')).toHaveText(
    'Company A admin signs in to the IoTIFY Customer Apps, not here.',
  );
  await signIn(dealer, 'U2');
  await expect(dealer).toHaveURL(/\/companies$/);
  await expect(dealer.locator('.ui-rail__heading')).toHaveText(['My business', 'Tools']);

  // the dealer opens Sample Company A's app as support
  await dealer.locator('button[data-company="C1"]').click();
  await dealer.getByLabel('Reason (required)').fill('Ticket 1182');
  await dealer.getByRole('button', { name: 'Start session' }).click();
  const link2 = await dealer.getByTestId('support-link').getAttribute('href');
  expect(link2).toMatch(new RegExp(`^${URL.customer}/support/SS\\d+$`));

  // ---------- the link opens the customer's app, view-only
  const cust = await (await browser.newContext()).newPage();
  await cust.goto(link2!);
  await expect(cust).toHaveURL(/\/app\/N\d+$/);
  await expect(cust.locator('.ui-supbar')).toContainText(
    'EIT Direct admin is viewing Sample Company A',
  );
  await expect(cust.locator('.ui-supbar')).toContainText('Reason: Ticket 1182');

  // ---------- customer apps: companies only
  const co = await (await browser.newContext()).newPage();
  await co.goto(URL.customer + '/');
  await signInReady(co);
  await expect(co).toHaveTitle('IoTIFY Customer Apps');
  expect(await co.locator('a.ui-ep').count()).toBeGreaterThan(10);
  expect(await co.locator('.ui-demoacct').count()).toBe(16);
  await signInWithEmail(co, 'platform.admin@iotify.demo');
  await expect(co.getByRole('alert')).toHaveText(
    'Platform admin signs in to the IoTIFY Admin Console, not here.',
  );
  await signIn(co, 'U4');
  await expect(co.locator('.ui-apptile b')).toHaveText([
    'GPS Vehicle Tracking',
    'Indoor People Tracking',
    'Indoor Asset Tracking',
    'HealthSafe',
  ]);
});
