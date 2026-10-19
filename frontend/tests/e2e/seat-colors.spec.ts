import { test, expect } from '@playwright/test';

test('holding a seat preserves free colors and marks the owners seat yellow', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /^Hành khách / }).click();
  await page.goto('/booking/t-1-1-0');
  const own = page.getByRole('button', { name: 'Ghế 01', exact: true });
  const free = page.getByRole('button', { name: 'Ghế 02', exact: true });
  await expect(free).toBeEnabled();
  const color = await free.evaluate(el => getComputedStyle(el).backgroundColor);
  await own.click();
  await expect(own).toHaveAttribute('data-seat-state', 'selected');
  await page.getByRole('button', { name: 'ĐẶT CHỖ', exact: true }).click();
  await expect(page.getByText('Chỗ đang được giữ cho bạn')).toBeVisible();
  await expect(free).toBeDisabled();
  await expect(free).toHaveCSS('background-color', color);
  await expect(own).toHaveCSS('background-color', 'rgb(254, 243, 199)');
  await page.reload();
  await expect(own).toHaveCSS('background-color', 'rgb(254, 243, 199)');
  await expect(free).toHaveCSS('background-color', color);
  await page.screenshot({ path: 'test-results/screenshots/seat-hold-colors.png' });
});

test('long route codes do not overlap the trip title and Vietnamese uses the bundled font', async ({
  page,
}) => {
  await page.goto('/trips');
  await page.getByRole('link', { name: 'Xem chuyến' }).first().waitFor();
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('smartbus.demo.v1')!);
    db.routes.forEach((r: { code: string; name: string }) => {
      r.code = 'SM125123C';
      r.name = 'Đại học ICTU · Mỹ Đình';
    });
    localStorage.setItem('smartbus.demo.v1', JSON.stringify(db));
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    await page.reload();
    const code = page.getByText('SM125123C', { exact: true }).first();
    await code.waitFor();
    await page.evaluate(() => document.fonts.ready);
    const metrics = await code.evaluate(el => {
      const box = el.getBoundingClientRect();
      const title = el.parentElement!.querySelector('h3')!.getBoundingClientRect();
      return { contained: el.scrollWidth <= el.clientWidth, separated: box.right < title.left };
    });
    expect(metrics.contained).toBe(true);
    expect(metrics.separated).toBe(true);
    await page.screenshot({ path: `test-results/screenshots/trip-long-code-${width}.png` });
  }
  const session = await page.context().newCDPSession(page);
  await session.send('DOM.enable');
  await session.send('CSS.enable');
  const { root } = await session.send('DOM.getDocument');
  const { nodeId } = await session.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: 'article h3',
  });
  const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.every(f => f.isCustomFont && /Be Vietnam Pro/i.test(f.familyName))).toBe(true);
  await session.detach();
});
