import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  buildInvitationThemeRoutePath,
  getInvitationThemeDefinition,
  getInvitationThemeSalesPolicy,
  getSelectableInvitationThemeKeys,
  isInvitationThemeKey,
} from '../src/lib/invitationThemes.ts';

const themeKey = 'gyeol';

assert.equal(
  isInvitationThemeKey(themeKey),
  true,
  'GYEOL must be recognized as a valid invitation theme.'
);

if (!isInvitationThemeKey(themeKey)) {
  throw new Error('GYEOL theme registration is missing.');
}

const definition = getInvitationThemeDefinition(themeKey);
assert.equal(definition.label, '전통형');
assert.equal(definition.pathSuffix, '/gyeol');
assert.equal(
  buildInvitationThemeRoutePath('kim-taehyun-choi-yuna', themeKey),
  '/kim-taehyun-choi-yuna/gyeol'
);
assert.equal(
  definition.preview.sampleUrls.standard.endsWith(
    '/kim-taehyun-choi-yuna/gyeol/'
  ),
  true,
  'GYEOL must expose a working standard sample route.'
);

const policy = getInvitationThemeSalesPolicy(themeKey);
assert.equal(policy.isSelectableAtCreation, true);
assert.equal(policy.isPurchasable, true);
assert.equal(policy.allowsAdditionalPurchase, true);
assert.equal(getSelectableInvitationThemeKeys().includes(themeKey), true);

const pagePath = path.resolve(
  process.cwd(),
  'src/app/_components/public-invitations/wedding/gyeol/Page.tsx'
);
const cssPath = path.resolve(
  process.cwd(),
  'src/app/_components/public-invitations/wedding/WeddingBase.module.css'
);
assert.equal(existsSync(pagePath), true, 'GYEOL must own a dedicated page.');
assert.equal(existsSync(cssPath), true, 'GYEOL must own dedicated styles.');

const wrapper = readFileSync(pagePath, 'utf8');
assert.match(wrapper, /<WeddingBase \{\.\.\.props\} theme="gyeol"/);
const pageSource = readFileSync(path.resolve(process.cwd(), 'src/app/_components/public-invitations/wedding/WeddingBase.tsx'), 'utf8');
const cssSource = readFileSync(cssPath, 'utf8');
const registrySource = readFileSync(
  path.resolve(process.cwd(), 'src/app/_components/themeRenderers/registry.ts'),
  'utf8'
);

assert.match(registrySource, /key:\s*['"]gyeol['"][\s\S]*?component:\s*GyeolPage/);
assert.match(pageSource, /useImmediateWeddingPageReveal\(state\)/);
assert.match(pageSource, /<PublicInvitationDateFeature/);
assert.match(pageSource, /<WeddingStoredContent/);
assert.match(pageSource, /<GalleryGridShared/);
assert.match(pageSource, /<GiftInfoThemed/);
assert.match(pageSource, /<GuestbookThemed/);

const sectionPositions = [
  'invitation',
  'contact',
  'gallery',
  'schedule',
  'gift',
  'guestbook',
].map((section) => pageSource.indexOf(`data-wedding-section="${section}"`));
assert.equal(sectionPositions.every((position) => position >= 0), true);
assert.match(pageSource, /theme !== 'romantic' && theme !== 'classic-r' \? gallery : null/);
assert.match(pageSource, /theme === 'gyeol' \|\| theme === 'classic-r' \? calendar : null/);

assert.doesNotMatch(
  cssSource.replace(/\.heroCopy\s*\{[^}]*\}/s, ''),
  /(?:linear|radial|conic)-gradient/,
  'Only the photographic cover may use a contrast scrim; page sections remain flat.'
);
assert.doesNotMatch(cssSource, /box-shadow/);
assert.doesNotMatch(cssSource, /border-radius:\s*999px/);
assert.match(cssSource, /min-height:\s*44px/);
assert.match(cssSource, /:focus-visible/);
assert.match(cssSource, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
assert.match(
  cssSource,
  /scrollbar-color:\s*var\(--ink\)\s+var\(--paper\)/,
  'GYEOL must theme the document scrollbar with its own paper and ink colors.'
);
const coverSource = readFileSync(path.resolve(process.cwd(), 'src/app/_components/public-invitations/wedding/WeddingCover.tsx'), 'utf8');
const coverCss = readFileSync(path.resolve(process.cwd(), 'src/app/_components/public-invitations/wedding/WeddingCover.module.css'), 'utf8');
assert.match(coverSource, /theme === 'gyeol'/);
assert.match(coverSource, /styles\.traditional/);
assert.match(coverSource, /styles\.families/);
assert.match(coverCss, /writing-mode:\s*vertical-rl/);
console.log('GYEOL theme registry behavior passed.');
