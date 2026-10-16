import { test, expect } from '@playwright/test';

test('scrolling moves the demo bus along the curved route in both directions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const track = page.locator('[data-track]');
  const top = await track.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
  const height = await track.evaluate(el => el.getBoundingClientRect().height);
  const positions: { x: number; y: number }[] = [];
  for (const progress of [0.15, 0.4, 0.6, 0.85, 0.4]) {
    await page.evaluate(
      y => window.scrollTo({ top: y, behavior: 'instant' }),
      top - 900 + progress * (900 + height)
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
      return { x: matrix.e, y: matrix.f, distance };
    });
    expect(point.distance).toBeLessThan(1);
    positions.push(point);
  }
  expect(positions[0].y - positions[3].y).toBeGreaterThan(100);
  expect(positions[3].x - positions[0].x).toBeGreaterThan(150);
  expect(positions[4].x).toBeCloseTo(positions[1].x, 0);
  expect(positions[4].y).toBeCloseTo(positions[1].y, 0);
});
