import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  INVITATION_INTRO_PRESETS,
  listAvailableInvitationIntroGroups,
  listAvailableInvitationIntroPresets,
  getInvitationIntroPreset,
  parseInvitationIntroChoice,
  assertInvitationIntroChoiceForEvent,
  InvitationIntroEventError,
} from '../src/lib/invitationIntroCatalog.ts';
import { listEnabledEventTypes } from '../src/lib/eventTypes.ts';
import { mergeInvitationPageSeed } from '../src/lib/invitationPagePersistence.ts';
import { resolvePublicInvitationIntro } from '../src/lib/publicInvitationIntro.ts';
import { createInvitationPageFromSeed, getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';
import { buildServerTrustedMobileInvitationPageConfigForSave } from '../src/server/invitationContentSavePolicy.ts';
import { buildInvitationIntroSamplePreviewUrl } from '../apps/mobile/src/lib/weddingIntroPreview.ts';

const ids = Array.from({ length: 12 }, (_, i) => `intro-${String(i+1).padStart(2,'0')}`);
const events = listEnabledEventTypes();
assert.deepEqual(INVITATION_INTRO_PRESETS.map(p => p.id), ids);
const map = [
  ['simple', '심플'], ['emotional', '감성'], ['luxury', '화려'], ['character', '캐릭터'],
];
assert.deepEqual(listAvailableInvitationIntroGroups('wedding').map(x=>[x.id,x.label]), map);
for (const eventType of events) {
  const isWedding = eventType === 'wedding';
  const supported = listAvailableInvitationIntroPresets(eventType);
  assert.deepEqual(supported.map(x=>x.id), isWedding ? ids : ids.slice(0, 6));
  assert.deepEqual(listAvailableInvitationIntroGroups(eventType).map(x=>x.id),
    isWedding ? ['simple', 'emotional', 'luxury', 'character'] : ['simple', 'emotional']);
  for (const id of ids) {
    const allowed = isWedding || Number(id.slice(-2)) < 7;
    assert.equal(getInvitationIntroPreset(id, eventType)?.id ?? null, allowed ? id : null);
    assert.equal(parseInvitationIntroChoice(id, eventType), allowed ? id : null);
    assert.equal(resolvePublicInvitationIntro(id,'cinema',eventType).kind,
      allowed ? 'gif' : 'none', `${eventType}/${id} public gating`);
    if (allowed) {
      assert.doesNotThrow(() => assertInvitationIntroChoiceForEvent(id,eventType));
    } else {
      assert.throws(() => assertInvitationIntroChoiceForEvent(id,eventType),
        (e) => e instanceof InvitationIntroEventError && e.status === 400 &&
          e.code === 'INTRO_PRESET_EVENT_NOT_ALLOWED');
    }
  }
  assert.equal(resolvePublicInvitationIntro('none','cinema',eventType).kind,'none');
  assert.equal(resolvePublicInvitationIntro('intro-99','none',eventType).kind,'none');
}
assert.deepEqual(resolvePublicInvitationIntro(undefined,'cinema','wedding'), {kind:'legacy-wedding',style:'cinema'});
const seed = structuredClone(getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna'));
const weddingSaved = mergeInvitationPageSeed(seed, { introStyle: 'cinema', introPresetId: 'intro-12' });
assert.equal(weddingSaved?.introPresetId, 'intro-12');
const weddingPage = createInvitationPageFromSeed(weddingSaved!);
assert.equal(resolvePublicInvitationIntro(weddingPage.introPresetId,weddingPage.introStyle,'wedding').kind,'gif');
const birthday = { ...seed, eventType: 'birthday' as const, introStyle: 'none' as const, introPresetId: undefined };
const birthdayStored = mergeInvitationPageSeed(birthday, {introPresetId: 'intro-05'});
assert.equal(birthdayStored?.introPresetId,'intro-05');
assert.equal(mergeInvitationPageSeed(birthdayStored!,{introPresetId:'intro-11'})?.introPresetId,'intro-05',
  'Persistence must not overwrite saved nonwedding ID with wedding-only choice');
const legacyBirthdaySave = buildServerTrustedMobileInvitationPageConfigForSave(
  { ...birthdayStored!, introPresetId: undefined }, birthdayStored!);
assert.equal(legacyBirthdaySave.introPresetId,'intro-05','Older Android omission preserves PC preset');
assert.equal(mergeInvitationPageSeed(birthdayStored!, {description:'Unrelated description'} )?.introPresetId,'intro-05');
for (const eventType of events) {
  const base = { ...seed, eventType, introStyle: 'cinema' as const, introPresetId: undefined };
  for (const preset of listAvailableInvitationIntroPresets(eventType)) {
    const saved = mergeInvitationPageSeed(base, { introPresetId: preset.id });
    assert.equal(saved?.introPresetId, preset.id, `${eventType} PC save: ${preset.id}`);
    assert.equal(saved?.introStyle, 'cinema', 'Preserve legacy intro style');
    const restored = buildServerTrustedMobileInvitationPageConfigForSave(
      { ...saved!, introPresetId: undefined }, saved!);
    assert.equal(restored.introPresetId, preset.id, `${eventType}: older Android omission`);
    const page = createInvitationPageFromSeed(saved!);
    assert.equal(resolvePublicInvitationIntro(page.introPresetId, page.introStyle, eventType).kind,
      'gif', `${eventType}: public preview restores saved ${preset.id}`);
  }
}
const preview = new URL(buildInvitationIntroSamplePreviewUrl('https://example.com/','intro-05','opening'));
assert.equal(preview.pathname,'/mobile-gif-intro-preview/');
assert.equal(preview.searchParams.get('preset'),'intro-05');
assert.equal(preview.searchParams.get('event'),'opening');
assert.equal(preview.searchParams.has('slug'),false);
assert.equal(preview.searchParams.has('token'),false);
assert.throws(() => buildInvitationIntroSamplePreviewUrl('https://example.com/','intro-10','opening'));

const read = (p:string) => readFileSync(p,'utf8');
const pcPicker=read('src/components/sections/InvitationIntro/InvitationIntroPicker.tsx');
const pcStep=read('src/app/page-wizard/steps/IntroCatalogSettings.tsx');
const mobile=read('apps/mobile/src/features/manage/components/steps/SettingsEditorStep.tsx');
const mobileContainer=read('apps/mobile/src/features/manage/components/ManageEditorStepContent.tsx');
const screen=read('apps/mobile/src/features/screens/manage.tsx');
const server=read('src/server/invitationPageServerService.ts');
const mobileRoute=read('src/app/mobile-gif-intro-preview/page.tsx');
assert.match(pcPicker,/listAvailableInvitationIntroPresets\(eventType\)/);
assert.match(pcPicker,/data-intro-group="all"/);
assert.match(pcPicker,/visiblePresets\.map/);
assert.match(pcStep,/eventType=\{eventType\}/);
assert.match(mobile,/listAvailableInvitationIntroPresets\(eventType\)/);
assert.match(mobile,/setActiveGroup\(group\.id\)/);
assert.match(mobileContainer,/eventType=\{eventType\}/);
assert.match(screen,/eventType=\{normalizeEventTypeKey\(dashboard\?\.page\.config\.eventType\)\}/);
assert.match(mobileRoute,/getInvitationIntroPreset\(preset, eventType\)/);
assert.match(server,/assertInvitationIntroChoiceForEvent/);
for (const route of [
  'src/app/api/customer/events/[slug]/editable/route.ts',
  'src/app/api/mobile/client-editor/pages/[slug]/route.ts',
  'src/app/api/client-editor/pages/[slug]/route.ts',
]) {
  assert.match(read(route), /error instanceof InvitationIntroEventError/,
    `${route} must return safe 400 rather than 500 on unsupported selection`);
}
const publicUI = read('src/components/sections/InvitationIntro/PublicInvitationGifIntro.tsx');
assert.doesNotMatch(publicUI,/setTimeout|setInterval|router\.push/,
  '2s asset length must never trigger automatic entry');
console.log('INTRO_GIF_03D_OK 12 verified presets, 5 event types, 12/6 gallery, PC/Android saves, server 400, legacy preservation, preview guard');
