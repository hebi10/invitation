#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';
import sharp from 'sharp';

const baseUrl = new URL(process.env.INVITATION_CAPTURE_BASE_URL || 'http://127.0.0.1:3000');
if (baseUrl.protocol !== 'http:' || baseUrl.hostname !== '127.0.0.1') {
  throw new Error('Theme captures must use the local fictional sample server.');
}

const samplePath = '/sample-invitation/';
const sampleImage = '/images/home-wedding/portrait.webp';
const themes = ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional'];
const viewport = { width: 390, height: 720 };
const deviceScaleFactor = 2;
const outputDirectory = path.resolve('artifacts/theme-previews');
await fs.mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const report = {
  source: 'Local fictional wedding sample',
  samplePath,
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
    return new URL(route.request().url()).origin === baseUrl.origin ? route.continue() : route.abort();
  });

  for (const theme of themes) {
    const page = await context.newPage();
    try {
      await page.clock.setFixedTime(new Date('2026-11-18T03:00:00Z'));
      const url = new URL(samplePath, baseUrl);
      url.searchParams.set('qaTheme', theme);
      url.searchParams.set('embed', '1');
      const response = await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (!response?.ok() || page.url() !== url.href) {
        throw new Error(`${theme}: the fictional sample route did not load`);
      }

      await page.waitForFunction(({ theme, sampleImage }) => {
        const invitation = document.querySelector(`[data-design="${theme}"]`);
        const identity = invitation?.querySelector('#wedding-cover-title')?.textContent;
        const photo = invitation?.querySelector('[data-wedding-cover-photo]');
        return identity?.includes('이서준') && identity.includes('김하은') &&
          photo instanceof HTMLImageElement && photo.naturalWidth > 0 &&
          new URL(photo.currentSrc).pathname === sampleImage;
      }, { theme, sampleImage }, { timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({
        content: [
          'nextjs-portal { display: none !important; }',
          'html, body { scrollbar-width: none !important; }',
          '::-webkit-scrollbar { display: none !important; }',
        ].join('\n'),
      });

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
        sourcePath: url.pathname + url.search,
        bytes: screenshot.length,
        sha256: crypto.createHash('sha256').update(screenshot).digest('hex'),
      });
      console.log(`Captured the fictional ${theme} sample (${screenshot.length} bytes)`);
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
