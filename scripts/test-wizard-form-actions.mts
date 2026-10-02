import assert from 'node:assert/strict';

import { createInitialWizardConfig } from '../src/app/page-wizard/pageWizardData.ts';
import { createWizardFormActions } from '../src/app/page-wizard/pageWizardFormActions.ts';
import type { EventTypeKey } from '../src/lib/eventTypes.ts';

function editor(eventType: EventTypeKey = 'wedding') {
  const draft = createInitialWizardConfig(eventType);
  const actions = createWizardFormActions({ eventType, updateForm: update => update(draft) });
  return { draft, actions };
}

// Name changes must keep automatic labels current without replacing authored copy.
const wedding = editor();
wedding.draft.couple.groom.name = '서준';
wedding.draft.couple.bride.name = '하은';
wedding.draft.displayName = '서준 ♥ 하은';
wedding.draft.description = '직접 작성한 초대 문구';
wedding.draft.pageData!.greetingMessage = '두 사람이 함께 작성한 인사';
wedding.draft.pageData!.greetingAuthor = '서준 · 하은';
wedding.actions.handlePersonFieldChange('groom', 'name', '도윤');
assert.equal(wedding.draft.groomName, '도윤');
assert.equal(wedding.draft.displayName, '도윤 ♥ 하은');
assert.equal(wedding.draft.pageData!.greetingAuthor, '도윤 · 하은');
assert.equal(wedding.draft.description, '직접 작성한 초대 문구');
assert.equal(wedding.draft.pageData!.greetingMessage, '두 사람이 함께 작성한 인사');
wedding.draft.displayName = '우리의 결혼식';
wedding.actions.handlePersonFieldChange('bride', 'name', '수빈');
assert.equal(wedding.draft.displayName, '우리의 결혼식');

// Shared wizard actions must preserve the distinct identity of each event type.
for (const eventType of ['first-birthday', 'birthday', 'opening', 'general-event'] as const) {
  const { draft, actions } = editor(eventType);
  actions.handleSlugPrimaryKoreanNameChange('새로운 이름');
  assert.equal(draft.displayName, '새로운 이름');
  assert.equal(draft.metadata.title, '새로운 이름');
  assert.equal(draft.metadata.openGraph.title, '새로운 이름');
  if (eventType === 'first-birthday' || eventType === 'birthday') {
    assert.equal(draft.brideName, '');
  }
  if (eventType === 'first-birthday') {
    assert.equal(draft.groomName, '');
    assert.equal(draft.pageData!.greetingAuthor, '아빠 · 엄마');
  }
  if (eventType === 'opening') {
    assert.equal(draft.pageData!.venueName, '새로운 이름');
  }
}

const guides = editor();
guides.draft.pageData!.venueGuide = [
  { title: '기존 안내', content: '보존할 내용' },
  { title: ' ', content: '' },
];
guides.actions.handleGuideTemplateApply('venueGuide', '주차', '2시간 무료');
assert.deepEqual(guides.draft.pageData!.venueGuide, [
  { title: '기존 안내', content: '보존할 내용' },
  { title: '주차', content: '2시간 무료' },
]);
guides.actions.handleGuideAdd('venueGuide');
guides.actions.handleGuideChange('venueGuide', 2, 'title', '교통');
guides.actions.handleGuideChange('venueGuide', 2, 'content', '도보 5분');
guides.actions.handleGuideAdd('venueGuide');
guides.actions.handleGuideTemplateApply('venueGuide', '네 번째', '추가 불가');
assert.equal(guides.draft.pageData!.venueGuide.length, 3);
assert.equal(guides.draft.pageData!.venueGuide[2].title, '교통');
guides.actions.handleGuideRemove('venueGuide', 1);
assert.deepEqual(guides.draft.pageData!.venueGuide.map(item => item.title), ['기존 안내', '교통']);

const accounts = editor();
accounts.draft.pageData!.giftInfo = { groomAccounts: [], brideAccounts: [] };
for (let count = 0; count < 4; count += 1) accounts.actions.handleAccountAdd('groomAccounts');
assert.equal(accounts.draft.pageData!.giftInfo.groomAccounts!.length, 3);
accounts.actions.handleAccountChange('groomAccounts', 0, 'accountNumber', '001-002-030');
assert.equal(accounts.draft.pageData!.giftInfo.groomAccounts![0].accountNumber, '001-002-030');
assert.deepEqual(accounts.draft.pageData!.giftInfo.brideAccounts, []);
accounts.actions.handleAccountRemove('groomAccounts', 1);
assert.equal(accounts.draft.pageData!.giftInfo.groomAccounts!.length, 2);

console.log('wizard form action identity, authored copy, guide limits and account preservation checks passed');
