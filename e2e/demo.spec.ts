// Step 13: the published-demo build. Builds the customer apps as one HTML file (claude-mcp, test
// branch), serves it at an https address and stands in for claude.ai's Neon connector: SQL runs on
// the test branch and replies come back in the connector's real shape ({ data: [{ rows }] }, with
// numbers as text). Then signs in and opens a product, as a demo visitor would.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createRunner } from '../packages/data/server/runner.js';
import { pageTitle, signInReady, testDatabaseUrl } from './helpers';

const ROOT = path.resolve(import.meta.dirname, '..');
const HTML = path.join(ROOT, 'apps/customer-apps/dist-demo/index.html');
const TEST_BRANCH = 'br-plain-voice-bdud1mxw';

test.beforeAll(() => {
  execSync('pnpm --filter @iotify/customer-apps build:demo', {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, VITE_NEON_BRANCH_CUSTOMER: TEST_BRANCH },
  });
});

const asText = (rows: Record<string, unknown>[]) =>
  rows.map((r) =>
    Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? String(v) : v]),
    ),
  );

test('the demo file signs in and shows a product through the connector', async ({ page }) => {
  const html = fs.readFileSync(HTML, 'utf8');
  expect(html).toContain(TEST_BRANCH);
  const runner = createRunner(testDatabaseUrl());
  const calls: { tool: string; branch: string }[] = [];

  await page.exposeFunction(
    '__neon',
    async (tool: string, args: { branch_id: string; sql_statements: string[] }) => {
      calls.push({ tool, branch: args.branch_id });
      const [role, ...rest] = args.sql_statements;
      expect(role).toBe('SET LOCAL ROLE iotify_prototyper');
      const deferred = rest[0] === 'SET CONSTRAINTS ALL DEFERRED';
      const mine = deferred ? rest.slice(1) : rest;
      const results = (await runner.transaction(mine.map((sql) => ({ sql })))) as Record<
        string,
        unknown
      >[][];
      return {
        data: [
          { rows: [] },
          ...(deferred ? [{ rows: [] }] : []),
          ...results.map((rows) => ({ rows: asText(rows), truncated: false })),
        ],
      };
    },
  );
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.claude = {
      use: async () => ({
        callTool: (_server: string, tool: string, args: unknown) =>
          (w.__neon as (t: string, a: unknown) => Promise<unknown>)(tool, args),
      }),
    };
  });
  await page.route('https://demo.test/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/html', body: html }),
  );

  await page.goto('https://demo.test/#/app/N051');
  await signInReady(page);
  await expect(page.locator('[data-scene="construct"] svg')).toBeVisible();
  await page.locator('button[data-user]').first().click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/#\/app\/N051$/);
  await page.locator('.ui-rail .ui-rail__item', { hasText: /^Workers on site$/ }).click();
  await expect(pageTitle(page)).toHaveText('Workers on site');
  await page.locator('.ui-rail .ui-rail__item', { hasText: /^Assets$/ }).click();
  await expect(page.locator('.ui-page table tbody tr').first()).toBeVisible();
  await page.locator('.ui-rail .ui-rail__item', { hasText: /^My subscription$/ }).click();
  await expect(page.locator('.ui-page')).not.toContainText(/NaN|undefined/);

  expect(calls.length).toBeGreaterThan(0);
  expect(new Set(calls.map((c) => c.branch))).toEqual(new Set([TEST_BRANCH]));
  expect(new Set(calls.map((c) => c.tool))).toEqual(new Set(['run_sql_transaction']));
});
