import { expect, test } from '@playwright/test';

const PAGES = [
  '/',
  '/educators',
  '/contact',
  '/privacy',
  '/terms',
  '/support/delete-account',
];

test.describe('every page a parent can reach', () => {
  for (const path of PAGES) {
    test(`${path} answers, names itself and says what it is`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page).toHaveTitle(/early roots/i);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/);
    });

    test(`${path} fits the width of a phone`, async ({ page }) => {
      await page.goto(path);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );

      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});

test('the footer leads to every page the stores require', async ({ page }) => {
  await page.goto('/');

  for (const path of ['/privacy', '/terms', '/contact', '/support/delete-account']) {
    await expect(page.locator(`footer a[href="${path}"]`).first()).toBeVisible();
  }
});

test('a page that does not exist says so rather than failing', async ({ page }) => {
  const response = await page.goto('/no-such-page');

  expect(response?.status()).toBe(404);
});

test('the privacy page says voice recordings stay on the device', async ({ page }) => {
  await page.goto('/privacy');

  await expect(page.getByText(/recordings are made by grown-ups and stay on the device/i)).toBeVisible();
  await expect(page.getByText(/voice features are deferred/i)).toHaveCount(0);
});

test('the privacy page lists what the app keeps for a child, and says no times are kept', async ({ page }) => {
  await page.goto('/privacy');

  await expect(page.getByText(/which books have been read and finished, badges earned/i)).toBeVisible();
  await expect(page.getByText(/we do not keep a record of when your child used the app/i)).toBeVisible();
});

test('the privacy page names every company that receives a family\'s data', async ({ page }) => {
  await page.goto('/privacy');

  for (const processor of [/RevenueCat/, /Sentry/, /Google Cloud/]) {
    await expect(page.getByText(processor).first()).toBeVisible();
  }
});

test('the privacy page says account data is held in the EU', async ({ page }) => {
  await page.goto('/privacy');

  await expect(page.getByText(/stored in the European Union/i)).toBeVisible();
});

test('the privacy page keeps proof of consent for three years after deletion, and no longer promises seven', async ({ page }) => {
  await page.goto('/privacy');

  await expect(page.getByText(/for 3 years after you delete your account/i)).toBeVisible();
  await expect(page.getByText(/7 years/)).toHaveCount(0);
});

test('the contact page offers a way to reach a person', async ({ page }) => {
  await page.goto('/contact');

  await expect(page.getByText(/@earlyroots\.(co\.uk|com)/).first()).toBeVisible();
});

test('every image is either described or marked as decoration', async ({ page }) => {
  await page.goto('/');

  const undescribed = await page.evaluate(() =>
    Array.from(document.images)
      .filter((image) => !image.hasAttribute('alt') && image.getAttribute('role') !== 'presentation')
      .map((image) => image.currentSrc || image.src)
  );

  expect(undescribed).toEqual([]);
});
