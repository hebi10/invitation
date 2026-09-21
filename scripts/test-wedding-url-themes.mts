import assert from 'node:assert/strict';
import { createInvitationPageFromSeed, getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';
import { getEventPreviewThemeKeys, getWeddingPreviewThemeKeys } from '../src/lib/eventPreviewLinks.ts';
import { mergeInvitationPageSeed } from '../src/lib/invitationPagePersistence.ts';
import { getInvitationPublicAccessState } from '../src/lib/invitationPublicAccess.ts';
import { resolveWeddingRouteTheme } from '../src/lib/weddingThemePolicy.ts';
import { buildDraftConfigFromSeed } from '../src/services/invitationPageSeedDrafts.ts';

const seed = structuredClone(getRequiredWeddingPageBySlug('kim-shinlang-na-sinbu'));
seed.variants = { simple: { available: false, path: '/old/simple', displayName: '기존 이름' } };
const themes = getWeddingPreviewThemeKeys();
const page = createInvitationPageFromSeed(seed, { fallbackTheme: 'simple', published: false });
for (const theme of themes) {
  assert.equal(page.variants[theme]?.available, true, `${theme}: legacy flags must not restrict wedding designs`);
  assert.equal(page.variants[theme]?.path, `/${seed.slug}/${theme}`);
}
assert.equal(page.variants.simple?.displayName, '기존 이름');
assert.equal(getInvitationPublicAccessState(page).isPublic, false);
const expired = createInvitationPageFromSeed(seed, {
  published: true, displayPeriodEnabled: true,
  displayPeriodStart: new Date('2020-01-01'), displayPeriodEnd: new Date('2020-02-01'),
});
assert.equal(getInvitationPublicAccessState(expired, new Date('2026-09-21')).reason, 'expired');
for (const theme of themes) assert.equal(resolveWeddingRouteTheme(seed, theme), theme);
assert.equal(resolveWeddingRouteTheme(seed, 'birthday-minimal'), null);
assert.equal(resolveWeddingRouteTheme(seed, 'unknown'), null);
assert.equal(resolveWeddingRouteTheme(null, 'simple'), null);
assert.equal(resolveWeddingRouteTheme(seed, null, 'romantic'), 'romantic');
const normalized = mergeInvitationPageSeed(undefined, seed as unknown as Record<string, unknown>, seed.slug, {
  fallbackTheme: 'simple', collapseLegacyAllTrue: true,
});
assert.ok(normalized);
for (const theme of themes) assert.equal(normalized.variants[theme]?.available, true);
assert.deepEqual(getEventPreviewThemeKeys({ eventType: 'wedding', availableThemes: ['simple'] }), themes);
const birthday = mergeInvitationPageSeed(undefined, { ...seed, eventType: 'birthday' }, seed.slug);
assert.ok(birthday);
assert.notEqual(birthday.variants.romantic?.available, true, 'other event policies must remain unchanged');
const draft = buildDraftConfigFromSeed(seed, {
  slug: 'new-wedding', eventType: 'wedding', groomName: '신랑', brideName: '신부',
  productTier: 'premium', theme: 'simple',
});
for (const theme of themes) assert.equal(draft.variants[theme]?.available, true);
console.log('Wedding URL theme policy passed.');
