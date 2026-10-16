import { test, expect } from '@playwright/test';

test('Vietnamese hero switches to the brand font even when font files arrive late', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route(/\.woff2?(?:\?.*)?$/, async route => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.goto('/');
  await expect(page.locator('[data-hero-title]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // Computed font-family alone only names the requested font; inspect rendered glyphs.
  const session = await page.context().newCDPSession(page);
  await session.send('DOM.enable');
  await session.send('CSS.enable');
  const { root } = await session.send('DOM.getDocument');
  const { nodeId } = await session.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '[data-hero-title]',
  });
  const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
  console.log(
    'Hero rendered fonts:',
    fonts.map(f => ({ family: f.familyName, custom: f.isCustomFont, glyphs: f.glyphCount }))
  );
  await page.screenshot({ path: 'test-results/screenshots/hero-late-font.png' });
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.every(f => f.isCustomFont && /Be Vietnam Pro/i.test(f.familyName))).toBe(true);
  await session.detach();
});
