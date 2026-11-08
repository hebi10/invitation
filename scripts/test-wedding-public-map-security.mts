import assert from 'node:assert/strict';

import {
  buildWeddingStoredContent,
  normalizePublicWeddingMapUrl,
} from '../src/app/_components/public-invitations/shared/weddingStoredContentModel.ts';
import { getRequiredWeddingPageBySlug, createInvitationPageFromSeed } from '../src/config/weddingPages.ts';

assert.equal(
  normalizePublicWeddingMapUrl('http://map.kakao.com/link/map/test,37.5,127'),
  'https://map.kakao.com/link/map/test,37.5,127',
);
assert.equal(
  normalizePublicWeddingMapUrl('HTTPS://map.kakao.com/link/search?q=test'),
  'https://map.kakao.com/link/search?q=test',
);
assert.equal(
  normalizePublicWeddingMapUrl('https://map.naver.com/v5/search/%EC%84%9C%EC%9A%B8'),
  'https://map.naver.com/v5/search/%EC%84%9C%EC%9A%B8',
);
assert.equal(normalizePublicWeddingMapUrl('http://unknown.example/route'), '');
assert.equal(normalizePublicWeddingMapUrl('javascript:alert(1)'), '');
assert.equal(normalizePublicWeddingMapUrl('https://user:password@map.kakao.com/foo'), '');
assert.equal(normalizePublicWeddingMapUrl('invalid url'), '');
assert.equal(normalizePublicWeddingMapUrl(''), '');

const sample = createInvitationPageFromSeed(getRequiredWeddingPageBySlug('kim-shinlang-na-sinbu'));
const originalUrl = 'http://map.kakao.com/link/to/sample,37.5,127';
const page = {
  ...sample,
  pageData: {
    ...sample.pageData,
    mapUrl: originalUrl,
  },
};
const rendered = buildWeddingStoredContent(page, page.pageData);
assert.equal(
  rendered.mapHref,
  'https://map.kakao.com/link/to/sample,37.5,127',
  'Public wedding map link should upgrade known legacy Kakao URL to HTTPS',
);
assert.equal(
  page.pageData.mapUrl,
  originalUrl,
  'The saved customer URL must not be mutated',
);
const fallbackPage = {
  ...page,
  pageData: {
    ...page.pageData,
    mapUrl: 'http://untrusted.example/unknown',
    kakaoMap: undefined,
    ceremonyAddress: '서울시 서초구',
  },
};
assert.match(
  buildWeddingStoredContent(fallbackPage, fallbackPage.pageData).mapHref,
  /^https:\/\/map\.kakao\.com\/link\/search\//,
  'An untrusted or insecure explicit link must use an HTTPS map search fallback',
);
console.log('Wedding public map link security and saved-data compatibility checks passed');
