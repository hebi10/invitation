import assert from 'node:assert/strict';

import {
  buildKakaoShareImageCandidates,
  normalizeKakaoShareImageUrl,
} from '../src/app/_components/kakaoShareUtils.ts';

const origin = 'https://msgnote.kr';

assert.equal(
  normalizeKakaoShareImageUrl('/images/intro_romantic.png', origin),
  'https://msgnote.kr/images/intro_romantic.png'
);

assert.equal(
  normalizeKakaoShareImageUrl(
    'https://firebasestorage.googleapis.com/v0/b/invitation/o/image.jpg?alt=media',
    origin
  ),
  'https://firebasestorage.googleapis.com/v0/b/invitation/o/image.jpg?alt=media'
);

assert.equal(normalizeKakaoShareImageUrl('data:image/png;base64,abc', origin), '');
assert.equal(normalizeKakaoShareImageUrl('javascript:alert(1)', origin), '');
assert.equal(normalizeKakaoShareImageUrl('/images/intro_romantic.png', ''), '');

assert.deepEqual(
  buildKakaoShareImageCandidates(
    [
      '/images/intro_romantic.png',
      'https://msgnote.kr/images/intro_romantic.png',
      '',
      'data:image/png;base64,abc',
    ],
    origin
  ),
  ['https://msgnote.kr/images/intro_romantic.png']
);

console.log('kakao share url policy checks passed');
