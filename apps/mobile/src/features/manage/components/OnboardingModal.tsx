import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppModalFrame } from '../../../components/AppModalFrame';
import { AppText } from '../../../components/AppText';
import { ModalFeedback } from '../../../components/ModalPrimitives';
import { usePreferences } from '../../../contexts/PreferencesContext';
import type { ManageFormState, ManageStringFieldKey } from '../shared';
import { ONBOARDING_STEPS } from '../shared';
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
      contentDisabled={isSaving}
      footer={(
        <View style={styles.actions}>
          <ActionButton variant="secondary" onPress={onClose} disabled={isSaving} style={styles.action}>
            나중에 입력
          </ActionButton>
          <ActionButton variant="secondary" onPress={onPrevious} disabled={stepIndex === 0 || isSaving} style={styles.action}>
            이전
          </ActionButton>
          <ActionButton onPress={() => void onNext()} loading={isSaving} style={styles.action}>
            {stepIndex === ONBOARDING_STEPS.length - 1 ? '저장하고 시작' : '다음'}
          </ActionButton>
        </View>
      )}
    >
      <View style={styles.progressGroup}>
        <View style={styles.progressLabels}>
          <AppText variant="caption" color={palette.textMuted}>운영 시작 안내</AppText>
          <AppText variant="caption" color={palette.textMuted}>
            {stepIndex + 1} / {ONBOARDING_STEPS.length}
          </AppText>
        </View>
        <View
          style={[styles.progressTrack, { backgroundColor: palette.surfaceMuted }]}
          accessibilityRole="progressbar"
          accessibilityLabel="최초 청첩장 정보 입력 진행률"
          accessibilityValue={{ min: 1, max: ONBOARDING_STEPS.length, now: stepIndex + 1 }}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: palette.accent,
                width: `${((stepIndex + 1) / ONBOARDING_STEPS.length) * 100}%`,
              },
            ]}
          />
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
        <ModalFeedback palette={palette} tone="error">{validationMessage}</ModalFeedback>
      ) : null}
      {authError ? <ModalFeedback palette={palette} tone="error">{authError}</ModalFeedback> : null}
    </AppModalFrame>
  );
}

const styles = StyleSheet.create({
  progressGroup: { gap: 8 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  progressTrack: { height: 4, overflow: 'hidden' },
  progressFill: { height: '100%' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexGrow: 1, flexBasis: 110, minWidth: 96 },
});
