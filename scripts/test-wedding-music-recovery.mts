import assert from 'node:assert/strict';

import {
  getWeddingMusicStorageCandidates,
  resolveWeddingMusicDownloadUrl,
} from '../src/app/_components/weddingMusicRecovery.ts';

const oldSelection = {
  storagePath: 'music/romantic/memory-lane.mp3',
  categoryId: 'romantic',
};
const candidates = getWeddingMusicStorageCandidates(oldSelection);
assert.deepEqual(candidates, [
  'music/romantic/memory-lane.mp3',
  'music/01-romantic-piano/Petals_on_the_Lawn.mp3',
]);

const lookedUp: string[] = [];
const restored = await resolveWeddingMusicDownloadUrl(oldSelection, async path => {
  lookedUp.push(path);
  return path === candidates[1] ? 'https://example.test/replacement.mp3' : null;
});
assert.equal(restored, 'https://example.test/replacement.mp3');
assert.deepEqual(lookedUp, candidates, 'Fallback only runs after original Storage URL fails');
assert.equal(oldSelection.storagePath, 'music/romantic/memory-lane.mp3', 'Saved selection is untouched');

const preferred = getWeddingMusicStorageCandidates({
  storagePath: oldSelection.storagePath,
  trackId: '01-romantic-piano-sunlight-on-the-aisle',
  categoryId: 'romantic',
});
assert.deepEqual(preferred.slice(0, 2), [
  oldSelection.storagePath,
  'music/01-romantic-piano/Sunlight_on_the_Aisle.mp3',
], 'Prefer the selected valid track before the category default');

let successfulLookups = 0;
const primary = await resolveWeddingMusicDownloadUrl({
  storagePath: 'music/01-romantic-piano/Petals_on_the_Lawn.mp3',
}, async path => {
  successfulLookups++;
  return path === 'music/01-romantic-piano/Petals_on_the_Lawn.mp3'
    ? 'https://example.test/current.mp3'
    : null;
});
assert.equal(primary, 'https://example.test/current.mp3');
assert.equal(successfulLookups, 1, 'Valid current music must not be substituted');

const external = getWeddingMusicStorageCandidates({
  storagePath: 'https://example.test/custom.mp3',
  categoryId: 'romantic',
});
assert.deepEqual(external, ['https://example.test/custom.mp3'], 'External URLs never receive catalog fallback');
const unrelated = getWeddingMusicStorageCandidates({
  storagePath: 'private/user-a/secret.mp3',
  categoryId: 'romantic',
});
assert.deepEqual(unrelated, ['private/user-a/secret.mp3'], 'Non-music Storage paths are not replaced');

let cancelled = false;
const stoppedAt: string[] = [];
const cancelledResult = await resolveWeddingMusicDownloadUrl(
  oldSelection,
  async path => {
    stoppedAt.push(path);
    cancelled = true;
    return null;
  },
  () => cancelled
);
assert.equal(cancelledResult, null);
assert.deepEqual(stoppedAt, [oldSelection.storagePath], 'Unmounted pages do not continue fallback requests');

const missingResult = await resolveWeddingMusicDownloadUrl(oldSelection, async () => null);
assert.equal(missingResult, null, 'Missing catalog music still preserves the existing visible error');

console.log('Wedding legacy music recovery checks passed');
