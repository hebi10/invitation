import { Modal, Pressable, View } from 'react-native';

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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={manageStyles.modalOverlay}>
        <Pressable style={manageStyles.modalBackdrop} onPress={onClose} />
        <View
          style={[
            manageStyles.modalCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <View style={manageStyles.modalHeader}>
            <View style={manageStyles.modalHeaderCopy}>
              <AppText variant="caption" color={palette.accent} style={manageStyles.modalEyebrow}>
                운영 시작 안내
              </AppText>
              <AppText variant="title" style={manageStyles.modalTitle}>
                {ONBOARDING_STEPS[stepIndex].title}
              </AppText>
              <AppText variant="muted" style={manageStyles.modalDescription}>
                {ONBOARDING_STEPS[stepIndex].description}
              </AppText>
            </View>
            <View style={[manageStyles.modalBadge, { backgroundColor: palette.accentSoft }]}>
              <AppText variant="caption" color={palette.accent} style={manageStyles.modalBadgeText}>
                {stepIndex + 1} / {ONBOARDING_STEPS.length}
              </AppText>
            </View>
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
            <ActionButton variant="secondary" onPress={onClose}>
              나중에 입력
            </ActionButton>
            <ActionButton variant="secondary" onPress={onPrevious} disabled={stepIndex === 0}>
              이전
            </ActionButton>
            <ActionButton onPress={() => void onNext()} loading={isSaving}>
              {stepIndex === ONBOARDING_STEPS.length - 1 ? '저장하고 시작' : '다음'}
            </ActionButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}
