import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';
import { normalizeFormConfig, prepareConfigForSave } from '../src/app/page-wizard/pageWizardEditorUtils.ts';
import { mergeInvitationPageSeed } from '../src/lib/invitationPagePersistence.ts';
import { WEDDING_INTRO_OPTIONS, normalizeWeddingIntroStyle, shouldShowWeddingIntro } from '../src/lib/weddingIntro.ts';
import { buildManageFormFromDashboard } from '../apps/mobile/src/features/manage/shared.ts';
import { buildConfigFromForm } from '../apps/mobile/src/features/manage/buildConfigFromForm.ts';
import { buildWeddingIntroSamplePreviewUrl } from '../apps/mobile/src/lib/weddingIntroPreview.ts';
import type { MobileInvitationDashboard } from '../apps/mobile/src/types/mobileInvitation.ts';

const styles = ['none', 'light', 'cinema', 'envelope'] as const;
const enabledStyles = styles.filter(style => style !== 'none');

assert.deepEqual(WEDDING_INTRO_OPTIONS.map(option => option.value), styles);
assert.deepEqual(WEDDING_INTRO_OPTIONS.slice(1).map(option => option.label),
  ['타이포그래피형', '웨딩 화보형', '편지형 초대장'],
  'The shared option registry must label the same designs in PC and Android');

const baseSeed = structuredClone(getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna'));

for (const original of styles) {
  const pcDraft = normalizeFormConfig({ ...baseSeed, introStyle: original });
  const outgoingPC = prepareConfigForSave(pcDraft, baseSeed.slug);
  const pcSaved = mergeInvitationPageSeed(baseSeed, outgoingPC as Record<string, unknown>);
  assert.ok(pcSaved, 'A PC draft must be serializable for the shared server');
  assert.equal(pcSaved.introStyle, original);

  const androidDashboard = {
    page: {
      slug: pcSaved.slug,
      config: pcSaved,
      features: { showMusic: true, maxGalleryImages: 18 },
      published: false,
      defaultTheme: 'simple',
      version: 7,
    },
  } as unknown as MobileInvitationDashboard;
  const androidHydrated = buildManageFormFromDashboard(androidDashboard);
  assert.equal(androidHydrated.introStyle, original, 'Android must read PC-saved style without aliasing');

  for (const selected of styles) {
    const androidDraft = { ...androidHydrated, introStyle: selected };
    const outgoingAndroid = buildConfigFromForm({ dashboard: androidDashboard, form: androidDraft });
    assert.equal(outgoingAndroid.introStyle, selected);
    const sharedSaved = mergeInvitationPageSeed(pcSaved, outgoingAndroid as Record<string, unknown>);
    assert.ok(sharedSaved);
    assert.equal(
      normalizeFormConfig(sharedSaved).introStyle,
      selected,
      'PC must reload Android-saved intro on the shared web renderer'
    );
    const again = buildManageFormFromDashboard({
      ...androidDashboard,
      page: { ...androidDashboard.page, config: sharedSaved },
    });
    assert.equal(again.introStyle, selected, 'Android re-entry must restore saved style');
    assert.equal(normalizeWeddingIntroStyle(selected), selected);
  }
}

assert.equal(normalizeWeddingIntroStyle(undefined), 'none');
assert.equal(normalizeWeddingIntroStyle('legacy-unknown'), 'none');
assert.equal(shouldShowWeddingIntro({ style: 'none', preview: true, hash: '', seen: false }), false);
for (const style of enabledStyles) {
  assert.equal(shouldShowWeddingIntro({ style, preview: true, hash: '#calendar', seen: true }), true);
  assert.equal(shouldShowWeddingIntro({ style, preview: false, hash: '', seen: false }), true);
  assert.equal(shouldShowWeddingIntro({ style, preview: false, hash: '#calendar', seen: false }), false);
  assert.equal(shouldShowWeddingIntro({ style, preview: false, hash: '', seen: true }), false);
}

for (const style of styles) {
  const url = buildWeddingIntroSamplePreviewUrl('https://invite.msgnote.kr/editor?secret=value#private', style);
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://invite.msgnote.kr');
  assert.equal(parsed.pathname, '/mobile-intro-preview/');
  assert.equal(parsed.searchParams.get('style'), style);
  assert.deepEqual([...parsed.searchParams.keys()], ['style'], 'Sample preview must carry only selected style');
  assert.equal(parsed.hash, '');
  assert.doesNotMatch(url, /secret|private|ownerUid|accessToken|groomName|brideName/);
}

const androidSettings = readFileSync('apps/mobile/src/features/manage/components/steps/SettingsEditorStep.tsx', 'utf8');
const androidScreen = readFileSync('apps/mobile/src/features/screens/manage.tsx', 'utf8');
const androidFormHook = readFileSync('apps/mobile/src/features/manage/hooks/useInvitationForm.ts', 'utf8');
const androidOps = readFileSync('apps/mobile/src/contexts/InvitationOpsContext.tsx', 'utf8');
const pcSettings = readFileSync('src/app/page-wizard/steps/IntroSettings.tsx', 'utf8');
const pcPreview = readFileSync('src/app/page-wizard/WeddingWizardPreview.tsx', 'utf8');
const pcPreviewChild = readFileSync('src/app/wizard-preview/WizardPreviewClient.tsx', 'utf8');

assert.match(androidSettings, /WEDDING_INTRO_OPTIONS\.map/);
assert.match(androidSettings, /onSetIntroStyle\(option\.value\)/);
assert.match(androidSettings, /onPreviewIntro\(option\.value\)/);
assert.match(androidSettings, /form\.introStyle === option\.value/);
assert.match(androidScreen, /buildWeddingIntroSamplePreviewUrl\(apiBaseUrl, style\)/);
assert.match(androidScreen, /WebBrowser\.openBrowserAsync\(url,/);
assert.match(androidScreen, /onSetIntroStyle=\{invitationForm\.setIntroStyle\}/);
assert.match(androidScreen, /invitationForm\.persistForm\(/);
assert.match(androidFormHook, /if \(form\.introStyle === introStyle\) return/);
assert.match(androidFormHook, /markFormDirty\(\)/);
assert.match(androidFormHook, /introStyle \}\)/);
assert.match(androidFormHook, /buildConfigFromForm\(\{ dashboard, form \}\)/);
assert.match(androidFormHook, /expectedVersion: formVersionRef\.current/);
assert.match(androidOps, /config: trustedConfig/);
assert.match(androidOps, /version: saved\.version/);

assert.match(pcSettings, /WEDDING_INTRO_OPTIONS\.map/);
assert.match(pcSettings, /draft\.introStyle = option\.value/);
assert.match(pcSettings, /wizard-preview-intro/);
assert.match(pcPreview, /introPreview \? \{ \.\.\.formState, introStyle: introPreview\.style \} : formState/);
assert.match(pcPreview, /window\.location\.origin/);
assert.match(pcPreviewChild, /event\.origin !== window\.location\.origin/);
assert.match(pcPreviewChild, /setIntroRun\(run => run \+ 1\)/);
assert.match(pcPreviewChild, /preview/);
assert.match(pcPreviewChild, /connectToCover/);

console.log('Invitation 2-B: PC↔Android 16 save/read roundtrips, shared preview keys, sample-link privacy and UI integration contracts passed');
