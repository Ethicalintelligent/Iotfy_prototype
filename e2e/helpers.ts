// Shared helpers for the browser tests.
import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { createRunner } from '../packages/data/server/runner.js';

export const URL = {
  admin: 'http://localhost:6173',
  partner: 'http://localhost:6174',
  customer: 'http://localhost:6175',
};

/** The test branch's connection string. Refuses anything that looks like the main database. */
export function testDatabaseUrl(): string {
  const env = path.resolve(import.meta.dirname, '..', '.env.local');
  if (fs.existsSync(env)) process.loadEnvFile(env);
  const test = (process.env.TEST_DATABASE_URL || '').trim();
  const main = (process.env.DATABASE_URL || '').trim();
  if (!test)
    throw new Error(
      'TEST_DATABASE_URL is empty in .env.local. Tests only run against a Neon test branch.',
    );
  const host = (u: string) => {
    try {
      return new globalThis.URL(u).hostname;
    } catch {
      return '';
    }
  };
  if (main && (test === main || host(test) === host(main)))
    throw new Error(
      'TEST_DATABASE_URL points at the same database as DATABASE_URL. Use a separate Neon test branch.',
    );
  return test;
}

let runner: ReturnType<typeof createRunner> | null = null;
/** SQL on the test branch (as iotify_prototyper), for setting up and checking. */
export async function sql<R = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<R[]> {
  runner ??= createRunner(testDatabaseUrl());
  return (await runner.query(text, params)) as R[];
}
export async function one<R = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<R> {
  return (await sql<R>(text, params))[0]!;
}

/** Puts back everything these tests change on the test branch. */
export async function resetTestData() {
  await runner_tx([
    "UPDATE core.dealers SET reseller_type = 'Reseller', brand_name = NULL, brand_color = NULL, brand_logo = NULL, support_access_until = NULL",
    'UPDATE core.companies SET support_access_until = NULL',
    'DELETE FROM core.support_sessions',
  ]);
}
async function runner_tx(statements: string[]) {
  runner ??= createRunner(testDatabaseUrl());
  await runner.transaction(statements.map((s) => ({ sql: s })));
}

/** Clicks a demo account on a sign-in page, then Sign in. */
export async function signIn(page: Page, userId: string) {
  await page.locator(`button[data-user="${userId}"]`).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
/** Types an email (any password) and signs in: for accounts a page doesn't list. */
export async function signInWithEmail(page: Page, email: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('x');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
export async function openUserMenu(page: Page) {
  await page.getByRole('button', { name: 'Account' }).click();
}
export async function signOut(page: Page) {
  await openUserMenu(page);
  await page.getByRole('menuitem', { name: /Sign out/ }).click();
}
/** Waits until the sign-in form (with its demo accounts) is ready. */
export async function signInReady(page: Page) {
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.locator('.ui-demoacct, .ui-loading').first()).toBeVisible();
  await expect(page.locator('.ui-loading')).toHaveCount(0);
}
export const pageTitle = (page: Page) => page.locator('.ui-ph__title');
export const signInTitle = (page: Page) => page.locator('form h2');
export const demoNames = async (page: Page) =>
  (await page.locator('.ui-demoacct b').allTextContents()).join(', ');
