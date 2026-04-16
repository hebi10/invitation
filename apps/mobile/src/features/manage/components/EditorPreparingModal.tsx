import { ActivityIndicator, Modal, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { usePreferences } from '../../../contexts/PreferencesContext';
import { manageStyles } from '../manageStyles';

type EditorPreparingModalProps = {
  visible: boolean;
  message: string;
};

export function EditorPreparingModal({
  visible,
  message,
}: EditorPreparingModalProps) {
  const { palette } = usePreferences();

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
          <AppText style={manageStyles.editorStepTitle}>
            청첩장 편집 화면을 준비하고 있습니다
          </AppText>
          <AppText variant="muted" style={manageStyles.loadingText}>
            {message}
          </AppText>
        </View>
      </View>
    </Modal>
  );
}
