import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { AccountInvitationsSection } from '../../components/AccountInvitationsSection';
import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { SectionCard } from '../../components/SectionCard';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import ManageScreenContent from '../../features/screens/manage';

export default function MyPageScreen() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useAuth();
  const { palette } = usePreferences();

  if (!isReady) {
    return (
      <AppScreen title="마이페이지">
        <View style={styles.loading}>
          <ActivityIndicator color={palette.accent} />
          <AppText variant="muted">계정과 청첩장 정보를 확인하는 중입니다.</AppText>
        </View>
      </AppScreen>
    );
  }

  if (isAuthenticated && Platform.OS !== 'web') {
    return <ManageScreenContent />;
  }

  return (
    <AppScreen title="마이페이지" subtitle="내 계정의 청첩장을 확인하고 수정하거나 디자인별로 공유하세요.">
      <AccountInvitationsSection />
      <SectionCard
        title="청첩장 제작"
        description="결제 후 비공개 청첩장이 생성되며, 마이페이지에서 내용을 완성할 수 있습니다."
      >
        <ActionButton onPress={() => router.push('/create')} fullWidth>
          새 청첩장 만들기
        </ActionButton>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 12, paddingVertical: 32 },
});
