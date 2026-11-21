// legacy/tests/tsignout.js: signing out returns to the sign-in page the user came in through.
import { expect, test } from '@playwright/test';
import { URL, openUserMenu, pageTitle, signIn, signInReady, signInTitle, signOut } from './helpers';

test('A) a one-app company goes straight in; sign-out returns to the common page', async ({
  page,
}) => {
  await page.goto(URL.customer + '/');
  await signInReady(page);
  await signIn(page, 'U7');
  await expect(page).toHaveURL(/\/app\/N009$/);
  await signOut(page);
  await expect(page).toHaveURL(URL.customer + '/');
  await expect(signInTitle(page)).toHaveText('Sign in to IoTIFY Customer Apps');
});

test('B) open one app, switch to another, sign out → the common page', async ({ page }) => {
  await page.goto(URL.customer + '/');
  await signInReady(page);
  await signIn(page, 'U4');
  await page.locator('button[data-app="N004"]').click();
  await openUserMenu(page);
  await page.getByRole('menuitem', { name: /HealthSafe/ }).click();
  await expect(page).toHaveURL(/\/app\/N052$/);
  await signOut(page);
  await expect(page).toHaveURL(URL.customer + '/');
  await expect(signInTitle(page)).toHaveText('Sign in to IoTIFY Customer Apps');
});

test('C) signed in on the AIS 140 page → sign-out returns to the AIS 140 page', async ({
  page,
}) => {
  await page.goto(URL.customer + '/app/N009');
  await signInReady(page);
  await signIn(page, 'U7');
  await expect(pageTitle(page)).toHaveText('Dashboard');
  await signOut(page);
  await expect(page).toHaveURL(URL.customer + '/app/N009');
  await expect(signInTitle(page)).toHaveText('Sign in to GPS AIS 140 Solution (India)');
});

test('D) signed in on HealthSafe, went to My apps, signed out there → back to HealthSafe', async ({
  page,
}) => {
  await page.goto(URL.customer + '/app/N052');
  await signInReady(page);
  await signIn(page, 'U4');
  await expect(pageTitle(page)).toHaveText('Dashboard');
  await page.goto(URL.customer + '/');
  await expect(page).toHaveURL(/\/apps$/);
  await signOut(page);
  await expect(page).toHaveURL(URL.customer + '/app/N052');
  await expect(signInTitle(page)).toHaveText('Sign in to HealthSafe');
});
