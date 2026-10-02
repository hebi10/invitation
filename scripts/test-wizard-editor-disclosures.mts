import assert from 'node:assert/strict';
import { register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialWizardConfig } from '../src/app/page-wizard/pageWizardData.ts';

Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);

const { PersonEditorCard, GuideSectionPanel, AccountSectionPanel } = await import(
  '../src/app/page-wizard/pageWizardEditorPanels.tsx'
);
const { default: BasicStep } = await import('../src/app/page-wizard/steps/BasicStep.tsx');
const noop = () => {};
const openDisclosures = (html: string) => (html.match(/<details[^>]*\bopen(?:=|\s|>)/g) ?? []).length;

const person = {
  name: '김신랑', order: '장남', phone: '',
  father: { relation: '부', name: '김아버지', phone: '010-1111-2222' },
  mother: { relation: '모', name: '이어머니', phone: '' },
};
const family = renderToStaticMarkup(React.createElement(PersonEditorCard, {
  role: 'groom', label: '신랑측 가족 정보', person, disabled: false,
  nameReadOnly: true, onPersonFieldChange: noop, onParentFieldChange: noop,
}));
assert.equal(openDisclosures(family), 0, 'Optional parents start collapsed even when populated');
assert.match(family, /^<details\b/, 'Optional family and contact fields start inside a collapsed disclosure');
assert.match(family, /<summary[^>]*>[\s\S]*김아버지 · 이어머니[\s\S]*?<\/summary>/);
for (const value of ['김아버지', '이어머니', '010-1111-2222']) {
  assert.ok(family.includes(`value="${value}"`), 'Collapsing must retain saved input values');
}

const guides = renderToStaticMarkup(React.createElement(GuideSectionPanel, {
  kind: 'venueGuide', title: '교통 안내', description: '', disabled: false,
  items: [{ title: '주차 안내', content: '주차장을 이용해 주세요.' }, { title: '', content: '' }],
  onAdd: noop, onRemove: noop, onChange: noop,
}));
assert.equal(openDisclosures(guides), 1, 'Only the new empty guide starts open');
const guideDisclosures = guides.match(/<details\b[^>]*>/g) ?? [];
assert.equal(guideDisclosures.length, 2);
assert.doesNotMatch(guideDisclosures[0], /\bopen=/, 'Existing guide starts collapsed');
assert.match(guideDisclosures[1], /\bopen=/, 'New empty guide starts expanded');
assert.match(guides, /<details[^>]*><summary[^>]*>[\s\S]*?주차 안내/);
assert.ok(guides.includes('주차장을 이용해 주세요.'), 'Existing guide content remains editable');

const complete = { bank: '국민은행', accountNumber: '001-234', accountHolder: '김신랑' };
const renderAccount = (account: typeof complete) => renderToStaticMarkup(React.createElement(AccountSectionPanel, {
  kind: 'groomAccounts', title: '신랑측 계좌', description: '', disabled: false,
  accounts: [account], onAdd: noop, onRemove: noop, onChange: noop,
}));
const account = renderAccount(complete);
assert.equal(openDisclosures(account), 0, 'Complete accounts start collapsed');
assert.match(account, /김신랑 · 국민은행/);
assert.ok(account.includes('value="001-234"'), 'Leading zeroes remain in the editable account number');
for (const field of ['bank', 'accountNumber', 'accountHolder'] as const) {
  assert.equal(openDisclosures(renderAccount({ ...complete, [field]: ' ' })), 1,
    `Missing ${field} must leave the incomplete account open`);
}

const config = createInitialWizardConfig('wedding');
const renderNames = (groom: string, bride: string) => {
  config.couple.groom.name = groom;
  config.couple.bride.name = bride;
  return renderToStaticMarkup(React.createElement(BasicStep, {
    formState: config, previewFormState: config, updateForm: noop, onPersonFieldChange: noop,
  }));
};
for (const [groom, bride] of [['김신랑', '이신부'], ['박새이름', '최새이름'], ['', '']]) {
  const names = renderNames(groom, bride);
  assert.ok(names.includes(`value="${groom}"`));
  assert.ok(names.includes(`value="${bride}"`));
}

console.log('wizard editor disclosure rendering checks passed');
