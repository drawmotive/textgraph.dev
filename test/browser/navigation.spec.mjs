import { test, expect } from '@playwright/test';

test('home, documentation, and playground omit the issue banner', async ({ page }) => {
  for (const route of ['/', '/intro/what-is-textgraph', '/playground']) {
    await page.goto(route);
    await expect(page.getByRole('complementary', { name: 'TextGraph issues and feedback' })).toHaveCount(0);
    await expect(page.locator('.VPNavBar').getByRole('link', { name: 'Report an issue' })).toBeVisible();
  }
});

test('desktop navigation exposes all controls without the extra menu', async ({ page }) => {
  for (const route of ['/', '/intro/what-is-textgraph', '/playground']) {
    await page.goto(route);
    const nav = page.locator('.VPNavBar');
    const appearance = nav.getByRole('switch');
    const github = nav.getByRole('link', { name: 'github', exact: true });
    for (const width of [768, 960, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const controls = [
        nav.getByRole('link', { name: 'TextGraph', exact: true }),
        nav.getByRole('button', { name: 'Search', exact: true }),
        nav.getByRole('link', { name: 'Docs', exact: true }),
        nav.getByRole('link', { name: 'Playground', exact: true }),
        nav.getByRole('link', { name: 'Report an issue' }), appearance, github,
      ];
      let previousRight = 0;
      for (const control of controls) {
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(previousRight);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        previousRight = box.x + box.width;
      }
      await expect(nav.getByRole('button', { name: 'extra navigation' })).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await expect(github).toHaveAttribute('href', 'https://github.com/drawmotive/textgraph');
    // The theme class is the visible state; a hydrated switch can still carry
    // the static HTML's light-mode aria value after restoring a saved theme.
    await expect(appearance).toHaveAttribute('title', /Switch to (light|dark) theme/);
    const wasDark = await page.locator('html').evaluate(element => element.classList.contains('dark'));
    await appearance.click();
    if (wasDark) await expect(page.locator('html')).not.toHaveClass(/dark/);
    else await expect(page.locator('html')).toHaveClass(/dark/);
  }
});

test('mobile navigation retains access to appearance and GitHub', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'mobile navigation' }).click();
  await expect(page.getByRole('switch')).toBeVisible();
  await expect(page.getByRole('link', { name: 'github', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
