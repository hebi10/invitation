import { expect, type Page, test } from '@playwright/test';

const WIZARD_THEME_STEP_INDEX = 0;
const WIZARD_IMAGES_STEP_INDEX = 6;

async function loginAsAdmin(page: Page, email: string, password: string) {
  await page.goto('/admin/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByText('운영 대시보드')).toBeVisible();
}

async function moveToWizardStep(page: Page, stepIndex: number) {
  const bullets = page.locator('.swiper-pagination-bullet');

  await expect(bullets.nth(stepIndex)).toBeVisible();
  await bullets.nth(stepIndex).click();
  await expect(bullets.nth(stepIndex)).toHaveClass(/swiper-pagination-bullet-active/);
}

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

  test('wizard tier downgrade trims gallery images to standard limit', async ({ page }) => {
    test.skip(
      !(publicPageSlug && adminEmail && adminPassword),
      'Requires E2E_PUBLIC_PAGE_SLUG, E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.'
    );

    await loginAsAdmin(page, adminEmail ?? '', adminPassword ?? '');

    await page.goto(`/page-wizard/${publicPageSlug}/`);

    const activeSlide = page.locator('.swiper-slide-active');
    await expect(activeSlide.getByRole('heading', { name: '디자인과 상품 선택' })).toBeVisible();

    await activeSlide.getByRole('button', { name: /현재 서비스/ }).click();
    await activeSlide.locator('button[aria-pressed]', { hasText: 'PREMIUM' }).click();
    await expect(activeSlide.getByRole('button', { name: /현재 서비스/ })).toContainText('PREMIUM');

    await moveToWizardStep(page, WIZARD_IMAGES_STEP_INDEX);
    await expect(activeSlide.getByRole('heading', { name: '사진' })).toBeVisible();

    const gallerySection = activeSlide.locator('section', { hasText: '갤러리 이미지' });
    const deleteButtons = gallerySection.getByRole('button', { name: '삭제' });

    while ((await deleteButtons.count()) > 0) {
      await deleteButtons.first().click();
    }

    const addButton = gallerySection.getByRole('button', { name: '주소 추가' });
    for (let index = 0; index < 7; index += 1) {
      await addButton.click();
    }

    const imageUrlInputs = gallerySection.getByLabel('이미지 주소');
    await expect(imageUrlInputs).toHaveCount(7);

    for (let index = 0; index < 7; index += 1) {
      await imageUrlInputs.nth(index).fill(`https://example.com/e2e-gallery-${index + 1}.jpg`);
    }

    await moveToWizardStep(page, WIZARD_THEME_STEP_INDEX);
    await expect(activeSlide.getByRole('heading', { name: '디자인과 상품 선택' })).toBeVisible();

    await activeSlide.getByRole('button', { name: /현재 서비스/ }).click();
    await activeSlide.locator('button[aria-pressed]', { hasText: 'STANDARD' }).click();
    await expect(activeSlide.getByRole('button', { name: /현재 서비스/ })).toContainText('STANDARD');

    await moveToWizardStep(page, WIZARD_IMAGES_STEP_INDEX);
    await expect(activeSlide.getByRole('heading', { name: '사진' })).toBeVisible();
    await expect(gallerySection.getByLabel('이미지 주소')).toHaveCount(6);
    await expect(gallerySection).toContainText('최대 6장까지 등록할 수 있습니다.');
  });
});
