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
assert.equal(definition.label, '결');
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
  'src/app/_components/public-invitations/wedding/gyeol/styles.module.css'
);
assert.equal(existsSync(pagePath), true, 'GYEOL must own a dedicated page.');
assert.equal(existsSync(cssPath), true, 'GYEOL must own dedicated styles.');

const pageSource = readFileSync(pagePath, 'utf8');
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
  'hero',
  'invitation',
  'schedule',
  'contact',
  'gift',
  'gallery',
  'guestbook',
].map((section) => pageSource.indexOf(`data-gyeol-section="${section}"`));
assert.equal(sectionPositions.every((position) => position >= 0), true);
assert.deepEqual(
  sectionPositions,
  [...sectionPositions].sort((left, right) => left - right),
  'GYEOL must preserve its editorial information rhythm.'
);

assert.doesNotMatch(cssSource, /(?:linear|radial|conic)-gradient/);
assert.doesNotMatch(cssSource, /box-shadow/);
assert.doesNotMatch(cssSource, /border-radius:\s*999px/);
assert.match(cssSource, /min-height:\s*44px/);
assert.match(cssSource, /:focus-visible/);
assert.match(cssSource, /@media\s*\(min-width:\s*900px\)/);
assert.match(cssSource, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
assert.match(
  cssSource,
  /scrollbar-color:\s*var\(--ink\)\s+var\(--paper\)/,
  'GYEOL must theme the document scrollbar with its own paper and ink colors.'
);
assert.match(
  cssSource,
  /\.heroImage\s*\{[\s\S]*?animation:\s*gyeol-image-settle/,
  'GYEOL must own one restrained hero image motion.'
);
assert.match(cssSource, /@keyframes\s+gyeol-image-settle/);

console.log('GYEOL theme registry behavior passed.');
