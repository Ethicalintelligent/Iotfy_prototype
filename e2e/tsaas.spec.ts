// legacy/tests/tsaas.js: customer app access, white-label resellers, and support sessions that
// customers and dealers allow, which are view-only and logged.
import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  URL,
  demoNames,
  one,
  openUserMenu,
  pageTitle,
  resetTestData,
  signIn,
  signInReady,
  signOut,
} from './helpers';

test.beforeAll(resetTestData);
test.afterAll(resetTestData);

const fresh = async (browser: Browser, url: string): Promise<Page> => {
  const p = await (await browser.newContext()).newPage();
  await p.goto(url);
  return p;
};

test('1) a company with several apps picks one; the menu switches apps; All my apps', async ({
  page,
}) => {
  await page.goto(URL.customer + '/');
  await signInReady(page);
  await signIn(page, 'U4');
  await expect(page.locator('.ui-apptile b')).toHaveText([
    'GPS Vehicle Tracking',
    'Indoor People Tracking',
    'Indoor Asset Tracking',
    'HealthSafe',
  ]);
  await page.locator('button[data-app="N004"]').click();
  await expect(page).toHaveURL(/\/app\/N004$/);
  await expect(page.locator('.ui-rail .ui-logo')).toHaveText('EIT');
  await openUserMenu(page);
  await expect(page.getByRole('menuitem', { name: /HealthSafe/ })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Indoor Asset Tracking/ })).toBeVisible();
  await page.getByRole('menuitem', { name: /All my apps/ }).click();
  await expect(page).toHaveURL(/\/apps$/);
  await signOut(page);
});

test('2) a company with one app goes straight in', async ({ page }) => {
  await page.goto(URL.customer + '/');
  await signInReady(page);
  await signIn(page, 'U8');
  await expect(page).toHaveURL(/\/app\/N003$/);
  await expect(pageTitle(page)).toHaveText('Dashboard');
});

test('3) white-label: EIT sets the reseller type, the dealer brands it, customers see the brand', async ({
  browser,
}) => {
  const eit = await fresh(browser, URL.admin + '/');
  await signInReady(eit);
  await signIn(eit, 'U1');
  await eit.getByRole('button', { name: 'Dealers' }).click();
  await eit.getByRole('row', { name: /Sample Dealer/ }).click();
  await eit.getByLabel('Reseller type').selectOption('White-label reseller');
  await expect
    .poll(
      async () =>
        (await one<{ t: string }>("SELECT reseller_type AS t FROM core.dealers WHERE id = 'DL2'"))
          .t,
    )
    .toBe('White-label reseller');

  const dealer = await fresh(browser, URL.partner + '/');
  await signInReady(dealer);
  await signIn(dealer, 'U3');
  await dealer.getByRole('button', { name: 'Settings' }).click();
  await dealer.getByRole('button', { name: 'Edit' }).click();
  await dealer.getByLabel('Brand name').fill('TrackPro');
  await dealer.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await one<{ b: string }>("SELECT brand_name AS b FROM core.dealers WHERE id = 'DL2'")).b,
    )
    .toBe('TrackPro');
  await expect(dealer.getByRole('list', { name: 'Branded sign-in pages' })).toContainText(
    '/d/DL2/app/N003',
  );

  // the branded sign-in page shows the dealer's brand and only its customers
  const cust = await fresh(browser, URL.customer + '/d/DL2/app/N003');
  await signInReady(cust);
  await expect(cust.locator('.ui-signin__brand')).toContainText('TrackPro');
  expect(await demoNames(cust)).toBe('Company B admin');
  await signIn(cust, 'U8');
  await expect(cust).toHaveTitle('Fleet Management · TrackPro');
  await expect(cust.locator('.ui-rail .ui-logo')).toHaveText('T');
});

test('4) a customer allows support; the dealer opens their app view-only; the session is logged', async ({
  browser,
}) => {
  // the company admin allows support for 7 days (Users page of an app)
  const co = await fresh(browser, URL.customer + '/app/N004');
  await signInReady(co);
  await signIn(co, 'U4');
  await co.getByRole('button', { name: 'Users' }).click();
  await co.getByRole('button', { name: 'Allow for 7 days' }).click();
  await expect
    .poll(
      async () =>
        (
          await one<{ ok: boolean }>(
            "SELECT support_access_until = current_date + 7 AS ok FROM core.companies WHERE id = 'C1'",
          )
        ).ok,
    )
    .toBe(true);

  // the dealer starts a session
  const dealer = await fresh(browser, URL.partner + '/');
  await signInReady(dealer);
  await signIn(dealer, 'U2');
  await dealer.locator('button[data-company="C1"]').click();
  await dealer.getByLabel('App').selectOption('N004');
  await dealer.getByLabel('Reason (required)').fill('Ticket 1182 alerts');
  await dealer.getByRole('button', { name: 'Start session' }).click();
  const link = await dealer.getByTestId('support-link').getAttribute('href');

  const sup = await fresh(browser, link!);
  await expect(sup).toHaveURL(/\/app\/N004$/);
  await expect(sup.locator('.ui-supbar')).toContainText(
    'EIT Direct admin is viewing Sample Company A · GPS Vehicle Tracking · view-only · Reason: Ticket 1182 alerts',
  );

  // the link works once: a second browser (or anyone it was forwarded to) is refused
  expect(
    (
      await one<{ used: boolean }>(
        "SELECT link_opened_at IS NOT NULL AS used FROM core.support_sessions WHERE target_level = 'Company'",
      )
    ).used,
  ).toBe(true);
  const again = await fresh(browser, link!);
  await expect(again.getByText('This support link has already been used.')).toBeVisible();
  await expect(again.locator('.ui-supbar')).toHaveCount(0);
  // a refresh in the supporter's own tab is not a second use
  await sup.reload();
  await expect(sup.locator('.ui-supbar')).toBeVisible();

  // view-only: a change is refused and nothing reaches Neon
  await sup.getByRole('button', { name: 'Users' }).click();
  await sup.getByRole('button', { name: 'Turn off now' }).click();
  await expect(sup.locator('.ui-toast')).toHaveText(
    'Support sessions are view-only. Nothing was changed.',
  );
  expect(
    (
      await one<{ ok: boolean }>(
        "SELECT support_access_until IS NOT NULL AS ok FROM core.companies WHERE id = 'C1'",
      )
    ).ok,
  ).toBe(true);

  await sup.getByRole('button', { name: 'End session' }).click();
  await expect(sup.getByRole('status').filter({ hasText: 'Support session ended' })).toBeVisible();
  const log = await one<{
    target_account_id: string;
    product_id: string;
    reason: string;
    ended: boolean;
  }>(
    "SELECT target_account_id, product_id, reason, ended_at IS NOT NULL AS ended FROM core.support_sessions WHERE target_level = 'Company'",
  );
  expect(log).toEqual({
    target_account_id: 'C1',
    product_id: 'N004',
    reason: 'Ticket 1182 alerts',
    ended: true,
  });

  // the customer sees the session in their log
  await co.reload();
  await expect(co.getByRole('table', { name: 'Support sessions' })).toContainText(
    'Ticket 1182 alerts',
  );
});

test('5) a dealer allows EIT support; EIT opens the dealer console view-only', async ({
  browser,
}) => {
  const dealer = await fresh(browser, URL.partner + '/');
  await signInReady(dealer);
  await signIn(dealer, 'U2');
  await dealer.getByRole('button', { name: 'Settings' }).click();
  await dealer.getByRole('button', { name: 'Allow for 7 days' }).click();
  await expect
    .poll(
      async () =>
        (
          await one<{ ok: boolean }>(
            "SELECT support_access_until IS NOT NULL AS ok FROM core.dealers WHERE id = 'DL1'",
          )
        ).ok,
    )
    .toBe(true);

  const eit = await fresh(browser, URL.admin + '/');
  await signInReady(eit);
  await signIn(eit, 'U1');
  await eit.getByRole('button', { name: 'Dealers' }).click();
  await eit.getByRole('row', { name: /EIT Direct/ }).click();
  await eit.getByRole('button', { name: 'Open dealer console as support…' }).click();
  await eit.getByLabel('Reason (required)').fill('Pricing question');
  await eit.getByRole('button', { name: 'Start session' }).click();
  const link = await eit.getByTestId('support-link').getAttribute('href');

  const sup = await fresh(browser, link!);
  await expect(sup.locator('.ui-supbar')).toContainText('Platform admin is viewing EIT Direct');
  await expect(sup.getByRole('button', { name: 'Companies' })).toBeVisible();
  await sup.getByRole('button', { name: 'End session' }).click();
  await expect(sup.getByRole('status').filter({ hasText: 'Support session ended' })).toBeVisible();
  expect(
    (
      await one<{ n: number }>(
        "SELECT count(*) AS n FROM core.support_sessions WHERE target_level = 'Dealer' AND ended_at IS NOT NULL",
      )
    ).n,
  ).toBe(1);
});
