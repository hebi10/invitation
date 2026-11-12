import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';
import { getWizardSteps, createInitialWizardConfig, prepareWizardConfigForSave } from '../src/app/page-wizard/pageWizardData.ts';
import { buildWizardSections, flattenWizardSectionStepKeys } from '../src/app/page-wizard/pageWizardSections.ts';
import { buildWizardReviewFacts } from '../src/app/page-wizard/pageWizardWorkspaceState.ts';
import { normalizeFormConfig, prepareConfigForSave } from '../src/app/page-wizard/pageWizardEditorUtils.ts';
import { mergeInvitationPageSeed } from '../src/lib/invitationPagePersistence.ts';
import { buildServerTrustedMobileInvitationPageConfigForSave } from '../src/server/invitationContentSavePolicy.ts';
import { listEnabledEventTypes } from '../src/lib/eventTypes.ts';
import type { InvitationIntroChoice } from '../src/lib/invitationIntroCatalog.ts';

for (const eventType of listEnabledEventTypes()) {
  const steps = getWizardSteps({ eventType, includeSetupSteps: false, includeMusic: false });
  const ids = steps.map((step) => step.key);
  assert.equal(ids.filter((id) => id === 'intro').length, 1, eventType + ': one intro step regardless of music product');
  assert.ok(ids.indexOf('intro') > ids.indexOf('images'), eventType + ': intro follows photographs');
  assert.ok(ids.indexOf('intro') < ids.indexOf('final'), eventType + ': intro before final save');
  const sections = buildWizardSections(steps, eventType);
  assert.equal(sections.filter((section) => section.id === 'intro').length, 1, eventType + ': visible shared intro section');
  assert.deepEqual(flattenWizardSectionStepKeys(sections), ids, eventType + ': no lost or duplicated wizard steps');
  const newPage = createInitialWizardConfig(eventType);
  assert.equal(newPage.introPresetId, undefined, eventType + ': never force a new preset');
}
const original = structuredClone(getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna'));
const oldStyle = { ...original, introStyle: 'cinema' as const };
assert.equal(oldStyle.introPresetId, undefined);

for (const value of ['none', 'intro-01'] as const satisfies readonly InvitationIntroChoice[]) {
  const draft = normalizeFormConfig({ ...oldStyle, introPresetId: value });
  const formPrepared = prepareConfigForSave(draft, original.slug);
  const outgoing = prepareWizardConfigForSave(formPrepared, original.slug);
  const serverStored = mergeInvitationPageSeed(oldStyle, outgoing as unknown as Record<string, unknown>);
  assert.ok(serverStored, 'Shared server must accept a valid customer-selected intro');
  assert.equal(serverStored.introPresetId, value);
  assert.equal(serverStored.introStyle, 'cinema', 'Legacy intro must not be rewritten or deleted');
  const reloaded = normalizeFormConfig(serverStored);
  assert.equal(reloaded.introPresetId, value, 'PC reload preserves customer selection');

  const legacyAndroid = { ...serverStored };
  delete legacyAndroid.introPresetId;
  const trusted = buildServerTrustedMobileInvitationPageConfigForSave(legacyAndroid, serverStored);
  assert.equal(trusted.introPresetId, value, 'Older Android client omitted field, server preserves PC preset');
  const afterAndroid = mergeInvitationPageSeed(serverStored, trusted as unknown as Record<string, unknown>);
  assert.equal(afterAndroid?.introPresetId, value, 'Android roundtrip cannot erase selected preset');

  assert.equal(mergeInvitationPageSeed(serverStored, { introPresetId: 'intro-99' })?.introPresetId, value,
    'A missing/unverified future preset must not overwrite a verified saved ID');
  assert.equal(mergeInvitationPageSeed(serverStored, { description: '다른 문구' })?.introPresetId, value);
  const introFact = buildWizardReviewFacts(serverStored, true).find((fact) => fact.label === '첫 화면 연출');
  assert.equal(introFact?.value, value === 'none' ? '사용 안 함' : '미니멀 라인');
}
assert.equal(mergeInvitationPageSeed(oldStyle, {})?.introPresetId, undefined,
  'Legacy users must not silently receive a new GIF');
assert.equal(mergeInvitationPageSeed(oldStyle, { introPresetId: 'intro-unknown' })?.introPresetId, undefined);
assert.equal(buildWizardReviewFacts(oldStyle, true).find((fact) => fact.label === '첫 화면 연출')?.value,
  '웨딩 화보형', 'Legacy display remains correct');

const client = readFileSync('src/app/page-wizard/PageWizardClient.tsx', 'utf8');
assert.match(client, /case 'intro':/);
assert.match(client, /IntroCatalogSettings \{\.\.\.sharedProps\} savedValue=\{savedIntroPresetId\}/);
assert.match(client, /setSavedIntroPresetId\(parseInvitationIntroChoice\(config\.introPresetId\)\)/);
assert.match(client, /setSavedIntroPresetId\(parseInvitationIntroChoice\(nextConfig\.introPresetId\)\)/);
assert.doesNotMatch(client, /case 'music':[\s\S]{0,140}<IntroSettings/,
  'Do not expose legacy 3-option picker alongside the new GIF selector');
const shared = readFileSync('src/server/invitationContentSavePolicy.ts', 'utf8');
assert.match(shared, /requestedConfig\.introPresetId \?\? currentConfig\.introPresetId/);

Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);
const { default: IntroCatalogSettings } = await import('../src/app/page-wizard/steps/IntroCatalogSettings.tsx');
const noop = () => {};
const markup = renderToStaticMarkup(React.createElement(IntroCatalogSettings, {
  formState: normalizeFormConfig(oldStyle),
  previewFormState: normalizeFormConfig(oldStyle),
  updateForm: noop,
  savedValue: null,
}));
assert.match(markup, /기존 인트로 설정/);
assert.match(markup, /웨딩 화보형/);
assert.match(markup, /GIF 미리보기/);
assert.doesNotMatch(markup, /checked=""/, 'No implicit preset chosen for legacy customer');
assert.doesNotMatch(markup, /universal-2s\.gif/, 'SSR lists poster only');
console.log('INTRO_GIF_02B_PC_OK five event types, optional UI, PC save/reload, Android omission protection, legacy compatibility, SSR');
