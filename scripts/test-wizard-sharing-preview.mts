import assert from 'node:assert/strict';
import { register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialWizardConfig } from '../src/app/page-wizard/pageWizardData.ts';

Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);

const { default: FinalStep } = await import('../src/app/page-wizard/steps/FinalStep.tsx');
const { default: ImagesStep } = await import('../src/app/page-wizard/steps/ImagesStep.tsx');
const noop = () => {};
const config = createInitialWizardConfig('wedding');
config.metadata.title = '직접 작성한 제목';
config.metadata.description = '직접 작성한 설명';
config.metadata.openGraph.title = '저장된 링크 제목';
config.metadata.openGraph.description = '저장된 링크 설명';
config.metadata.images.wedding = '/images/cover.jpg';
config.metadata.images.social = '/images/custom-social.jpg';
config.metadata.images.kakaoCard = '/images/custom-kakao.jpg';
let updates = 0;
const imageProps: React.ComponentProps<typeof ImagesStep> = {
  formState: config, previewFormState: config, updateForm: () => { updates += 1; },
  canUploadImages: true, maxGalleryImages: 18, uploadingField: null,
  coverUploadInputRef: React.createRef(), sharePreviewUploadInputRef: React.createRef(),
  kakaoCardUploadInputRef: React.createRef(), galleryUploadInputRef: React.createRef(),
  onTriggerPicker: noop, onCoverUpload: noop, onSharePreviewUpload: noop,
  onKakaoCardUpload: noop, onGalleryUpload: noop, onCoverImageRemove: noop,
  onSharePreviewImageRemove: noop, onKakaoCardImageRemove: noop,
  onGalleryImageRemove: noop, onGalleryImageMove: noop,
};
const renderFinal = (admin = false) => renderToStaticMarkup(React.createElement(FinalStep, {
  formState: config, previewFormState: config, updateForm: () => { updates += 1; },
  published: true, setPublished: noop, canManagePublication: admin,
}, React.createElement(ImagesStep, { ...imageProps, mode: 'sharing' })));

const customer = renderFinal();
const beforeDetails = customer.slice(0, customer.indexOf('<details'));
assert.equal((beforeDetails.match(/<img\b/g) ?? []).length, 1,
  'Final review shows one link card before optional sharing controls');
assert.match(beforeDetails, /src="\/images\/custom-social.jpg"/,
  'An existing custom social image takes priority over the cover image');
assert.match(beforeDetails, /저장된 링크 제목/);
assert.match(beforeDetails, /저장된 링크 설명/);
assert.doesNotMatch(customer, /<details[^>]*\bopen(?:=|\s|>)/,
  'Sharing controls start collapsed');
const details = customer.match(/<details\b[\s\S]*?<\/details>/)?.[0] ?? '';
assert.match(details, /공유 이미지·문구 변경/);
assert.match(details, /value="직접 작성한 제목"/);
assert.match(details, /직접 작성한 설명<\/textarea>/);
assert.match(details, /src="\/images\/custom-social.jpg"/);
assert.match(details, /src="\/images\/custom-kakao.jpg"/);
assert.doesNotMatch(customer, /저장 후 바로 공개하기/,
  'Customer review must not introduce publication controls');
const admin = renderFinal(true);
assert.ok(admin.indexOf('저장 후 바로 공개하기') > admin.indexOf('</details>'),
  'Administrator publication remains visible outside optional sharing controls');

config.metadata.images.social = '';
const defaultCard = renderFinal().split('<details')[0];
assert.match(defaultCard, /src="\/images\/cover.jpg"/,
  'The cover image is used when no social image was saved');
const photos = renderToStaticMarkup(React.createElement(ImagesStep, { ...imageProps, mode: 'photos' }));
assert.doesNotMatch(photos, /대표 이미지를 등록하지 않으면/,
  'A populated cover must not show the empty-cover warning');
config.metadata.images.wedding = '';
const emptyPhotos = renderToStaticMarkup(React.createElement(ImagesStep, { ...imageProps, mode: 'photos' }));
assert.match(emptyPhotos, /대표 이미지를 등록하지 않으면/);
assert.equal(updates, 0, 'Previewing or collapsing shared content never mutates saved draft fields');
assert.equal(config.metadata.title, '직접 작성한 제목');
assert.equal(config.metadata.description, '직접 작성한 설명');
assert.equal(config.metadata.images.kakaoCard, '/images/custom-kakao.jpg');

console.log('Wizard sharing preview fallback and disclosure checks passed');
