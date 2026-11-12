import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  resolvePublicInvitationIntro,
  publicInvitationGifIntroSessionKey,
  shouldShowPublicInvitationGifIntro,
} from '../src/lib/publicInvitationIntro.ts';
import { listEnabledEventTypes } from '../src/lib/eventTypes.ts';
import { getInvitationIntroPreset } from '../src/lib/invitationIntroCatalog.ts';
import { mergeInvitationPageSeed } from '../src/lib/invitationPagePersistence.ts';
import { getRequiredWeddingPageBySlug, createInvitationPageFromSeed } from '../src/config/weddingPages.ts';

const events = listEnabledEventTypes();
assert.deepEqual([...events].sort(), ['birthday', 'first-birthday', 'general-event', 'opening', 'wedding'].sort());

for (const eventType of events) {
  const selected = resolvePublicInvitationIntro('intro-01', 'cinema', eventType);
  assert.equal(selected.kind, 'gif', `${eventType} must display customer-selected GIF`);
  if (selected.kind === 'gif') {
    assert.equal(selected.preset.id, 'intro-01');
    assert.equal(selected.preset.durationMs, 2000);
  }
  assert.equal(resolvePublicInvitationIntro('none', 'cinema', eventType).kind, 'none',
    `${eventType} explicit none suppresses all other intros`);
  assert.notEqual(resolvePublicInvitationIntro('intro-99', 'cinema', eventType).kind, 'gif',
    `${eventType} unavailable GIF must not be guessed`);
  assert.equal(resolvePublicInvitationIntro(undefined, 'none', eventType).kind, 'none',
    `${eventType} missing preference must not apply GIF automatically`);
}
assert.deepEqual(resolvePublicInvitationIntro(undefined, 'cinema', 'wedding'), {
  kind: 'legacy-wedding', style: 'cinema',
});
assert.deepEqual(resolvePublicInvitationIntro('future-intro', 'envelope', 'wedding'), {
  kind: 'legacy-wedding', style: 'envelope',
}, 'unknown future ID preserves old working wedding intro');
assert.equal(resolvePublicInvitationIntro(undefined, 'cinema', 'opening').kind, 'none',
  'wedding-only legacy animation must never leak into a nonwedding event');
assert.equal(getInvitationIntroPreset('intro-02'), null, 'Do not expose unproduced GIF cards');

const seed = getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna');
const stored = mergeInvitationPageSeed(seed, { introStyle: 'cinema', introPresetId: 'intro-01' });
assert.ok(stored);
assert.equal(createInvitationPageFromSeed(stored).introPresetId, 'intro-01',
  'server seed to public page must preserve selected ID');
const disabled = mergeInvitationPageSeed(stored, { introPresetId: 'none' });
assert.equal(disabled?.introPresetId, 'none');
assert.equal(createInvitationPageFromSeed(disabled!).introStyle, 'cinema',
  'explicit GIF none does not mutate historical introStyle field');
const unknown = mergeInvitationPageSeed(stored, { introPresetId: 'intro-99' });
assert.equal(unknown?.introPresetId, 'intro-01',
  'unverified future preset must not overwrite stored customer selection');

assert.equal(shouldShowPublicInvitationGifIntro({ hash: '', seen: false }), true);
assert.equal(shouldShowPublicInvitationGifIntro({ hash: '#guestbook', seen: false }), false);
assert.equal(shouldShowPublicInvitationGifIntro({ hash: '', seen: true }), false);
assert.equal(shouldShowPublicInvitationGifIntro({ hash: '#guestbook', seen: true, preview: true }), true);
assert.notEqual(publicInvitationGifIntroSessionKey('sample', 'intro-01'),
  publicInvitationGifIntroSessionKey('sample', 'intro-02'), 'each saved preset has a distinct session key');

const routes = [
  ['src/app/_components/EventInvitationPage.tsx', 'wedding'],
  ['src/app/_components/firstBirthday/FirstBirthdayInvitationPage.tsx', 'first-birthday'],
  ['src/app/_components/birthday/BirthdayInvitationPage.tsx', 'birthday'],
  ['src/app/_components/opening/OpeningInvitationPage.tsx', 'opening'],
  ['src/app/_components/generalEvent/GeneralEventInvitationPage.tsx', 'general-event'],
] as const;

for (const [file, eventType] of routes) {
  const code = readFileSync(file, 'utf8');
  assert.match(code, /resolvePublicInvitationIntro\(/, `${eventType} resolves saved customer ID`);
  assert.match(code, /\.pageConfig\.introPresetId/, `${eventType} reads saved ID`);
  assert.match(code, /introDecision\.kind === 'gif'/, `${eventType} gates GIF on registered ID`);
  assert.match(code, /<PublicInvitationGifIntro/, `${eventType} renders shared GIF`);
  assert.match(code, /queryScope === 'experience'/, `${eventType} also covers owner preview`);
  assert.ok(code.indexOf("state.status !== 'ready'") < code.indexOf('<PublicInvitationGifIntro'),
    `${eventType} must gate blocked/unloaded pages before intro`);
}

const wedding = readFileSync('src/app/_components/EventInvitationPage.tsx', 'utf8');
assert.match(wedding, /introDecision\.kind === 'legacy-wedding'/, 'Legacy wedding intro is conditional');
assert.doesNotMatch(wedding, /normalizeWeddingIntroStyle\(readyState\.pageConfig\.introStyle\) !== 'none'/,
  'Do not display both legacy and new selected GIF');
for (const file of [
  'src/app/_components/public-invitations/opening/studio-opening/Page.tsx',
  'src/app/_components/public-invitations/opening/opening-poster/Page.tsx',
  'src/app/_components/public-invitations/general-event/night-schedule/Page.tsx',
  'src/app/_components/public-invitations/general-event/program-edition/Page.tsx',
]) {
  assert.doesNotMatch(readFileSync(file, 'utf8'), /<PublicInvitationGifIntro/,
    'Do not render duplicate GIF in child template and event wrapper');
}

const ui = readFileSync('src/components/sections/InvitationIntro/PublicInvitationGifIntro.tsx', 'utf8');
assert.match(ui, /useDialogLayer/, 'Dialog focus and scroll lock reuse existing app behavior');
assert.match(ui, /sessionStorage\.setItem/, 'Dismissed intro is remembered for current session');
assert.match(ui, /window\.location\.hash/, 'Deep links skip blocking intro');
assert.match(ui, /prefers-reduced-motion/, 'Motion preference respects poster mode');
assert.match(ui, /preset\.posterSrc/, 'Image failure must use poster');
assert.match(ui, /setGifError\(true\)/);
assert.match(ui, /\?replay=\$\{replay\}/, 'Replay requires explicit action');
assert.match(ui, /초대장 보기/);
assert.doesNotMatch(ui, /setTimeout|setInterval|location\.assign|router\.push/,
  'No automatic entry or additional navigation when GIF reaches 2s');
assert.match(readFileSync('src/app/intro-public-qa/page.tsx', 'utf8'), /NODE_ENV !== 'development'/,
  'QA fixture must never be served in production');

console.log('INTRO_GIF_02D_PUBLIC_OK five event types, legacy, none, storage, modal, reduced motion, no timed entry');
