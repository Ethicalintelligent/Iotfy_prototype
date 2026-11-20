// Helpers for the admin console tests (legacy tedit / trec / tcross).
import { expect, type Browser, type Page } from '@playwright/test';
import { URL, signIn, signInReady, sql } from './helpers';

/** A fresh browser (own session) signed in to the admin console as the platform admin. */
export async function adminPage(browser: Browser, path = '/tree'): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(URL.admin + '/');
  await signInReady(page);
  await signIn(page, 'U1');
  await expect(page).toHaveURL(/\/tree/);
  if (path !== '/tree') await page.goto(URL.admin + path);
  return page;
}

/** The record card (the last card on the page). */
export const recordCard = (page: Page) =>
  page
    .locator('.ui-page .ui-card')
    .filter({ has: page.getByRole('button', { name: /^(Edit|Cancel|Done)$/ }) })
    .first();

/** Removes rows these tests create (on the test branch). */
export async function cleanupAdminTests() {
  await sql("DELETE FROM core.nodes WHERE name LIKE 'REC-%'");
  await sql("DELETE FROM core.interfaces WHERE name LIKE 'CROSS-%'");
}
