#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';
import sharp from 'sharp';

const baseUrl = 'https://invite.msgnote.kr';
const sampleSlug = 'shin-minje-kim-hyunji';
const photoOrigin = 'https://firebasestorage.googleapis.com';
const photoFolder = `/wedding-images/${sampleSlug}/`;
const themes = ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional'];
const viewport = { width: 390, height: 720 };
const deviceScaleFactor = 2;
const outputDirectory = path.resolve('artifacts/theme-previews');
await fs.mkdir(outputDirectory, { recursive: true });

function isApprovedPhoto(url) {
  return url.origin === photoOrigin && decodeURIComponent(url.pathname).includes(photoFolder);
}

const browser = await chromium.launch({ headless: true });
const report = {
  source: 'Approved public wedding sample',
  slug: sampleSlug,
  viewport: { ...viewport, deviceScaleFactor },
  screenshots: [],
};

try {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  await context.route('**/*', (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== 'GET' && request.method() !== 'HEAD') return route.abort();
    if (url.origin === baseUrl) {
      const proxied = url.pathname === '/_next/image' ? url.searchParams.get('url') : null;
      if (proxied && new URL(proxied, baseUrl).origin !== baseUrl && !isApprovedPhoto(new URL(proxied, baseUrl))) {
        return route.abort();
      }
      return route.continue();
    }
    return request.resourceType() === 'image' && isApprovedPhoto(url) ? route.continue() : route.abort();
  });

  for (const theme of themes) {
    const page = await context.newPage();
    try {
      await page.clock.setFixedTime(new Date('2026-11-18T03:00:00Z'));
      const url = new URL(`/${sampleSlug}/${theme}/#theme-preview`, baseUrl);
      const response = await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (!response?.ok() || page.url() !== url.href) {
        throw new Error(`${theme}: the approved sample route did not load`);
      }

      await page.waitForFunction(({ theme, photoOrigin, photoFolder }) => {
        const invitation = document.querySelector(`[data-design="${theme}"]`);
        const text = invitation?.querySelector('#wedding-cover-title')?.textContent ?? '';
        const photo = invitation?.querySelector('[data-wedding-cover-photo]');
        if (!(text.includes('신민제') && text.includes('김현지')) ||
            !(photo instanceof HTMLImageElement) || photo.naturalWidth === 0) {
          return false;
        }
        const photoUrl = new URL(photo.currentSrc);
        return photoUrl.origin === photoOrigin && decodeURIComponent(photoUrl.pathname).includes(photoFolder);
      }, { theme, photoOrigin, photoFolder }, { timeout: 30000 });
      await page.locator('[data-wedding-intro]').first().waitFor({ state: 'hidden', timeout: 6000 });
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({
        content: [
          'nextjs-portal { display: none !important; }',
          'html, body { scrollbar-width: none !important; }',
          '::-webkit-scrollbar { display: none !important; }',
        ].join('\n'),
      });
      await page.evaluate(() => window.scrollTo(0, 0));

      const filename = `${theme}.jpg`;
      const screenshot = await page.screenshot({
        path: path.join(outputDirectory, filename),
        type: 'jpeg',
        quality: 90,
        animations: 'disabled',
        caret: 'hide',
        timeout: 30000,
      });
      const { width, height } = await sharp(screenshot).metadata();
      if (screenshot.length < 10000 || width !== viewport.width * deviceScaleFactor || height !== viewport.height * deviceScaleFactor) {
        throw new Error(`${theme}: unexpected screenshot size`);
      }
      report.screenshots.push({
        theme,
        file: filename,
        sourcePath: url.pathname,
        bytes: screenshot.length,
        sha256: crypto.createHash('sha256').update(screenshot).digest('hex'),
      });
      console.log(`Captured the approved ${theme} sample (${screenshot.length} bytes)`);
    } finally {
      await page.close();
    }
  }

  if (new Set(report.screenshots.map(({ sha256 }) => sha256)).size !== themes.length) {
    throw new Error('Each wedding theme must produce a distinct preview.');
  }
  await fs.writeFile(path.join(outputDirectory, 'capture-report.json'), JSON.stringify(report, null, 2) + '\n');
} finally {
  await browser.close();
}
