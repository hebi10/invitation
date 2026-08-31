import type { NoticeState } from './pageWizardShared';
import type { WizardStepKey, SlugStepState } from './pageWizardData';
import type { BankAccount, InvitationPageSeed } from '@/types/invitationPage';

export type WizardSaveStatus =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error';

type WizardSectionStatusInput = {
  isActive: boolean;
  valid: boolean;
  hasMeaningfulInput: boolean;
  invalidStepCount?: number;
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasAccountInput(accounts: BankAccount[] | undefined) {
  return (accounts ?? []).some((account) =>
    hasText(account.bank) ||
    hasText(account.accountNumber) ||
    hasText(account.accountHolder)
  );
}

export function markWizardStepInteraction(
  currentStepKeys: ReadonlySet<WizardStepKey>,
  stepKey: WizardStepKey
) {
  return new Set([...currentStepKeys, stepKey]);
}

export function resolveWizardSelectionInteraction<T>(
  currentValue: T,
  nextValue: T
) {
  return {
    hasExplicitSelection: true,
    hasUnsavedChanges: currentValue !== nextValue,
  };
}

export function hasMeaningfulInputForWizardStep(
  stepKey: WizardStepKey,
  {
    formState,
    slugStepState,
    hasEventTypeSelection = false,
    hasThemeSelection = false,
    hasStepInteraction = false,
    hasPersistedData = false,
  }: {
    formState: InvitationPageSeed | null;
    slugStepState: SlugStepState;
    hasEventTypeSelection?: boolean;
    hasThemeSelection?: boolean;
    hasStepInteraction?: boolean;
    hasPersistedData?: boolean;
  }
) {
  switch (stepKey) {
    case 'eventType':
      return hasEventTypeSelection || hasStepInteraction || hasPersistedData;
    case 'final':
      return false;
    case 'theme':
      return hasThemeSelection || hasStepInteraction || hasPersistedData;
    case 'slug':
      return [
        slugStepState.slugInput,
        slugStepState.groomKoreanName,
        slugStepState.brideKoreanName,
        slugStepState.groomEnglishName,
        slugStepState.brideEnglishName,
      ].some(hasText);
    case 'basic':
      return [
        formState?.displayName,
        formState?.couple.groom.name,
        formState?.couple.bride.name,
      ].some(hasText);
    case 'schedule':
    case 'venue':
      return [
        formState?.date,
        formState?.venue,
        formState?.pageData?.ceremonyAddress,
        formState?.pageData?.mapUrl,
        formState?.pageData?.ceremonyContact,
      ].some(hasText);
    case 'greeting':
      return hasStepInteraction || hasPersistedData;
    case 'images':
      return hasText(formState?.metadata.images.wedding) ||
        (formState?.pageData?.galleryImages ?? []).some(hasText);
    case 'extra':
      return hasAccountInput(formState?.pageData?.giftInfo?.groomAccounts) ||
        hasAccountInput(formState?.pageData?.giftInfo?.brideAccounts) ||
        hasText(formState?.pageData?.giftInfo?.message);
    case 'music':
      return Boolean(formState?.musicEnabled) ||
        hasText(formState?.musicTrackId) ||
        hasText(formState?.musicStoragePath) ||
        hasText(formState?.musicUrl);
    default:
      return false;
  }
}

export function getWizardSaveStatusLabel(status: WizardSaveStatus) {
  return {
    idle: '편집 준비됨',
    dirty: '변경사항 있음',
    saving: '저장 중',
    saved: '저장됨',
    error: '저장 실패',
  }[status];
}

export function getWizardSectionStatus({
  isActive,
  valid,
  hasMeaningfulInput,
  invalidStepCount = 0,
}: WizardSectionStatusInput) {
  if (isActive) {
    return '현재 작업';
  }

  if (!valid) {
    return `확인 필요 ${invalidStepCount}개`;
  }

  return hasMeaningfulInput ? '완료' : '미입력';
}

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
