// Step 12: each product's sign-in page shows its scene; reduced motion freezes the animations.
import { expect, test } from '@playwright/test';
import { URL, signInReady } from './helpers';

test('product sign-in pages show their scene', async ({ page }) => {
  for (const [id, scene] of [
    ['N004', 'vehicle'],
    ['N009', 'vehicle'], // edition: its base's scene
    ['N051', 'construct'],
    ['N020', 'atmtrack'],
    ['N052', 'health'],
  ]) {
    await page.goto(`${URL.customer}/app/${id}`);
    await signInReady(page);
    const svg = page.locator(`[data-scene="${scene}"] svg[role="img"]`);
    await expect(svg, id).toBeVisible();
    expect(await svg.evaluate((s: SVGSVGElement) => s.animationsPaused()), id).toBe(false);
    const chips = page.getByRole('list', { name: 'Features' }).getByRole('listitem');
    await expect(chips.first(), id).toBeVisible();
    expect(await chips.count(), id).toBeLessThanOrEqual(6);
  }
});

test('reduced motion: the scene is still, and moves again when the setting is off', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${URL.customer}/app/N004`);
  await signInReady(page);
  const svg = page.locator('[data-scene="vehicle"] svg');
  await expect(svg).toBeVisible();
  expect(await svg.evaluate((s: SVGSVGElement) => s.animationsPaused())).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => svg.evaluate((s: SVGSVGElement) => s.animationsPaused())).toBe(false);
});
