import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

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

export default function MyInvitationsScreen() {
  const router = useRouter();
  const { isReady: isAuthReady } = useAuth();
  const { isReady: isPreferencesReady, palette } = usePreferences();
  const isExpoWebPreview = Platform.OS === 'web';

  if (!(isAuthReady && isPreferencesReady)) {
    return (
      <AppScreen title="홈">
        <View style={styles.loading}>
          <ActivityIndicator color={palette.accent} />
          <AppText variant="muted">저장한 연동 정보를 확인하고 있습니다.</AppText>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="홈" subtitle="새 청첩장을 만들거나 원하는 웨딩 디자인을 확인해 보세요.">
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
          onPress={() => router.push({ pathname: '/login', params: { next: '/guide' } })}
        >
          기존 청첩장 연결
        </ActionButton>
        <AppText variant="caption" color={palette.textMuted}>
          PC에서 만든 청첩장도 같은 고객 계정이나 앱 연동 링크로 관리할 수 있습니다.
        </AppText>
      </SectionCard>
      <SectionCard
        title="웨딩 디자인 살펴보기"
        description="신민재·김현지 청첩장으로 디자인별 실제 페이지를 확인할 수 있습니다."
      >
        <ThemePreviewGallery />
      </SectionCard>
      <ActionButton variant="secondary" fullWidth onPress={() => router.push('/guide')}>
        마이페이지에서 내 청첩장 관리
      </ActionButton>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 12, paddingVertical: 32 },
});
