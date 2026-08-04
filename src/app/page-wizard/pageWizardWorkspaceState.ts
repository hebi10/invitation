import type { NoticeState } from './pageWizardShared';

export type WizardSaveStatus =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error';

export function resolveWizardSaveStatus({
  isSaving,
  hasUnsavedChanges,
  lastSavedAt,
  notice,
}: {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  notice: NoticeState;
}): WizardSaveStatus {
  if (isSaving) {
    return 'saving';
  }

  if (notice?.tone === 'error' && notice.source === 'save') {
    return 'error';
  }

  if (hasUnsavedChanges) {
    return 'dirty';
  }

  return lastSavedAt ? 'saved' : 'idle';
}
