import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WEDDING_MAP_PROVIDERS,
  WEDDING_MAP_PROVIDER_LABELS,
  buildWeddingMapProviderUrl,
  hasValidWeddingMapCoordinates,
  normalizeWeddingMapProviders,
} from '../src/lib/weddingMapProviders.ts';
import { mergeInvitationPageSeed } from '../src/lib/invitationPagePersistence.ts';
import { createInvitationPageFromSeed, getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';

const address = '전북특별자치도 전주시 완산구 온고을로 1';
const place = '더케이웨딩홀 & A/B';
const exact = { venueName: place, address, latitude: 35.82, longitude: 127.14 };
const fallback = { venueName: place, address };
assert.deepEqual(normalizeWeddingMapProviders(undefined), [...WEDDING_MAP_PROVIDERS]);
assert.deepEqual(normalizeWeddingMapProviders([]), []);
assert.deepEqual(normalizeWeddingMapProviders(['google', 'invalid', 'google', 'naver']), ['naver', 'google']);
assert.deepEqual(normalizeWeddingMapProviders('google'), []);
assert.deepEqual(WEDDING_MAP_PROVIDERS.map((provider) => WEDDING_MAP_PROVIDER_LABELS[provider]), [
  '네이버 지도', '카카오맵', '구글 지도',
]);
assert.equal(hasValidWeddingMapCoordinates(0, 0), false);
assert.equal(hasValidWeddingMapCoordinates(91, 127), false);
assert.equal(hasValidWeddingMapCoordinates(35.82, 127.14), true);
assert.equal(buildWeddingMapProviderUrl('naver', exact).startsWith('https://map.naver.com/p/search/'), true);
assert.equal(buildWeddingMapProviderUrl('naver', exact).includes(encodeURIComponent(address)), true);
assert.equal(buildWeddingMapProviderUrl('kakao', exact), `https://map.kakao.com/link/to/${encodeURIComponent(place)},35.82,127.14`);
assert.equal(buildWeddingMapProviderUrl('google', exact), 'https://www.google.com/maps/dir/?api=1&destination=35.82%2C127.14');
assert.match(buildWeddingMapProviderUrl('kakao', fallback), /^https:\/\/map\.kakao\.com\/link\/search\//);
assert.match(buildWeddingMapProviderUrl('google', fallback), /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
assert.equal(buildWeddingMapProviderUrl('naver', { venueName: place, address: '' }), '');
assert.equal(buildWeddingMapProviderUrl('google', { ...exact, latitude: Number.NaN }), buildWeddingMapProviderUrl('google', fallback));
assert.deepEqual(
  WEDDING_MAP_PROVIDERS.map((provider) => new URL(buildWeddingMapProviderUrl(provider, exact)).hostname),
  ['map.naver.com', 'map.kakao.com', 'www.google.com'],
);
const sample = createInvitationPageFromSeed(getRequiredWeddingPageBySlug('kim-shinlang-na-sinbu'));
const base = sample as typeof sample;
const mergedEmpty = mergeInvitationPageSeed(base, { pageData: { mapProviders: [] } }, base.slug);
assert.ok(mergedEmpty);
assert.deepEqual(mergedEmpty.pageData?.mapProviders, []);
const mergedLegacy = mergeInvitationPageSeed(base, { pageData: { ceremonyAddress: address } }, base.slug);
assert.ok(mergedLegacy);
assert.deepEqual(normalizeWeddingMapProviders(mergedLegacy.pageData?.mapProviders), [...WEDDING_MAP_PROVIDERS]);
const mergedFiltered = mergeInvitationPageSeed(base, { pageData: { mapProviders: ['google', 'fake', 'google'] } }, base.slug);
assert.ok(mergedFiltered);
assert.deepEqual(mergedFiltered.pageData?.mapProviders, ['google']);
const read = (path: string) => readFileSync(path, 'utf8');
const web = read('src/app/page-wizard/steps/VenueStep.tsx');
const mobile = read('apps/mobile/src/features/manage/components/steps/LocationEditorStep.tsx');
const state = read('apps/mobile/src/features/manage/shared.ts');
const save = read('apps/mobile/src/features/manage/buildConfigFromForm.ts');
const types = read('src/types/invitationPage.ts');
const androidTypes = read('apps/mobile/src/types/mobileInvitation.ts');
const publicMap = read('src/app/_components/public-invitations/wedding/gyeol/LocationMap.tsx');
const previewRoute = read('src/app/sample-invitation/page.tsx');
const previewState = read('src/app/sample-invitation/SampleInvitation.tsx');
for (const [source, pattern] of [
  [web, 'draft.pageData.mapProviders ='],
  [mobile, 'accessibilityRole="checkbox"'],
  [mobile, 'onSetMapProviders('],
  [state, 'mapProviders: normalizeMobileMapProviders(pageData.mapProviders)'],
  [save, 'mapProviders: normalizeMobileMapProviders(form.mapProviders)'],
  [types, 'mapProviders?: WeddingMapProvider[]'],
  [androidTypes, 'mapProviders?: MobileInvitationMapProvider[]'],
  [publicMap, 'data-count={providerLinks.length}'],
  [publicMap, "window.addEventListener('scroll', checkWithinRange"],
  [publicMap, "selectedProviders.includes('kakao')"],
  [publicMap, 'href={fallbackHref}'],
  [previewRoute, "query.qaMapProviders === 'none'"],
  [previewState, 'QA_MAP_PROVIDER_VARIANTS'],
]) assert.ok(source.includes(pattern), 'MAP-01 contract missing: ' + pattern);
console.log('MAP-01 provider normalization, URL, legacy data, customer editor and public map contracts passed');
