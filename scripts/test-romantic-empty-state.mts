import assert from 'node:assert/strict';

import {
  resolveGardenFamilyMember,
} from '../src/app/_components/public-invitations/shared/identityModel.ts';
import {
  buildWeddingStoredContent,
} from '../src/app/_components/public-invitations/shared/weddingStoredContentModel.ts';
import type { InvitationPage } from '../src/types/invitationPage.ts';
import { getRomanticPhotoSequence } from '../src/lib/romanticPhotoSequence.ts';

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

for (const { images, previewIndices, closingImageUrl } of [
  { images: [], previewIndices: [], closingImageUrl: undefined },
  { images: ['/one.jpg'], previewIndices: [0], closingImageUrl: undefined },
  { images: ['/one.jpg', '/two.jpg'], previewIndices: [0, 1], closingImageUrl: undefined },
  { images: ['/one.jpg', '/two.jpg', '/three.jpg'], previewIndices: [0, 1], closingImageUrl: '/three.jpg' },
  { images: ['/one.jpg', '/two.jpg', '/three.jpg', '/four.jpg'], previewIndices: [0, 1, 2], closingImageUrl: '/four.jpg' },
  { images: ['/one.jpg', '/two.jpg', '/three.jpg', '/four.jpg', '/five.jpg', '/six.jpg'], previewIndices: [0, 1, 2, 3, 4], closingImageUrl: '/six.jpg' },
  { images: ['/one.jpg', '/two.jpg', '/three.jpg', '/four.jpg', '/five.jpg', '/six.jpg', '/seven.jpg'], previewIndices: [0, 1, 2, 3, 4], closingImageUrl: '/seven.jpg' },
]) {
  assert.deepEqual(getRomanticPhotoSequence(images, '/cover.jpg'), { previewIndices, closingImageUrl },
    `${images.length} gallery photos: reserve a distinct closing only when at least three candidates remain`);
}

const storedImages = ['/cover.jpg', '/one.jpg', '/one.jpg', '/two.jpg', '/three.jpg', '/three.jpg'];
const storedPreviews = ['/cover-preview.jpg', '/one-preview.jpg', '/one-preview.jpg', '/two-preview.jpg', '/three-preview.jpg', '/three-preview.jpg'];
Object.freeze(storedImages);
Object.freeze(storedPreviews);
assert.deepEqual(getRomanticPhotoSequence(storedImages, '/cover.jpg', storedPreviews), {
  previewIndices: [1, 3], closingImageUrl: '/three.jpg',
}, 'Cover and repeated photos are excluded while selected indices retain saved ordering');
assert.deepEqual(storedImages, ['/cover.jpg', '/one.jpg', '/one.jpg', '/two.jpg', '/three.jpg', '/three.jpg'],
  'The gallery sequence must remain unchanged for the complete popup gallery');
assert.deepEqual(storedPreviews, ['/cover-preview.jpg', '/one-preview.jpg', '/one-preview.jpg', '/two-preview.jpg', '/three-preview.jpg', '/three-preview.jpg']);
assert.deepEqual(getRomanticPhotoSequence(['/cover.jpg', '/cover.jpg'], '/cover.jpg'), {
  previewIndices: [], closingImageUrl: undefined,
}, 'A gallery containing only the cover must not duplicate it in the story or closing');
assert.deepEqual(getRomanticPhotoSequence(
  ['/cover-original.jpg', '/one.jpg', '/one-original.jpg', '/two.jpg', '/three.jpg'],
  '/cover-preview.jpg',
  ['/cover-preview.jpg', '/one-preview.jpg', '/one-preview.jpg', '/two-preview.jpg', '/three-preview.jpg']
), { previewIndices: [1, 3], closingImageUrl: '/three.jpg' },
'Preview aliases identify a cover or repeated gallery image without changing original popup indices');
assert.deepEqual(getRomanticPhotoSequence(
  ['/cover-original.jpg', '/one.jpg', '/cover-original.jpg', '/two.jpg'],
  '/cover-preview.jpg',
  ['', '/one-preview.jpg', '/cover-preview.jpg', '/two-preview.jpg']
), { previewIndices: [1, 3], closingImageUrl: undefined },
'A cover alias on a later duplicate also excludes its earlier original without a preview');

const firebaseCover = 'https://firebasestorage.googleapis.com/v0/b/test.appspot.com/o/wedding%2Fcover.jpg?alt=media&token=cover-token';
const firebasePhoto = 'https://firebasestorage.googleapis.com/v0/b/test.appspot.com/o/wedding%2Fone.jpg?alt=media&token=photo-token';
assert.deepEqual(getRomanticPhotoSequence([
  firebaseCover.replace('cover-token', 'refreshed-token'),
  firebasePhoto,
  firebasePhoto.replace('photo-token', 'refreshed-token'),
  '/two.jpg', '/three.jpg',
], firebaseCover), { previewIndices: [1, 3], closingImageUrl: '/three.jpg' },
'Refreshed Firebase download tokens still identify the same stored object');
assert.deepEqual(getRomanticPhotoSequence([
  'https://example.com/image.jpg?token=one',
  'https://example.com/image.jpg?token=two',
], ''), { previewIndices: [0, 1], closingImageUrl: undefined },
'Unknown image servers keep their full query identity');
assert.deepEqual(getRomanticPhotoSequence(['', '  ', '/one.jpg'], ''), {
  previewIndices: [2], closingImageUrl: undefined,
}, 'Empty photo URLs do not occupy a story position');

console.log('Wedding empty-state and romantic photo sequence checks passed');
