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
    <AppScreen title="내 청첩장" subtitle="저장한 초안을 이어서 작성하거나 기존 청첩장을 연결하세요.">
      {isExpoWebPreview ? <WebPreviewNotice /> : null}
      <DraftInvitationsSection />
      <AccountInvitationsSection />
      <WeddingIntroHero />
      <SectionCard title="청첩장을 준비해 볼까요?" description="새로 만들거나 이미 제작한 청첩장을 이 기기에 연결할 수 있습니다.">
        <ActionButton fullWidth onPress={() => router.push('/create')}>새 청첩장 만들기</ActionButton>
        <ActionButton variant="secondary" fullWidth disabled={isExpoWebPreview}
          onPress={() => router.push({ pathname: '/login', params: { next: '/' } })}>
          기존 청첩장 연결
        </ActionButton>
        <AppText variant="muted">PC에서 제작했다면 청첩장의 앱 연동 링크로도 연결할 수 있습니다.</AppText>
      </SectionCard>
      <SectionCard
        title="웨딩 디자인 미리보기"
        description="가입이나 결제 전에 실제 샘플을 살펴볼 수 있습니다."
      >
        <ThemePreviewGallery />
      </SectionCard>
      <ActionButton variant="secondary" fullWidth onPress={() => router.push('/guide')}>제작·연동 방법 보기</ActionButton>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 12, paddingVertical: 32 },
});
