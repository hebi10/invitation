import assert from 'node:assert/strict';
import { normalizeWeddingIntroStyle, shouldShowWeddingIntro, weddingIntroSessionKey } from '../src/lib/weddingIntro.ts';

assert.equal(normalizeWeddingIntroStyle(undefined), 'none');
assert.equal(normalizeWeddingIntroStyle('unknown'), 'none');
for (const style of ['light', 'cinema', 'envelope'] as const) {
  assert.equal(shouldShowWeddingIntro({ style, preview: false, hash: '', seen: false }), true);
  assert.equal(shouldShowWeddingIntro({ style, preview: false, hash: '#wedding-location', seen: false }), false);
  assert.equal(shouldShowWeddingIntro({ style, preview: false, hash: '', seen: true }), false);
  assert.equal(shouldShowWeddingIntro({ style, preview: true, hash: '#wedding-location', seen: true }), true);
}
assert.equal(shouldShowWeddingIntro({ style: 'none', preview: true, hash: '', seen: false }), false);
assert.notEqual(weddingIntroSessionKey('a'), weddingIntroSessionKey('b'));
console.log('Wedding intro session, preview and deep link policy passed');
