import type { EditableInvitationPageConfig } from '@/services/invitationPageService';

/** 호환용 진입점입니다. 저장된 사진은 Storage 조회 결과로 변경하지 않습니다. */
export async function applyWizardStorageImageFallback(
  editableConfig: EditableInvitationPageConfig
) {
  return editableConfig;
}
