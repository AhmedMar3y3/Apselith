import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { CATALOG_GROUPS } from '../../src/domain/satellite/groups';
import { parseCatalog } from '../../src/domain/satellite/catalog';
import { z } from 'zod';
test.beforeEach(async ({ page }, testInfo) => {
  const time = new Date('2026-10-19T22:50:00Z');
  // Cesium gesture inertia uses Date elapsed time, which must keep advancing.
  if (testInfo.title.startsWith('keeps user zoom'))
    await page.clock.setSystemTime(time);
  else await page.clock.setFixedTime(time);
  await page.route('https://celestrak.org/**', (route) => {
    const group =
      new URL(route.request().url()).searchParams.get('GROUP') ?? 'stations';
    if (!CATALOG_GROUPS.some((item) => item.id === group)) return route.abort();
    const data = z
      .object({ records: z.unknown() })
      .parse(
        JSON.parse(
          readFileSync(`public/data/${group}.json`, 'utf8').replace(
            /^\uFEFF/,
            '',
          ),
        ),
      );
    return route.fulfill({ json: data.records });
  });
});
test('track, select, focus and control simulation time', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('APSELITH · Earth orbit explorer');
  await expect(
    page.getByRole('link', { name: 'APSELITH AN EARTH ORBIT EXPLORER' }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Search satellites' }).fill('25544');
  await page.getByRole('button', { name: /ISS \(ZARYA\).*25544/ }).click();
  await expect(page.locator('.globe-stage')).toHaveAttribute(
    'data-camera-status',
    'following',
    { timeout: 30000 },
  );
  await expect(page.locator('.globe-stage')).toHaveAttribute(
    'data-camera-target',
    '25544',
  );
  await expect(
    page.getByRole('heading', { name: 'ISS (ZARYA)' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Focus', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('.cesium-widget canvas')).toBeVisible();
  await expect(page.locator('html')).toHaveCSS(
    'background-color',
    'rgb(0, 0, 0)',
  );
  await expect(page.locator('.globe-stage')).toHaveAttribute(
    'data-tiles-ready',
    'true',
    { timeout: 30000 },
  );
  await expect(
    page.getByText('3D view unavailable', { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ahmed Mar3y' })).toHaveAttribute(
    'href',
    'https://ahmed-mar3y.space',
  );
  await expect(
    page.getByRole('link', { name: 'Help support Gaza relief' }),
  ).toHaveAttribute('href', 'https://www.pcrf.net/');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.screenshot({
    path: 'docs/screenshots/tracker.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Focus', exact: true }).click();
  await expect(page.getByRole('button', { name: /Exit Focus/ })).toBeVisible();
  await expect(page.locator('.catalog')).toHaveCount(0);
  await expect(page.locator('.details')).toHaveCount(0);
  const focused = await page.locator('.tracker-layout').boundingBox();
  expect(focused?.width).toBe(page.viewportSize()?.width);
  expect(focused?.height).toBe(page.viewportSize()?.height);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Focus', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Predicted trajectory').uncheck();
  await page.getByLabel('Predicted trajectory').check();
  await page.getByRole('button', { name: 'Step forward one minute' }).click();
  await expect(page.getByText('SIMULATED TIME', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Real time', exact: true }).click();
  await expect(page.getByText('● REAL TIME', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('persists favorites, predicts passes and experiments in the laboratory', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page
    .getByRole('button', { name: 'Save favorite', exact: true })
    .click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('button', { name: 'Remove favorite', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Calculate next 24 hours' }).click();
  await expect(page.locator('.pass-card').first()).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole('link', { name: 'Orbital laboratory' }).click();
  await expect(
    page.getByRole('heading', { name: 'Build an orbit.' }),
  ).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Semi-major axis' }).fill('12000');
  await expect(page.getByText('218.0', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/laboratory.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
for (const size of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test(`details scroll and Focus exits on ${size.width > 700 ? 'desktop' : 'phone'}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    if (size.width < 700)
      await page
        .getByRole('button', { name: 'Object details', exact: true })
        .click();
    const footnote = page.locator('.details .footnote');
    await footnote.scrollIntoViewIfNeeded();
    await expect(footnote).toBeVisible();
    if (size.width > 1150) {
      const details = await page.locator('.details').boundingBox();
      const globe = await page.locator('.visualization').boundingBox();
      if (!details || !globe) throw new Error('Missing layout columns');
      expect(Math.abs(details.height - globe.height)).toBeLessThan(2);
    }
    await page.getByRole('button', { name: 'Focus', exact: true }).click();
    await expect(
      page.getByRole('button', { name: /Exit Focus/ }),
    ).toBeVisible();
    if (size.width > 1150) {
      await expect(page.locator('.globe-stage')).toHaveAttribute(
        'data-camera-status',
        'following',
      );
      await expect(page.locator('.globe-stage')).toHaveAttribute(
        'data-tiles-ready',
        'true',
      );
      await page.screenshot({ path: 'docs/screenshots/focus.png' });
    }
    await page.getByRole('button', { name: /Exit Focus/ }).click();
    await expect(page.locator('.focus-mode')).toHaveCount(0);
    if (size.width < 700)
      await expect(
        page.getByRole('button', { name: 'Object details', exact: true }),
      ).toBeVisible();
    else await expect(page.locator('.details')).toBeVisible();
  });
}
test('explores calculated planets in the Solar System view', async ({
  page,
}) => {
  await page.goto('/solar-system');
  await expect(
    page.getByRole('heading', { name: 'Our celestial neighborhood.' }),
  ).toBeVisible();
  await expect(page.locator('.planet-list button')).toHaveCount(8);
  await page.getByRole('button', { name: 'Select Mars', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mars', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Inner planets only').check();
  await expect(
    page.getByRole('button', { name: 'Select Neptune', exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: 'docs/screenshots/solar-system.png',
    fullPage: true,
  });
});
test('mobile workspace remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Object details', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'ISS (ZARYA)' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test('switches all new groups and selects a Starlink outside the initial rendered subset', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  for (const group of CATALOG_GROUPS.filter((item) => item.id !== 'stations')) {
    const raw = z
      .object({ records: z.unknown() })
      .parse(
        JSON.parse(
          readFileSync(`public/data/${group.id}.json`, 'utf8').replace(
            /^\uFEFF/,
            '',
          ),
        ),
      );
    const records = parseCatalog(raw.records).satellites;
    const satellite = group.id === 'starlink' ? records.at(-1) : records[0];
    if (!satellite) throw new Error('Fixture has no satellite');
    await page
      .getByRole('combobox', { name: 'Satellite group' })
      .selectOption(group.id);
    await page
      .getByRole('textbox', { name: 'Search satellites' })
      .fill(String(satellite.NORAD_CAT_ID));
    await page
      .getByRole('button', {
        name: new RegExp(`NORAD ${satellite.NORAD_CAT_ID}`),
      })
      .click();
    await expect(
      page.getByRole('heading', { name: satellite.OBJECT_NAME, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Focus', exact: true }),
    ).toBeEnabled();
  }
});

test('keeps user zoom and orbit controls while following and in Focus', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const modulePath = '/src/features/globe/follow-camera.ts';
    const { FollowCamera } = (await import(
      modulePath
    )) as typeof import('../../src/features/globe/follow-camera');
    const original = FollowCamera.prototype.update;
    FollowCamera.prototype.update = function (camera, target) {
      original.call(this, camera, target);
      document.documentElement.dataset.testCameraPose = JSON.stringify({
        range: Math.hypot(
          camera.position.x,
          camera.position.y,
          camera.position.z,
        ),
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        directionMagnitude: Math.hypot(
          camera.direction.x,
          camera.direction.y,
          camera.direction.z,
        ),
      });
    };
  });
  await page.getByRole('textbox', { name: 'Search satellites' }).fill('25544');
  await page.getByRole('button', { name: /ISS \(ZARYA\).*25544/ }).click();
  await expect(page.locator('.globe-stage')).toHaveAttribute(
    'data-camera-status',
    'following',
    { timeout: 30000 },
  );
  const pose = async () =>
    JSON.parse(
      (await page.locator('html').getAttribute('data-test-camera-pose')) ??
        '{}',
    ) as { range: number; x: number; y: number; z: number };
  for (const focus of [false, true]) {
    if (focus) {
      await page.getByRole('button', { name: 'Focus', exact: true }).click();
      await expect(page.locator('.globe-stage')).toHaveAttribute(
        'data-camera-status',
        'following',
      );
    }
    await expect.poll(async () => (await pose()).range).toBeGreaterThan(0);
    const canvas = page.locator('.cesium-widget canvas');
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Missing globe canvas');
    const x = bounds.x + bounds.width * 0.55;
    const y = bounds.y + bounds.height * 0.55;
    await page.mouse.move(x, y);
    const before = await pose();
    await page.mouse.wheel(0, -450);
    await expect
      .poll(async () => (await pose()).range)
      .toBeLessThan(before.range * 0.95);
    await page.mouse.wheel(0, 750);
    await expect
      .poll(async () => (await pose()).range)
      .toBeGreaterThan(before.range * 1.05);
    const zoomed = await pose();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 100, y + 45, { steps: 15 });
    await page.mouse.up();
    await expect
      .poll(async () => {
        const after = await pose();
        return Math.hypot(
          after.x - zoomed.x,
          after.y - zoomed.y,
          after.z - zoomed.z,
        );
      })
      .toBeGreaterThan(100000);
    // Let inertia settle, then confirm later tracking updates retain the chosen pose.
    await page.waitForTimeout(1800);
    const settled = await pose();
    await page.waitForTimeout(1000);
    const retained = await pose();
    expect(
      Math.abs(retained.range - settled.range) / settled.range,
    ).toBeLessThan(0.02);
    expect(Math.abs(retained.range - 3000000)).toBeGreaterThan(100000);
  }
});
