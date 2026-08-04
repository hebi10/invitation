import assert from 'node:assert/strict';

import {
  resolveRomanticInfoTab,
  shouldRenderRomanticGallery,
  shouldRenderRomanticLocation,
} from '../src/app/_components/themeRenderers/romanticState';

assert.equal(
  resolveRomanticInfoTab({
    activeTab: 'summary',
    hasSummary: false,
    hasDetail: false,
    hasGuide: false,
  }),
  null
);

assert.equal(
  resolveRomanticInfoTab({
    activeTab: 'summary',
    hasSummary: false,
    hasDetail: true,
    hasGuide: false,
  }),
  'detail'
);

assert.equal(
  resolveRomanticInfoTab({
    activeTab: 'guide',
    hasSummary: true,
    hasDetail: false,
    hasGuide: false,
  }),
  'summary'
);

assert.equal(shouldRenderRomanticGallery([], false), false);
assert.equal(shouldRenderRomanticGallery([], true), true);
assert.equal(shouldRenderRomanticGallery(['/images/photo.jpg'], false), true);

assert.equal(
  shouldRenderRomanticLocation({
    venue: ' ',
    address: '',
    description: '',
    contact: '',
    latitude: 0,
    longitude: 0,
  }),
  false
);
assert.equal(
  shouldRenderRomanticLocation({
    venue: '',
    address: '',
    description: '',
    contact: '',
    latitude: 37.5048,
    longitude: 127.028,
  }),
  true
);
assert.equal(
  shouldRenderRomanticLocation({
    venue: '사용자 웨딩홀',
    address: '',
    description: '',
    contact: '',
    latitude: 0,
    longitude: 0,
  }),
  true
);

console.log('romantic empty-state checks passed');
