import assert from 'node:assert/strict';

import { resolveEditorSavePolicy } from '../src/features/manage/editorSavePolicy';

for (const savedPublished of [false, true]) {
  for (const requestedPublished of [false, true]) {
    const contentOnly = resolveEditorSavePolicy({ savedPublished, requestedPublished, applyPublicationChange: false });
    assert.equal(contentOnly.published, savedPublished, '내용 저장은 현재 공개 상태를 유지해야 합니다.');
    assert.equal(contentOnly.hasPendingPublicationChange, savedPublished !== requestedPublished);
    assert.equal(contentOnly.requiresPublishConfirmation, false);

    const finalSave = resolveEditorSavePolicy({ savedPublished, requestedPublished, applyPublicationChange: true });
    assert.equal(finalSave.published, requestedPublished, '최종 저장에서 선택한 공개 상태를 적용해야 합니다.');
    assert.equal(finalSave.hasPendingPublicationChange, false);
    assert.equal(finalSave.requiresPublishConfirmation, !savedPublished && requestedPublished);
  }
}

console.log('모바일 내용 저장·공개 변경 분리 정책 검증 통과');
