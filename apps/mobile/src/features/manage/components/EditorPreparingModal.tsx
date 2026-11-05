import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppModalFrame } from '../../../components/AppModalFrame';
import { AppText } from '../../../components/AppText';
import { usePreferences } from '../../../contexts/PreferencesContext';

type EditorPreparingModalProps = {
  visible: boolean;
  message: string;
};

export function EditorPreparingModal({ visible, message }: EditorPreparingModalProps) {
  const { palette } = usePreferences();

  return (
    <AppModalFrame
      visible={visible}
      onClose={() => {}}
      closeDisabled
      title="청첩장 편집 준비"
      description="편집 정보를 불러오는 중입니다."
      placement="center"
      palette={palette}
    >
      <View style={styles.content} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={palette.accent} />
        <AppText variant="muted" style={styles.message}>{message}</AppText>
      </View>
    </AppModalFrame>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 14, paddingVertical: 16 },
  message: { textAlign: 'center', flexShrink: 1 },
});
