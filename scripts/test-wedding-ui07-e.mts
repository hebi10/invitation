import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (file: string) => readFileSync(file, 'utf8');
const music = source('src/components/media/BackgroundMusic.tsx');
const css = source('src/components/media/BackgroundMusic.module.css');
const wedding = source('src/app/_components/EventInvitationPage.tsx');
const sample = source('src/app/sample-invitation/SampleInvitation.tsx');
const introCss = source('src/components/sections/WeddingIntro/WeddingIntro.module.css');
const pageCss = source('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const qa = source('scripts/qa-invitation-ui07-e.py');
const workflow = source('.github/workflows/invitation-ui07-e-music-qa.yml');

for (const token of [
  "type WeddingMusicState = 'playing' | 'paused' | 'error'",
  'function WeddingMusicGlyph(', '<svg', 'data-wedding-music-icon={state}',
  'aria-hidden="true"', 'focusable="false"',
  "musicControlState: WeddingMusicState", "errorMessage", "isPlaying",
  'data-wedding-music-state={alignToInvitation ? musicControlState : undefined}',
  '<WeddingMusicGlyph state={musicControlState} />',
  "isPlaying ? 'Ⅱ' : '♪'",
  "aria-label={isPlaying ? '음악 끄기' : errorMessage ? '음악 다시 시도' : '음악 켜기'}",
  'aria-pressed={isPlaying}', 'hasAutoPlayedRef.current = true',
  'onRetryLoad?.()', 'onError={() =>', 'aria-label="음악 안내 닫기"',
  'controlRef.current?.focus()',
]) {
  assert.ok(music.includes(token), 'Wedding music control contract missing: ' + token);
}

assert.match(css, /\.musicPlayer\.invitationAligned \.toggleButton \{[^}]*width: 48px;[^}]*height: 48px;[^}]*border-radius: 0;/s);
assert.match(css, /\.musicPlayer\.invitationAligned \.toggleButton\.on \{[^}]*background: #262626;[^}]*color: #fff;/s);
assert.match(css, /\.musicPlayer\.invitationAligned \.toggleButton\.off \{[^}]*background: #fff;[^}]*color: #333;/s);
assert.match(css, /\.musicPlayer\.invitationAligned \.toggleButton:focus-visible \{[^}]*outline: 2px solid #262626;/s);
assert.match(css, /\.musicPlayer\.invitationAligned \.autoPlayHint \{[^}]*box-shadow: none;[^}]*animation: none;/s);
assert.match(css, /right: max\(16px, calc\(env\(safe-area-inset-right\) \+ 12px\), calc\(50vw - 228px\)\);/);
assert.match(css, /top: max\(16px, calc\(env\(safe-area-inset-top\) \+ 12px\)\);/);
assert.match(css, /@media \(min-width: 769px\) \{\s*\.musicPlayer\.invitationAligned \{[^}]*right: max\(12px, calc\(50vw - 228px\)\);/s);
assert.match(css, /z-index: 30;/);
assert.match(introCss, /z-index: 12000;/);
assert.match(pageCss, /z-index: 1000;/);

assert.match(wedding, /<BackgroundMusic\s+alignToInvitation\s+autoPlay/s);
assert.match(sample, /<BackgroundMusic alignToInvitation autoPlay=\{false\} musicUrl=/);
assert.match(qa, /"error"/);
assert.match(qa, /"playing"/);
assert.match(qa, /aria-pressed/);
assert.match(qa, /320, 740/);
assert.match(qa, /1440, 900/);
assert.match(workflow, /pull_request:/);
assert.match(workflow, /playwright==1\.56\.0/);
assert.doesNotMatch(workflow, /firebase deploy|eas submit|npm run deploy/);

console.log('UI-07-E wedding-only music glyph, placement and playback contracts verified');
