import { ActivityIndicator, Modal, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useAppState } from '../../../contexts/AppStateContext';
import { manageStyles } from '../manageStyles';

type EditorPreparingModalProps = {
  visible: boolean;
  message: string;
};

export function EditorPreparingModal({
  visible,
  message,
}: EditorPreparingModalProps) {
  const { palette } = useAppState();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={manageStyles.modalOverlay}>
        <View style={manageStyles.modalBackdrop} />
        <View
          style={[
            manageStyles.modalCard,
            manageStyles.editorPreparingCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <ActivityIndicator size="large" color={palette.accent} />
          <AppText style={manageStyles.editorStepTitle}>청첩장 정보 수정 팝업 준비 중</AppText>
          <AppText variant="muted" style={manageStyles.loadingText}>
            {message}
          </AppText>
        </View>
      </View>
    </Modal>
  );
}
