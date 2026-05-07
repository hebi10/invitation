import type { SaveState } from './pageEditorClientTypes';

export function getPageEditorSaveStatusLabel({
  saveState,
  isDirty,
}: {
  saveState: SaveState;
  isDirty: boolean;
}) {
  if (saveState === 'autosaving') {
    return '자동 저장 중';
  }

  if (saveState === 'saving') {
    return '임시저장 중';
  }

  if (saveState === 'publishing') {
    return '발행 상태 반영 중';
  }

  if (saveState === 'saved') {
    return '저장 완료';
  }

  if (saveState === 'error') {
    return '저장 오류';
  }

  return isDirty ? '저장 필요' : '저장 완료';
}

export function getPageEditorPublishStatusLabel({
  published,
  hasPublishChanges,
}: {
  published: boolean;
  hasPublishChanges: boolean;
}) {
  if (published) {
    return hasPublishChanges ? '발행 예정' : '발행 완료';
  }

  return hasPublishChanges ? '비공개 전환 예정' : '비공개';
}
