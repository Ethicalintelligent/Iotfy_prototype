// Legacy parity checklist (docs/LEGACY_PARITY.md): role switch re-reads, the avatar's Neon dot,
// breadcrumbs on detail pages, End subscription saves at once, and package apps show each asset
// only the features of members that fit its asset type. Test branch only; puts things back.
import { expect, test } from '@playwright/test';
import { URL, one, openUserMenu, pageTitle, signIn, signInReady, sql } from './helpers';

const NAME = 'Indoor People Tracking';
test.afterAll(async () => {
  await sql('UPDATE core.nodes SET name = $1 WHERE id = $2', [NAME, 'N014']);
  await sql("UPDATE core.subscriptions SET status = 'Active' WHERE id = 'SUB015'");
});

test('switching role re-reads Neon: another change shows without leaving the page', async ({
  page,
}) => {
  await page.goto(URL.customer + '/');
  await signInReady(page);
  await signIn(page, 'U4'); // Company A admin → My apps
  await expect(page.locator('.ui-apptile b')).toContainText([NAME]);
  await sql('UPDATE core.nodes SET name = $1 WHERE id = $2', [`${NAME} (renamed)`, 'N014']);
  await openUserMenu(page);
  await page.getByRole('menuitem', { name: /Company A fleet manager/ }).click();
  await expect(page.locator('.ui-apptile b')).toContainText([`${NAME} (renamed)`]);
});

test('the avatar dot shows the live Neon connection', async ({ page }) => {
  await page.goto(URL.partner + '/');
  await signInReady(page);
  await signIn(page, 'U2');
  const account = page.getByRole('button', { name: 'Account' });
  await expect(account).toHaveAttribute('data-neon', 'live');
  await expect(account).toHaveAttribute('title', /Live from Neon/);
});

test('detail pages show a breadcrumb back to the list', async ({ page }) => {
  await page.goto(URL.partner + '/');
  await signInReady(page);
  await signIn(page, 'U2');
  await page.goto(URL.partner + '/companies/C1');
  await expect(pageTitle(page)).toHaveText('Sample Company A');
  await page.getByRole('button', { name: '← Companies' }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(pageTitle(page)).toHaveText('Companies');
});

test('End subscription saves at once', async ({ page }) => {
  await page.goto(URL.partner + '/');
  await signInReady(page);
  await signIn(page, 'U2');
  await page.goto(URL.partner + '/assets/A1');
  await expect(pageTitle(page)).toHaveText('Truck 14');
  await page
    .locator('[data-sub="SUB015"]')
    .getByRole('button', { name: 'End subscription' })
    .click();
  await expect
    .poll(
      async () =>
        (await one<{ s: string }>("SELECT status AS s FROM core.subscriptions WHERE id = 'SUB015'"))
          .s,
    )
    .toBe('Ended');
  await expect(page.locator('[data-sub="SUB015"]')).toHaveCount(0);
});

test('a package shows each asset only the features of members that fit its type', async ({
  page,
}) => {
  await page.goto(URL.customer + '/app/N051');
  await signInReady(page);
  await signIn(page, 'U19'); // Al Bina: workers, a pickup, a crane zone
  await page.locator('.ui-rail .ui-rail__item', { hasText: /^Devices & features$/ }).click();
  const card = (name: string) =>
    page.locator('.ui-card').filter({ has: page.getByText(name, { exact: true }) });
  const worker = card('Worker · Abdullah');
  await expect(worker).toContainText('Contact tracing'); // Indoor People Tracking
  await expect(worker).not.toContainText('Overspeed alerts'); // vehicle only
  await expect(worker).not.toContainText('Live video view'); // video only
  const pickup = card('Site pickup 3');
  await expect(pickup).toContainText('Overspeed alerts');
  await expect(pickup).not.toContainText('Contact tracing');
  const zone = card('Block B crane zone');
  await expect(zone).toContainText('Live video view');
  await expect(zone).not.toContainText('Overspeed alerts');
});
