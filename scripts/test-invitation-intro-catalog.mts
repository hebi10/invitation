import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  INVITATION_INTRO_PRESETS,
  INVITATION_INTRO_GROUPS,
  getInvitationIntroPreset,
  listAvailableInvitationIntroPresets,
  listAvailableInvitationIntroGroups,
  parseInvitationIntroChoice,
  assertInvitationIntroChoiceForEvent,
  InvitationIntroEventError,
} from '../src/lib/invitationIntroCatalog.ts';
import { listEnabledEventTypes } from '../src/lib/eventTypes.ts';
import {
  listAvailableInvitationIntroPresets as listMobileIntroPresets,
  parseInvitationIntroChoice as parseMobileIntroChoice,
} from '../apps/mobile/src/lib/invitationIntroCatalog.ts';
import { normalizeWeddingIntroStyle } from '../src/lib/weddingIntro.ts';

const ids = Array.from({ length: 12 }, (_, i) => `intro-${String(i+1).padStart(2, '0')}`);
const presets = listAvailableInvitationIntroPresets('wedding');
assert.deepEqual(presets.map(x => x.id), ids, 'wedding must show all 12 registered assets');
assert.deepEqual(listMobileIntroPresets('wedding'), presets, 'Android and PC import the same catalog');
assert.equal(INVITATION_INTRO_PRESETS.length, 12);
assert.deepEqual(INVITATION_INTRO_GROUPS.map(x => x.id), ['simple','emotional','luxury','character']);
assert.deepEqual(listAvailableInvitationIntroGroups('wedding').map(x => x.id),
  ['simple','emotional','luxury','character']);
assert.deepEqual(presets.map(x => x.group), [
  'simple','simple','simple','emotional','emotional','emotional',
  'luxury','luxury','luxury','character','character','character',
]);
assert.equal(presets[0].gifSrc, '/assets/invitation-intro/universal-2s.gif');
assert.equal(presets[0].posterSrc, '/assets/invitation-intro/poster.webp');
assert.equal(presets[0].label, '미니멀 라인');
assert.ok(presets.every(p => p.active && p.durationMs === 2000));
const types = listEnabledEventTypes();
assert.deepEqual([...types].sort(),
  ['birthday','first-birthday','general-event','opening','wedding'].sort());
for (const eventType of types) {
  const expected = eventType === 'wedding' ? ids : ids.slice(0, 6);
  assert.deepEqual(listAvailableInvitationIntroPresets(eventType).map(x => x.id), expected,
    `${eventType} event-safe listing`);
  assert.deepEqual(listMobileIntroPresets(eventType).map(x=>x.id), expected);
  assert.equal(parseInvitationIntroChoice('none', eventType), 'none');
  assert.equal(parseInvitationIntroChoice('intro-06', eventType), 'intro-06');
  assert.equal(parseMobileIntroChoice('intro-07', eventType),
    eventType === 'wedding' ? 'intro-07' : null);
  for (const p of presets) {
    assert.equal(getInvitationIntroPreset(p.id, eventType)?.id ?? null,
      expected.includes(p.id) ? p.id : null,
      `${eventType}: ${p.id} visibility`);
  }
}
for (const invalid of ['intro-99','UNVERIFIED','../secret','',null,undefined,0,{},[]]) {
  assert.equal(getInvitationIntroPreset(invalid), null, 'Unknown assets never selectable');
  assert.equal(parseInvitationIntroChoice(invalid), null, 'Unknown never silently becomes none');
}
assert.equal(parseInvitationIntroChoice(undefined), null);
assert.throws(() => assertInvitationIntroChoiceForEvent('intro-10', 'birthday'),
  InvitationIntroEventError, 'Server must reject wedding-only selection for non-wedding');
assert.doesNotThrow(() => assertInvitationIntroChoiceForEvent('intro-05', 'opening'));
assert.doesNotThrow(() => assertInvitationIntroChoiceForEvent('intro-10', 'wedding'));
assert.doesNotThrow(() => assertInvitationIntroChoiceForEvent(undefined, 'birthday'));
for (const old of ['light','cinema','envelope','none'] as const) {
  assert.equal(normalizeWeddingIntroStyle(old), old, 'Old introStyle unchanged');
}
const folder = path.resolve('public/assets/invitation-intro');
const oldManifest = JSON.parse(readFileSync(path.join(folder,'manifest.json'),'utf8'));
const manifest = JSON.parse(readFileSync(path.join(folder,'manifest-03c.json'),'utf8'));
assert.equal(oldManifest.files['universal-2s.gif'].sha256, presets[0].sha256,
  'Existing intro-01 GIF and SHA must remain unchanged');
assert.equal(oldManifest.files['poster.webp'].sha256,
  '497ed73a363ca4ce0e04f7ab6a19908badbe1b95213672fb29e27fd86eecf0be');
assert.equal(manifest.qa.verified_sets, 11);
assert.equal(Object.keys(manifest.presets).length, 11);
for (const preset of presets) {
  assert.equal(preset.durationMs, 2000);
  const file = path.join(folder, preset.gifSrc.split('/').at(-1)!);
  const bytes = readFileSync(file);
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash, preset.sha256, preset.id + ': checked-in file SHA must match catalog');
  if (preset.id !== 'intro-01') {
    const entry = manifest.presets[preset.id];
    assert.ok(entry, `${preset.id} manifest record`);
    assert.equal(entry.files[preset.id+'.gif'].sha256, hash);
    const posterFile = path.join(folder, preset.posterSrc.split('/').at(-1)!);
    const poster = readFileSync(posterFile);
    assert.equal(createHash('sha256').update(poster).digest('hex'),
      entry.files[preset.id+'.webp'].sha256);
  }
}
Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);
const { default: InvitationIntroPicker } = await import('../src/components/sections/InvitationIntro/InvitationIntroPicker.tsx');
function markup(eventType: typeof types[number], value: null | 'none' | 'intro-01' | 'intro-10' = null,
  savedValue: null | 'none' | 'intro-01' | 'intro-10' = null) {
  return renderToStaticMarkup(React.createElement(InvitationIntroPicker,
    { eventType, value, savedValue, onChange: () => {} }));
}
const wedding = markup('wedding');
const opening = markup('opening');
assert.equal((wedding.match(/type="radio"/g) ?? []).length, 13);
assert.equal((opening.match(/type="radio"/g) ?? []).length, 7);
assert.equal((wedding.match(/data-intro-preset=/g) ?? []).length, 12);
assert.equal((opening.match(/data-intro-preset=/g) ?? []).length, 6);
assert.match(wedding, /data-intro-group="character"/);
assert.doesNotMatch(opening, /data-intro-group="character"/);
assert.doesNotMatch(opening, /intro-07|intro-08|intro-09|intro-10|intro-11|intro-12/);
assert.match(wedding, /심플/);
assert.match(wedding, /화려/);
assert.match(opening, /감성/);
assert.ok(wedding.includes('사용 안 함'));
assert.equal((wedding.match(/checked=""/g) ?? []).length, 0, 'No forced selection');
assert.ok(wedding.includes(presets[0].posterSrc), 'List uses static posters');
for (const p of presets) assert.ok(!wedding.includes(p.gifSrc), 'No eager GIF downloads');
assert.ok(wedding.includes('GIF 미리보기'));
assert.ok(!wedding.includes('현재 적용 중'));
const none = markup('wedding','none','none');
assert.ok(none.includes('현재 적용 중') && none.includes('checked=""'));
const pending = markup('wedding','intro-10','intro-01');
assert.ok(pending.includes('선택이 변경되었습니다'));
assert.ok(pending.includes('현재 적용 중'));

console.log('INTRO_GIF_03D_CATALOG_OK 12 verified presets, event filters 12/6, SHA256 11+legacy, SSR poster-only, preserved customer selection');
