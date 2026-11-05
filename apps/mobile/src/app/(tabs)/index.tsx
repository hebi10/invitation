import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { AccountInvitationsSection } from '../../components/AccountInvitationsSection';
import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { DraftInvitationsSection } from '../../components/DraftInvitationsSection';
import { SectionCard } from '../../components/SectionCard';
import { ThemePreviewGallery } from '../../components/ThemePreviewGallery';
import { WeddingIntroHero } from '../../components/WeddingIntroHero';
import { WebPreviewNotice } from '../../components/WebPreviewNotice';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import ManageScreenContent from '../../features/screens/manage';

export default function MyInvitationsScreen() {
  const router = useRouter();
  const { isAuthenticated, isReady: isAuthReady } = useAuth();
  const { isReady: isPreferencesReady, palette } = usePreferences();
  const isExpoWebPreview = Platform.OS === 'web';

  if (!(isAuthReady && isPreferencesReady)) {
    return (
      <AppScreen title="내 청첩장">
        <View style={styles.loading}>
          <ActivityIndicator color={palette.accent} />
          <AppText variant="muted">저장한 연동 정보를 확인하고 있습니다.</AppText>
        </View>
      </AppScreen>
    );
  }

  if (isAuthenticated && !isExpoWebPreview) return <ManageScreenContent />;

  return (
    <AppScreen title="내 청첩장" subtitle="모바일 청첩장을 만들거나 기존 청첩장을 이어서 관리하세요.">
      {isExpoWebPreview ? <WebPreviewNotice /> : null}
      <DraftInvitationsSection />
      <WeddingIntroHero />
      <SectionCard
        title="청첩장 시작하기"
        description="새로 만들거나 이미 제작한 청첩장을 이 기기에 연결할 수 있습니다."
      >
        <ActionButton fullWidth onPress={() => router.push('/create')}>
          새 청첩장 만들기
        </ActionButton>
        <ActionButton
          variant="secondary"
          fullWidth
          disabled={isExpoWebPreview}
          onPress={() => router.push({ pathname: '/login', params: { next: '/' } })}
        >
          기존 청첩장 연결
        </ActionButton>
        <AppText variant="caption" color={palette.textMuted}>
          PC에서 만든 청첩장도 같은 고객 계정이나 앱 연동 링크로 관리할 수 있습니다.
        </AppText>
      </SectionCard>
      <AccountInvitationsSection />
      <SectionCard
        title="웨딩 디자인 살펴보기"
        description="결제하기 전에 다섯 가지 청첩장 디자인을 실제 샘플로 확인할 수 있습니다."
      >
        <ThemePreviewGallery />
      </SectionCard>
      <ActionButton variant="secondary" fullWidth onPress={() => router.push('/guide')}>
        제작·연동 방법 보기
      </ActionButton>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 12, paddingVertical: 32 },
});
