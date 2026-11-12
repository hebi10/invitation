import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  listAvailableInvitationIntroPresets,
  parseInvitationIntroChoice,
} from '../src/lib/invitationIntroCatalog.ts';
import { buildConfigFromForm } from '../apps/mobile/src/features/manage/buildConfigFromForm.ts';
import { buildManageFormFromDashboard } from '../apps/mobile/src/features/manage/shared.ts';
import { buildInvitationIntroSamplePreviewUrl } from '../apps/mobile/src/lib/weddingIntroPreview.ts';
import type { MobileInvitationDashboard, MobileInvitationSeed } from '../apps/mobile/src/types/mobileInvitation.ts';

const original: MobileInvitationSeed = {
  slug: 'intro-02c-fixture',
  displayName: '샘플',
  description: '',
  date: '2027-04-17',
  venue: '예식장',
  groomName: '신랑',
  brideName: '신부',
  couple: { groom: { name: '신랑' }, bride: { name: '신부' } },
  introStyle: 'cinema',
  metadata: { title: '샘플', description: '샘플' },
  pageData: {},
};

function dashboardWith(config: MobileInvitationSeed): MobileInvitationDashboard {
  return {
    page: {
      slug: config.slug,
      config,
      version: 1,
      published: false,
      defaultTheme: 'simple',
      features: {
        maxGalleryImages: 10,
        showMusic: false,
        showCountdown: false,
        showGuestbook: false,
        shareMode: 'link',
      },
    },
  } as MobileInvitationDashboard;
}

assert.deepEqual(listAvailableInvitationIntroPresets().map((preset) => preset.id),
  Array.from({ length: 10 }, (_, index) => `intro-${String(index + 1).padStart(2, '0')}`));
assert.equal(parseInvitationIntroChoice('intro-99'), null, 'Do not offer unverified GIF assets');

const legacyDashboard = dashboardWith(original);
const untouchedLegacyForm = buildManageFormFromDashboard(legacyDashboard);
assert.equal(untouchedLegacyForm.introPresetId, undefined);
assert.equal(untouchedLegacyForm.introStyle, 'cinema');
const untouchedLegacySave = buildConfigFromForm({
  dashboard: legacyDashboard,
  form: untouchedLegacyForm,
});
assert.equal(untouchedLegacySave.introPresetId, undefined, 'Do not select GIF automatically');
assert.equal(untouchedLegacySave.introStyle, 'cinema');

for (const choice of ['intro-01', 'none'] as const) {
  const outgoing = buildConfigFromForm({
    dashboard: legacyDashboard,
    form: { ...untouchedLegacyForm, introPresetId: choice },
  });
  assert.equal(outgoing.introPresetId, choice, 'Android saves explicit customer choice');
  assert.equal(outgoing.introStyle, 'cinema', 'Legacy intro field remains untouched');

  const rehydrated = buildManageFormFromDashboard(dashboardWith(outgoing));
  assert.equal(rehydrated.introPresetId, choice, 'PC/Android stored choice is restored');
}

const pcSelection = { ...original, introPresetId: 'intro-01' as const };
const pcDashboard = dashboardWith(pcSelection);
const pcForm = buildManageFormFromDashboard(pcDashboard);
assert.equal(pcForm.introPresetId, 'intro-01');
assert.equal(buildConfigFromForm({ dashboard: pcDashboard, form: pcForm }).introPresetId, 'intro-01',
  'Android content-only edit preserves PC selection');

const unknownConfig = { ...original, introPresetId: 'intro-99' } as unknown as MobileInvitationSeed;
const unknownDashboard = dashboardWith(unknownConfig);
const unknownForm = buildManageFormFromDashboard(unknownDashboard);
assert.equal(unknownForm.introPresetId, undefined, 'Unsupported future ID is not falsely selected');
assert.equal(buildConfigFromForm({ dashboard: unknownDashboard, form: unknownForm }).introPresetId,
  'intro-09', 'Unrelated Android edit must not overwrite unknown future ID');
assert.equal(buildConfigFromForm({
  dashboard: unknownDashboard,
  form: { ...unknownForm, introPresetId: 'none' },
}).introPresetId, 'none', 'Explicit customer choice may replace unknown ID');

const previewUrl = new URL(buildInvitationIntroSamplePreviewUrl('https://example.com/', 'intro-01'));
assert.equal(previewUrl.pathname, '/mobile-gif-intro-preview/');
assert.equal(previewUrl.searchParams.get('preset'), 'intro-01');
assert.equal(previewUrl.searchParams.has('slug'), false, 'No private customer slug in preview');
assert.equal(previewUrl.searchParams.has('token'), false, 'No customer session token in preview');

const settings = readFileSync('apps/mobile/src/features/manage/components/steps/SettingsEditorStep.tsx', 'utf8');
const form = readFileSync('apps/mobile/src/features/manage/hooks/useInvitationForm.ts', 'utf8');
const screen = readFileSync('apps/mobile/src/features/screens/manage.tsx', 'utf8');
const webPreview = readFileSync('src/app/mobile-gif-intro-preview/MobileGifIntroPreviewClient.tsx', 'utf8');
const webRoute = readFileSync('src/app/mobile-gif-intro-preview/page.tsx', 'utf8');

assert.match(settings, /listAvailableInvitationIntroPresets\(\)\.map/, 'Only actual catalog entries in Android');
assert.match(settings, /onSetIntroPresetId\('none'\)/);
assert.match(settings, /onPreviewIntroPreset\(preset\.id\)/, 'Preview must be separate from selection');
assert.doesNotMatch(settings, /WEDDING_INTRO_OPTIONS\.map/, 'Do not show legacy options as new GIF choices');
assert.match(settings, /savedIntroPresetId === preset\.id/, 'Saved vs pending state');
assert.match(form, /setSavedIntroPresetId\(persistedIntroChoice\)/);
assert.match(form, /setIsFormDirty\(false\)/, 'Existing discard workflow remains');
assert.match(screen, /WebBrowser\.openBrowserAsync\(url/, 'Use existing Android browser preview flow');
assert.match(webPreview, /prefers-reduced-motion/);
assert.match(webPreview, /preset\.posterSrc/);
assert.match(webPreview, /onError/);
assert.match(webPreview, /replay=/, 'Replay must restart 2s non-looping asset');
assert.match(webRoute, /getInvitationIntroPreset\(preset\)/, 'Reject unverified preset IDs');
assert.doesNotMatch(webPreview, /setTimeout|router\.push|window\.location/, 'Preview never auto-enters or saves');

console.log('INTRO_GIF_02C_ANDROID_OK legacy, PC roundtrip, unknown ID, explicit none, preview safety');
