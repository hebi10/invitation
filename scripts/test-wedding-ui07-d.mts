import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(path, 'utf8');
const map = source('src/app/_components/public-invitations/wedding/gyeol/LocationMap.tsx');
const css = source('src/app/_components/public-invitations/wedding/gyeol/LocationMap.module.css');
const icons = source('src/app/_components/public-invitations/wedding/WeddingActionIcon.tsx');
const wedding = source('src/app/_components/public-invitations/wedding/WeddingBase.tsx');
const fixture = source('src/app/sample-invitation/SampleInvitation.tsx');
const route = source('src/app/sample-invitation/page.tsx');

for (const value of [
  'loadKakaoMapsSdk()', 'validCoordinates(', 'IntersectionObserver',
  'setStatus(\'failed\')', 'map.setZoomable(false)', 'map.setDraggable(false)',
  'marker?.setMap(null)', 'resizeObserver?.disconnect()',
  'setDirectionsHref(', 'relayout()', 'setCenter(position)',
  'data-map-status={status}', 'aria-pressed={controlsEnabled}',
  'role="img"', 'aria-label="지도 바로가기"',
  '지도에서 위치 보기', '지도 앱에서 길찾기', '큰 지도 보기',
  "event.key === 'Escape'", '<WeddingActionIcon kind="move" />',
  '<WeddingActionIcon kind="route" />', '<WeddingActionIcon kind="pin" />',
  'href={directionsHref}', 'href={mapHref}', 'target="_blank"',
  'rel="noopener noreferrer"', 'styles.mapHint',
]) {
  assert.ok(map.includes(value), 'UI-07-D map contract missing: ' + value);
}

assert.equal((map.match(/className=\{styles\.mapControl\}/g) || []).length, 1,
  'Map movement must be controlled by one button');
assert.equal((map.match(/onClick=\{toggleControls\}/g) || []).length, 1,
  'Map movement button must have one click listener');
for (const value of ['kind === \'route\'', 'kind === \'move\'', 'aria-hidden="true"']) {
  assert.ok(icons.includes(value), 'Reusable map action icon missing: ' + value);
}
for (const value of [
  'aspect-ratio: 8 / 5', 'min-height: 208px',
  'pointer-events: none', 'pointer-events: auto',
  'grid-template-columns: repeat(2, minmax(0, 1fr))',
  "aria-pressed='true'", 'min-height: 48px', ':focus-visible',
  "data-appearance='natural'", "data-appearance='classic'",
  "data-appearance='photo'", '@media (max-width: 359px)',
]) {
  assert.ok(css.includes(value), 'UI-07-D layout contract missing: ' + value);
}
assert.doesNotMatch(css, /(?:box-shadow|border-radius|linear-gradient|radial-gradient)\s*:/);

assert.match(wedding, /showMap && storedContent\.mapHref/);
assert.match(wedding, /<LocationMap/);
assert.match(wedding, /data-wedding-section="schedule"/);
assert.match(route, /process\.env\.NODE_ENV !== 'production' && query\.qaUI07 === '1'/);
assert.match(route, /qaUI07 && \(query\.qaUI07Map === 'coordinates' \|\| query\.qaUI07Map === 'geocode'\)/);
assert.match(fixture, /showMap=\{qaUI07 && qaUI07Map !== 'off'\}/);
assert.match(fixture, /latitude: 37\.50001/);
assert.match(fixture, /longitude: 127\.00001/);
assert.doesNotMatch(fixture, /(?:setDoc|updateDoc|deleteDoc|addDoc)\(/);

console.log('UI-07-D map layout, action semantics, read-only fixture and fallback contracts verified');
