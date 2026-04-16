import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { usePreferences } from '../contexts/PreferencesContext';

export default function NotFoundScreen() {
  const { palette, fontScale } = usePreferences();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.cardBorder },
        ]}
      >
        <Text style={[styles.title, { color: palette.text, fontSize: 24 * fontScale }]}>
          페이지를 찾을 수 없습니다.
        </Text>
        <Text style={[styles.text, { color: palette.textMuted, fontSize: 15 * fontScale }]}>
          모바일 청첩장 앱에서 아직 이 경로는 준비되지 않았습니다.
        </Text>
        <Link href="/" style={[styles.link, { color: palette.accent, fontSize: 15 * fontScale }]}>
          홈으로 돌아가기
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  title: {
    fontWeight: '800',
  },
  text: {
    lineHeight: 22,
  },
  link: {
    fontWeight: '700',
  },
});
