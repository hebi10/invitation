import { View } from 'react-native';
import { AppModalFrame } from '../../../components/AppModalFrame';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { usePreferences } from '../../../contexts/PreferencesContext';
import type { ManageFormState, ManageStringFieldKey } from '../shared';
import { ONBOARDING_STEPS } from '../shared';
import { manageStyles } from '../manageStyles';
import { OnboardingStepContent } from './OnboardingStepContent';

type OnboardingModalProps = {
  visible: boolean;
  stepIndex: number;
  form: ManageFormState;
  isSaving: boolean;
  authError: string | null;
  validationMessage: string | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void | Promise<void>;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onUpdatePersonName: (role: 'groom' | 'bride', value: string) => void;
  onSetPublished: (published: boolean) => void;
};

export function OnboardingModal({
  visible,
  stepIndex,
  form,
  isSaving,
  authError,
  validationMessage,
  onClose,
  onPrevious,
  onNext,
  onUpdateField,
  onUpdatePersonName,
  onSetPublished,
}: OnboardingModalProps) {
  const { palette } = usePreferences();

  return (
    <AppModalFrame
      visible={visible}
      onClose={onClose}
      title={ONBOARDING_STEPS[stepIndex].title}
      description={ONBOARDING_STEPS[stepIndex].description}
      closeDisabled={isSaving}
    >
      <View style={manageStyles.modalHeader}>
        <AppText variant="caption" color={palette.accent}>
          운영 시작 안내
        </AppText>
        <AppText variant="caption" color={palette.accent}>
          {stepIndex + 1} / {ONBOARDING_STEPS.length}
        </AppText>
      </View>
      <OnboardingStepContent
        stepIndex={stepIndex}
        form={form}
        onUpdateField={onUpdateField}
        onUpdatePersonName={onUpdatePersonName}
        onSetPublished={onSetPublished}
      />

      {validationMessage ? (
        <AppText color={palette.danger} style={manageStyles.modalErrorText}>
          {validationMessage}
        </AppText>
      ) : null}
      {authError ? (
        <AppText color={palette.danger} style={manageStyles.modalErrorText}>
          {authError}
        </AppText>
      ) : null}

      <View style={manageStyles.modalActions}>
        <ActionButton variant="secondary" onPress={onClose} disabled={isSaving}>
          나중에 입력
        </ActionButton>
        <ActionButton variant="secondary" onPress={onPrevious} disabled={stepIndex === 0 || isSaving}>
          이전
        </ActionButton>
        <ActionButton onPress={() => void onNext()} loading={isSaving}>
          {stepIndex === ONBOARDING_STEPS.length - 1 ? '저장하고 시작' : '다음'}
        </ActionButton>
      </View>
    </AppModalFrame>
  );
}
