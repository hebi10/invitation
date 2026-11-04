#!/usr/bin/env node
// Public sample pages only: no customer records, accounts, or payments.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.INVITATION_CAPTURE_BASE_URL || 'http://127.0.0.1:3000';
const sampleSlug = 'an-doyoung-yoon-jisoo';
const themes = ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional'];
const outputDirectory = path.resolve('artifacts/theme-previews');
await fs.mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const report = {
  source: 'local Next.js sample rendered in Chromium',
  slug: sampleSlug,
  viewport: { width: 390, height: 720, deviceScaleFactor: 2 },
  screenshots: [],
};
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 720 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  for (const theme of themes) {
    const page = await context.newPage();
    const url = new URL('/' + sampleSlug + '/' + theme + '/', baseUrl).href;
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 110000 });
      if (!response || !response.ok()) {
        throw new Error(theme + ': sample returned HTTP ' + (response?.status() ?? 'none'));
      }
      await page.waitForFunction(() => {
        const text = document.body?.innerText || '';
        return text.includes('안도영') || text.includes('윤지수');
      }, null, { timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
      await page.evaluate(async () => {
        await document.fonts.ready;
        document.querySelectorAll('nextjs-portal').forEach((node) => node.remove());
        document.querySelectorAll('video').forEach((video) => video.pause());
      });
      await page.addStyleTag({
        content: [
          'nextjs-portal, [data-nextjs-dialog], [data-nextjs-toast] { display: none !important; }',
          '* { animation-duration: 0s !important; transition-duration: 0s !important; }',
          'html, body { scrollbar-width: none !important; }',
          '::-webkit-scrollbar { display: none !important; }',
        ].join('\n'),
      });
      const filename = theme + '.jpg';
      const target = path.join(outputDirectory, filename);
      await page.screenshot({
        path: target,
        type: 'jpeg',
        quality: 90,
        animations: 'disabled',
        caret: 'hide',
        timeout: 30000,
      });
      const bytes = await fs.readFile(target);
      if (bytes.length < 10000) throw new Error(theme + ': screenshot unexpectedly small');
      report.screenshots.push({
        theme,
        file: filename,
        sourcePath: new URL(url).pathname,
        bytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      });
      console.log('Captured ' + theme + ' (' + bytes.length + ' bytes)');
    } finally {
      await page.close();
    }
  }
  if (report.screenshots.length !== themes.length) throw new Error('Incomplete capture');
  await fs.writeFile(path.join(outputDirectory, 'capture-report.json'), JSON.stringify(report, null, 2) + '\n');
} finally {
  await browser.close();
}
