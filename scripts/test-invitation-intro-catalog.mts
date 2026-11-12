import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import InvitationIntroPicker from '../src/components/sections/InvitationIntro/InvitationIntroPicker.tsx';
import {
  INVITATION_INTRO_PRESETS,
  getInvitationIntroPreset,
  listAvailableInvitationIntroPresets,
  parseInvitationIntroChoice,
} from '../src/lib/invitationIntroCatalog.ts';
import { listEnabledEventTypes } from '../src/lib/eventTypes.ts';
import { normalizeWeddingIntroStyle } from '../src/lib/weddingIntro.ts';

const presets = listAvailableInvitationIntroPresets();
assert.equal(presets.length, 1, 'Only the one real verified GIF is selectable');
assert.equal(INVITATION_INTRO_PRESETS.length, 1);
assert.equal(presets[0].id, 'intro-01');
assert.equal(presets[0].durationMs, 2000);
assert.equal(presets[0].gifSrc, '/assets/invitation-intro/universal-2s.gif');
assert.equal(presets[0].posterSrc, '/assets/invitation-intro/poster.webp');
assert.equal(getInvitationIntroPreset('intro-01')?.id, 'intro-01');
for (const invalid of ['intro-02', 'UNVERIFIED', '../secret', '', null, undefined, 0, {}, []]) {
  assert.equal(getInvitationIntroPreset(invalid), null, 'Unverified IDs are never selectable');
  assert.equal(parseInvitationIntroChoice(invalid), null, 'Unknown must not silently become none');
}
assert.equal(parseInvitationIntroChoice('none'), 'none');
assert.equal(parseInvitationIntroChoice('intro-01'), 'intro-01');
assert.equal(parseInvitationIntroChoice(undefined), null, 'Missing selection is not an implicit default');
assert.deepEqual(listEnabledEventTypes().sort(),
  ['birthday', 'first-birthday', 'general-event', 'opening', 'wedding'].sort(),
  'Intro catalog is not a wedding-only product feature');
assert.equal(normalizeWeddingIntroStyle('cinema'), 'cinema');
assert.equal(normalizeWeddingIntroStyle('light'), 'light');
assert.equal(normalizeWeddingIntroStyle('envelope'), 'envelope');
assert.equal(normalizeWeddingIntroStyle('none'), 'none');

const folder = path.resolve('public/assets/invitation-intro');
const manifest = JSON.parse(readFileSync(path.join(folder, 'manifest.json'), 'utf8'));
assert.equal(manifest.frames, 8);
assert.equal(manifest.total_duration_ms, 2000);
assert.equal(manifest.loop, false);
for (const [filename, entry] of Object.entries(manifest.files) as [string, { bytes: number, sha256: string }][]) {
  const bytes = readFileSync(path.join(folder, filename));
  assert.equal(bytes.length, entry.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
}
assert.equal(manifest.files['universal-2s.gif'].sha256, presets[0].sha256);

function markup(value: null | 'none' | 'intro-01', savedValue: null | 'none' | 'intro-01' = null) {
  return renderToStaticMarkup(createElement(InvitationIntroPicker,
    { value, savedValue, onChange: () => {} }));
}

const unselected = markup(null);
assert.equal((unselected.match(/type="radio"/g) ?? []).length, 2,
  'No selection plus one real preview, not nine placeholder choices');
assert.equal((unselected.match(/checked=""/g) ?? []).length, 0, 'New customer has no forced default');
assert.ok(unselected.includes('미니멀 타이포'));
assert.ok(unselected.includes('사용 안 함'));
assert.ok(unselected.includes(presets[0].posterSrc));
assert.ok(!unselected.includes(presets[0].gifSrc), 'List must load only posters, not GIFs');
assert.ok(!unselected.includes('intro-02'), 'Never advertise an unfinished GIF');
assert.ok(unselected.includes('GIF 미리보기'));
assert.ok(!unselected.includes('현재 적용 중'));

const none = markup('none', 'none');
assert.ok(none.includes('현재 적용 중'));
assert.ok(none.includes('checked=""'));
const pending = markup('intro-01', 'none');
assert.ok(pending.includes('선택이 변경되었습니다'));
assert.ok(pending.includes('현재 적용 중'));

console.log('INTRO_GIF_02A_CATALOG_OK one verified GIF, no phantom choices, all event types, neutral initial state, poster-only SSR, legacy preserved, SHA256 verified');
