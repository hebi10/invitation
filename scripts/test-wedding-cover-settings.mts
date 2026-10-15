import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';
import {
  mergeInvitationPageSeed,
  stripUndefinedDeep,
} from '../src/lib/invitationPagePersistence.ts';
import { normalizeFormConfig, prepareConfigForSave } from '../src/app/page-wizard/pageWizardEditorUtils.ts';
import { buildServerTrustedMobileInvitationPageConfigForSave } from '../src/server/invitationContentSavePolicy.ts';
import {
  buildInvitationPageConfigRecordFromEventContent,
  normalizeEventSummaryRecord,
} from '../src/server/repositories/eventReadThroughDtos.ts';
import type { InvitationPageSeed } from '../src/types/invitationPage.ts';

const original = structuredClone(getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna'));
const defaults = { focusX: 50, focusY: 50, textPosition: 'theme' };
const selected = { focusX: 0, focusY: 100, textPosition: 'top' } as const;

// Rejecting invalid stored coordinates prevents unsafe object-position values from reaching the cover.
assert.deepEqual(mergeInvitationPageSeed(original, {
  pageData: { weddingCover: { focusX: -12, focusY: 120, textPosition: 'unsupported' } },
})?.pageData?.weddingCover, { focusX: 0, focusY: 100, textPosition: 'theme' });

const { normalizeWeddingCoverSettings, resolveWeddingCoverTextPosition } = await import('../src/lib/weddingCover.ts');
for (const value of [undefined, null, false, 12, 'top', [], ['bottom']]) {
  assert.deepEqual(normalizeWeddingCoverSettings(value), defaults, 'Malformed nested settings use a safe centered default');
}
assert.deepEqual(normalizeWeddingCoverSettings({ focusX: 0, focusY: 100, textPosition: 'below' }),
  { focusX: 0, focusY: 100, textPosition: 'below' }, 'Zero must remain a valid focal point');
assert.deepEqual(normalizeWeddingCoverSettings({ focusX: NaN, focusY: Infinity, textPosition: 'invalid' }), defaults);
assert.deepEqual(normalizeWeddingCoverSettings({ focusX: '0', focusY: null, textPosition: {} }), defaults);
assert.deepEqual(normalizeWeddingCoverSettings({ focusX: -1, focusY: 101, textPosition: 'bottom' }),
  { focusX: 0, focusY: 100, textPosition: 'bottom' });
assert.deepEqual(normalizeWeddingCoverSettings({ focusX: 25.5, focusY: 74.5, textPosition: 'top' }),
  { focusX: 25.5, focusY: 74.5, textPosition: 'top' });
for (const theme of ['classic-r', 'modern', 'simple', 'gyeol', 'vow', 'unknown']) {
  assert.equal(resolveWeddingCoverTextPosition(theme, 'theme'), 'below');
}
assert.equal(resolveWeddingCoverTextPosition('romantic', 'theme'), 'bottom');
for (const position of ['below', 'top', 'bottom'] as const) {
  assert.equal(resolveWeddingCoverTextPosition('romantic', position), position);
}

assert.equal(mergeInvitationPageSeed(original, {})?.pageData?.weddingCover, undefined,
  'Reading legacy content does not invent persisted cover settings');
assert.deepEqual(normalizeFormConfig(original).pageData?.weddingCover, defaults,
  'The editor starts legacy wedding settings at the centered theme recommendation');
assert.equal(original.pageData?.weddingCover, undefined, 'Normalization must not mutate the existing seed');

const custom = {
  ...original,
  slug: 'wedding-cover-roundtrip',
  pageData: {
    ...original.pageData,
    weddingCover: selected,
    themeOverrides: { romantic: { weddingCover: { focusX: 25, focusY: 75, textPosition: 'bottom' as const }, greetingMessage: '테마 인사말' } },
  },
};
const prepared = prepareConfigForSave(normalizeFormConfig(custom), custom.slug);
const stored = mergeInvitationPageSeed(original, prepared as unknown as Record<string, unknown>)!;
assert.deepEqual(stored.pageData?.weddingCover, selected, 'Admin form and persistence preserve the chosen focal point and text position');
assert.deepEqual(normalizeFormConfig(stored).pageData?.weddingCover, selected, 'Reload preserves the choice');
assert.deepEqual(mergeInvitationPageSeed(stored, { description: '다른 설명' })?.pageData?.weddingCover, selected);
assert.deepEqual(mergeInvitationPageSeed(stored, { pageData: { greetingMessage: '다른 인사말' } })?.pageData?.weddingCover, selected);
assert.deepEqual(mergeInvitationPageSeed(stored, { pageData: { weddingCover: { focusY: 30 } } })?.pageData?.weddingCover,
  { focusX: 0, focusY: 30, textPosition: 'top' }, 'A partial nested update preserves the remaining coordinates and position');
assert.deepEqual(mergeInvitationPageSeed(stored, {
  pageData: { themeOverrides: { romantic: { weddingCover: { focusX: -10 } } } },
})?.pageData?.themeOverrides?.romantic, {
  weddingCover: { focusX: 0, focusY: 75, textPosition: 'bottom' },
}, 'A partial cover update preserves its coordinates without retaining replaced theme text');
assert.deepEqual(mergeInvitationPageSeed(stored, { pageData: { themeOverrides: {} } })?.pageData?.themeOverrides, {},
  'An explicit empty override map must continue to clear all existing theme overrides');
assert.deepEqual(mergeInvitationPageSeed(stored, {
  pageData: { themeOverrides: { simple: { greetingMessage: '새로운 문구' } } },
})?.pageData?.themeOverrides, { simple: { greetingMessage: '새로운 문구' } },
  'An explicit override map replaces the old themes and contains only the supplied fields');
for (const value of [null, 'invalid', [], 10]) {
  const malformed = mergeInvitationPageSeed(original, { pageData: { weddingCover: value, themeOverrides: { romantic: { weddingCover: value } } } });
  assert.deepEqual(malformed?.pageData?.weddingCover, defaults);
  assert.deepEqual(malformed?.pageData?.themeOverrides?.romantic?.weddingCover, defaults);
  const form = normalizeFormConfig({ ...original, pageData: { weddingCover: value } } as unknown as InvitationPageSeed);
  assert.deepEqual(form.pageData?.weddingCover, defaults);
  assert.deepEqual(prepareConfigForSave(form, original.slug).pageData?.weddingCover, defaults);
}

// Use the repository's actual serializer and read DTO to exercise the stored content boundary.
const eventSummary = normalizeEventSummaryRecord('evt_wedding-cover-roundtrip', {
  slug: custom.slug, eventType: 'wedding', published: false, defaultTheme: 'simple', hasCustomContent: true,
})!;
const contentPayload = stripUndefinedDeep({
  version: 4, schemaVersion: 1, eventType: 'wedding', slug: custom.slug,
  content: stored,
  themeState: { defaultTheme: 'simple', variants: stored.variants },
  productTier: stored.productTier, featureFlags: stored.features,
});
const reloaded = buildInvitationPageConfigRecordFromEventContent(eventSummary, JSON.parse(JSON.stringify(contentPayload)))!;
assert.equal(reloaded.version, 4);
assert.deepEqual(reloaded.config.pageData?.weddingCover, selected);
assert.deepEqual(reloaded.config.pageData?.themeOverrides?.romantic?.weddingCover,
  { focusX: 25, focusY: 75, textPosition: 'bottom' });

function loadPreviewBuilder() {
  const file = 'src/app/wizard-preview/WizardPreviewClient.tsx';
  const exports = {};
  const require = createRequire(new URL(`../${file}`, import.meta.url));
  const dependencies: Record<string, unknown> = {
    '../AppQueryProvider': {},
    '../_components/public-invitations/wedding/WeddingBase': {},
    '../_components/weddingPageRenderers': { withWeddingClosing: () => () => null },
    '@/components/sections/WeddingIntro/WeddingIntro': {},
  };
  runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, console, require(name: string) {
    if (name.endsWith('.module.css')) return { default: {} };
    if (name in dependencies) return dependencies[name];
    return require(name);
  } });
  return exports as Pick<typeof import('../src/app/wizard-preview/WizardPreviewClient'), 'buildPreview'>;
}
const { buildPreview } = loadPreviewBuilder();
assert.deepEqual(buildPreview(reloaded.config, 'simple').pageConfig.pageData?.weddingCover, selected);
assert.deepEqual(buildPreview(reloaded.config, 'romantic').pageConfig.pageData?.weddingCover,
  { focusX: 25, focusY: 75, textPosition: 'bottom' }, 'The live preview must keep the selected theme cover override');
for (const romantic of [{ greetingMessage: '문구만 변경' }, { greetingMessage: '문구만 변경', weddingCover: undefined }]) {
  const inheritedCover = mergeInvitationPageSeed(custom, { pageData: { themeOverrides: { romantic } } })!;
  assert.deepEqual(inheritedCover.pageData?.themeOverrides?.romantic, { greetingMessage: '문구만 변경' },
    'Missing cover overrides must stay absent so the theme inherits global cover settings');
  assert.deepEqual(buildPreview(inheritedCover, 'romantic').pageConfig.pageData?.weddingCover, selected);
  const form = normalizeFormConfig({ ...custom, pageData: { ...custom.pageData, themeOverrides: { romantic } } });
  assert.deepEqual(form.pageData?.themeOverrides?.romantic, { greetingMessage: '문구만 변경' });
  assert.deepEqual(buildPreview(form, 'romantic').pageConfig.pageData?.weddingCover, selected);
}

for (const requestedPageData of [undefined, { greetingMessage: '고객 인사말' }, {
  weddingCover: { focusX: 90, focusY: 10, textPosition: 'below' as const },
  themeOverrides: {
    romantic: { weddingCover: { focusX: 0, focusY: 0, textPosition: 'below' as const }, greetingMessage: '고객 테마 문구' },
    simple: { weddingCover: { focusX: 0, focusY: 0, textPosition: 'below' as const } },
  },
}]) {
  const trusted = buildServerTrustedMobileInvitationPageConfigForSave({ ...custom, pageData: requestedPageData }, custom);
  assert.deepEqual(trusted.pageData?.weddingCover, selected,
    'Customer/mobile requests cannot replace or omit administrator cover settings');
  assert.deepEqual(trusted.pageData?.themeOverrides?.romantic?.weddingCover,
    { focusX: 25, focusY: 75, textPosition: 'bottom' }, 'Theme overrides cannot bypass the administrator cover boundary');
  assert.equal(trusted.pageData?.themeOverrides?.simple?.weddingCover, undefined,
    'Customers cannot introduce a new theme cover override');
  assert.equal(trusted.productTier, custom.productTier);
  assert.deepEqual(trusted.features, custom.features);
  assert.deepEqual(trusted.variants, custom.variants);
}
const withoutAdministratorCover = buildServerTrustedMobileInvitationPageConfigForSave(custom, original);
assert.equal(withoutAdministratorCover.pageData?.weddingCover, undefined);
assert.equal(withoutAdministratorCover.pageData?.themeOverrides?.romantic?.weddingCover, undefined);
const permittedTextChange = buildServerTrustedMobileInvitationPageConfigForSave({
  ...custom, pageData: { themeOverrides: { romantic: { greetingMessage: '허용된 문구 수정' } } },
}, custom);
assert.equal(permittedTextChange.pageData?.themeOverrides?.romantic?.greetingMessage, '허용된 문구 수정',
  'Protecting cover controls must not remove existing customer text editing');
const omittedThemeText = buildServerTrustedMobileInvitationPageConfigForSave({ ...custom, pageData: { themeOverrides: {} } }, custom);
assert.deepEqual(omittedThemeText.pageData?.themeOverrides, {
  romantic: { weddingCover: { focusX: 25, focusY: 75, textPosition: 'bottom' } },
}, 'Customer resets keep only the administrator cover while removing ordinary theme fields');
const currentWithTextOnly = { ...custom, pageData: { ...custom.pageData, themeOverrides: { romantic: { greetingMessage: '기존 문구' } } } };
const clearedTextOnly = buildServerTrustedMobileInvitationPageConfigForSave({ ...custom, pageData: { themeOverrides: {} } }, currentWithTextOnly);
assert.deepEqual(clearedTextOnly.pageData?.themeOverrides, {}, 'Themes with no administrator cover may still be removed');
const trustedTextOnly = buildServerTrustedMobileInvitationPageConfigForSave({
  ...custom, pageData: { themeOverrides: { romantic: { greetingMessage: '고객 문구', weddingCover: selected } } },
}, currentWithTextOnly);
assert.deepEqual(trustedTextOnly.pageData?.themeOverrides, { romantic: { greetingMessage: '고객 문구' } },
  'Removing an unauthorized cover override must not shadow the administrator global cover with undefined');
assert.deepEqual(buildPreview(trustedTextOnly, 'romantic').pageConfig.pageData?.weddingCover, selected);
console.log('Wedding cover normalization, persistence, preview and administrator boundary checks passed');
