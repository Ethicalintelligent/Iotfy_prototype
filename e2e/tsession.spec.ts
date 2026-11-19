// legacy/tests/tsession.js: one session across "My apps" and every product app; the not-in-
// your-apps page keeps you signed in; signing out returns to the sign-in page you came in on.
import { expect, test } from '@playwright/test';
import { URL, openUserMenu, pageTitle, signIn, signInReady, signInTitle, signOut } from './helpers';

test('one session for My apps and every product; sign-out returns to the entry page', async ({
  page,
}) => {
  // 1 sign in on the common page → My apps
  await page.goto(URL.customer + '/');
  await signInReady(page);
  await signIn(page, 'U4');
  await expect(page).toHaveURL(/\/apps/);
  await expect(pageTitle(page)).toHaveText('My apps');

  // 2 open GPS Vehicle Tracking
  await page.locator('button[data-app="N004"]').click();
  await expect(page).toHaveURL(/\/app\/N004$/);
  await expect(pageTitle(page)).toHaveText('Dashboard');

  // 3 switch to HealthSafe from the user menu
  await openUserMenu(page);
  await page.getByRole('menuitem', { name: /HealthSafe/ }).click();
  await expect(page).toHaveURL(/\/app\/N052$/);

  // 4 All my apps
  await openUserMenu(page);
  await page.getByRole('menuitem', { name: /All my apps/ }).click();
  await expect(page).toHaveURL(/\/apps$/);

  // 5 a product the company doesn't have: still signed in, told so
  await page.goto(URL.customer + '/app/N003');
  await expect(page.getByTestId('noapp')).toHaveText(
    "Sample Company A doesn't have Fleet Management",
  );

  // 6 pick one of my apps
  await page.locator('button[data-app="N004"]').click();
  await expect(page).toHaveURL(/\/app\/N004$/);

  // 7 sign out inside the app → the common sign-in page (where this session started)
  await signOut(page);
  await expect(page).toHaveURL(URL.customer + '/');
  await expect(signInTitle(page)).toHaveText('Sign in to IoTIFY Customer Apps');

  // 9 sign in on HealthSafe's own page → straight into HealthSafe
  await page.goto(URL.customer + '/app/N052');
  await signInReady(page);
  await expect(signInTitle(page)).toHaveText('Sign in to HealthSafe');
  await signIn(page, 'U4');
  await expect(page).toHaveURL(/\/app\/N052$/);
  await expect(pageTitle(page)).toHaveText('Dashboard');

  // 10 the common page now shows My apps (same session)
  await page.goto(URL.customer + '/');
  await expect(page).toHaveURL(/\/apps$/);
  await expect(pageTitle(page)).toHaveText('My apps');
});
