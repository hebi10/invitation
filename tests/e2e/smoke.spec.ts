import { expect, test } from '@playwright/test';

test.describe('static hosting smoke', () => {
  test('firebase-test route is not exposed in production output', async ({ page }) => {
    const response = await page.goto('/firebase-test/');
    expect(response).not.toBeNull();
    expect(response?.status()).toBe(404);
  });

  test('arbitrary memory slug does not resolve', async ({ page }) => {
    const response = await page.goto('/memory/this-route-should-not-exist/');
    expect(response).not.toBeNull();
    expect(response?.status()).toBe(404);
  });
});

test.describe('emulator-backed flows', () => {
  const publicPageSlug = process.env.E2E_PUBLIC_PAGE_SLUG;
  const privateMemorySlug = process.env.E2E_PRIVATE_MEMORY_SLUG;
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;

  test('public invitation page loads when seeded data exists', async ({ page }) => {
    test.skip(!publicPageSlug, 'Requires E2E_PUBLIC_PAGE_SLUG and seeded emulator data.');
    await page.goto(`/${publicPageSlug}/`);
    await expect(page.locator('body')).not.toContainText('This page could not be found.');
  });

  test('private memory page is not readable without admin session', async ({ page }) => {
    test.skip(!privateMemorySlug, 'Requires E2E_PRIVATE_MEMORY_SLUG and seeded emulator data.');
    await page.goto(`/memory/${privateMemorySlug}/`);
    await expect(page.getByText('This page could not be found.')).toBeVisible();
  });

  test('admin dashboard login works with seeded admin user', async ({ page }) => {
    test.skip(!(adminEmail && adminPassword), 'Requires E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.');
    await page.goto('/admin/');
    await page.getByLabel('Email').fill(adminEmail ?? '');
    await page.getByLabel('Password').fill(adminPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page.getByText('운영 대시보드')).toBeVisible();
  });
});
