import { test, expect } from '@playwright/test';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
]) {
  test(`scrolling follows the route at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const track = page.locator('[data-demo-map]');
    const top = await track.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
    const height = await track.evaluate(el => el.getBoundingClientRect().height);
    const positions: { x: number; y: number }[] = [];
    for (const progress of [0.15, 0.4, 0.6, 0.85, 0.4]) {
      await page.evaluate(
        y => window.scrollTo({ top: y, behavior: 'instant' }),
        top - viewport.height + progress * (viewport.height + height)
      );
      await page.waitForTimeout(250);
      const point = await page.locator('[data-marker]').evaluate(el => {
        const marker = el as SVGGElement;
        const matrix = marker.transform.baseVal.consolidate()!.matrix;
        const route = document.querySelector<SVGPathElement>('[data-demo-route]')!;
        let distance = Infinity;
        for (let i = 0; i <= route.getTotalLength(); i += 0.5) {
          const p = route.getPointAtLength(i);
          distance = Math.min(distance, Math.hypot(matrix.e - p.x, matrix.f - p.y));
        }
        const rendered = document.querySelector('[data-demo-bus]')!.getBoundingClientRect();
        const center = new DOMPoint(matrix.e, matrix.f).matrixTransform(route.getScreenCTM()!);
        const renderedDistance = Math.hypot(
          rendered.x + rendered.width / 2 - center.x,
          rendered.y + rendered.height / 2 - center.y
        );
        return { x: matrix.e, y: matrix.f, distance, renderedDistance };
      });
      expect(point.distance).toBeLessThan(1);
      expect(point.renderedDistance).toBeLessThan(1);
      positions.push(point);
      if (progress === 0.6)
        await page.screenshot({ path: testInfo.outputPath('map-mid-route.png') });
    }
    expect(positions[0].y - positions[3].y).toBeGreaterThan(100);
    expect(positions[3].x - positions[0].x).toBeGreaterThan(150);
    expect(positions[4].x).toBeCloseTo(positions[1].x, 0);
    expect(positions[4].y).toBeCloseTo(positions[1].y, 0);
  });
}

test('reduced motion keeps the mobile bus stationary on the route', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('[data-demo-map]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-marker]')).toHaveAttribute('transform', 'translate(80 260)');
  await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'instant' }));
  await page.waitForTimeout(250);
  await expect(page.locator('[data-marker]')).toHaveAttribute('transform', 'translate(80 260)');
});
