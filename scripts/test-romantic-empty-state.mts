import assert from 'node:assert/strict';

import {
  resolveGardenFamilyMember,
} from '../src/app/_components/public-invitations/shared/identityModel.ts';
import {
  buildWeddingStoredContent,
} from '../src/app/_components/public-invitations/shared/weddingStoredContentModel.ts';
import type { InvitationPage } from '../src/types/invitationPage.ts';

const emptyPage = { venue: '', pageData: {} } as InvitationPage;
const emptyContent = buildWeddingStoredContent(emptyPage, emptyPage.pageData);

assert.equal(emptyContent.greetingMessage, '');
assert.equal(emptyContent.mapHref, '');
assert.equal(emptyContent.reception, null);
assert.deepEqual(emptyContent.venueGuide, []);
assert.deepEqual(emptyContent.wreathGuide, []);

const coordinateContent = buildWeddingStoredContent(emptyPage, {
  kakaoMap: {
    latitude: 37.5048,
    longitude: 127.028,
    markerTitle: '사용자 웨딩홀',
  },
});
assert.equal(
  coordinateContent.mapHref,
  'https://map.kakao.com/link/map/사용자 웨딩홀,37.5048,127.028'
);

const addressContent = buildWeddingStoredContent(emptyPage, {
  ceremonyAddress: '서울시 사용자로 1',
});
assert.equal(
  addressContent.mapHref,
  'https://map.kakao.com/link/search/%EC%84%9C%EC%9A%B8%EC%8B%9C%20%EC%82%AC%EC%9A%A9%EC%9E%90%EB%A1%9C%201'
);

assert.deepEqual(
  resolveGardenFamilyMember(
    { relation: '', name: '', phone: '010-1234-5678' },
    0
  ),
  {
    displayName: '아버지',
    name: '아버지',
    phone: '010-1234-5678',
    relation: '아버지',
    side: '신랑측',
  }
);

console.log('active garden wedding empty-state checks passed');
