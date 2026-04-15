import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Share, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { BulletList } from '../../components/BulletList';
import { LoginCard } from '../../components/LoginCard';
import { SectionCard } from '../../components/SectionCard';
import { useAppState } from '../../contexts/AppStateContext';
import { quickStartItems, sampleInvitations } from '../../constants/content';
import { formatPrice } from '../../lib/format';

export default function HomeScreen() {
  const router = useRouter();
  const {
    dashboard,
    drafts,
    isAuthenticated,
    isBootstrapping,
    logout,
    pageSummary,
    refreshDashboard,
    removeDraft,
    login,
    clearAuthError,
    palette,
    fontScale,
  } = useAppState();
  const [pageIdentifier, setPageIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    clearAuthError();
    const authenticated = await login(pageIdentifier, password);
    if (authenticated) {
      setPassword('');
    }
  };

  const handleShare = async () => {
    const publicUrl = dashboard?.links.publicUrl;
    if (!publicUrl) {
      return;
    }

    await Share.share({
      message: publicUrl,
      url: publicUrl,
    });
  };

  const handleOpenUrl = async () => {
    const publicUrl = dashboard?.links.publicUrl;
    if (!publicUrl) {
      return;
    }

    await Linking.openURL(publicUrl);
  };

  const handleEditDraft = (draftId: string) => {
    router.push({
      pathname: '/(tabs)/create',
      params: { draftId },
    });
  };

  return (
    <AppScreen
      title="모바일 청첩장"
      subtitle="연동한 페이지 상태를 확인하고, 제작 초안과 샘플 구성을 함께 관리할 수 있습니다."
    >
      {!isAuthenticated ? (
        <LoginCard
          pageIdentifier={pageIdentifier}
          password={password}
          onChangePageIdentifier={setPageIdentifier}
          onChangePassword={setPassword}
          onSubmit={handleLogin}
        />
      ) : (
        <SectionCard
          title={pageSummary?.displayName?.trim() || '현재 연결된 청첩장'}
          description="현재 연동된 페이지의 공개 상태와 링크를 바로 확인할 수 있습니다."
          badge={pageSummary?.published ? '공개 중' : '비공개'}
        >
          <View style={styles.infoGroup}>
            <Text style={[styles.infoText, { color: palette.text, fontSize: 14 * fontScale }]}>
              페이지 슬러그: {pageSummary?.slug ?? '-'}
            </Text>
            <Text style={[styles.infoText, { color: palette.text, fontSize: 14 * fontScale }]}>
              서비스: {pageSummary?.productTier.toUpperCase() ?? '-'}
            </Text>
            <Text
              style={[styles.infoText, { color: palette.textMuted, fontSize: 13 * fontScale }]}
            >
              링크: {dashboard?.links.publicUrl ?? '운영 데이터를 불러오는 중입니다.'}
            </Text>
          </View>
          <View style={styles.actionRow}>
            <ActionButton onPress={handleShare}>링크 공유</ActionButton>
            <ActionButton variant="secondary" onPress={handleOpenUrl}>
              링크 열기
            </ActionButton>
            <ActionButton variant="secondary" onPress={() => void refreshDashboard()}>
              새로고침
            </ActionButton>
            <ActionButton variant="danger" onPress={() => void logout()}>
              연동 해제
            </ActionButton>
          </View>
        </SectionCard>
      )}

      <SectionCard
        title="내 제작 초안"
        description="모바일에 저장한 제작 초안을 이어서 수정하거나 삭제할 수 있습니다."
        badge={`${drafts.length}개`}
      >
        {drafts.length === 0 ? (
          <Text style={[styles.emptyText, { color: palette.textMuted, fontSize: 14 * fontScale }]}>
            아직 저장한 초안이 없습니다. 제작 탭에서 서비스를 선택하고 초안을 먼저 저장해 보세요.
          </Text>
        ) : (
          drafts.map((draft) => (
            <View
              key={draft.id}
              style={[
                styles.draftCard,
                { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder },
              ]}
            >
              <View style={styles.draftCopy}>
                <Text style={[styles.draftTitle, { color: palette.text, fontSize: 15 * fontScale }]}>
                  {draft.groomName || '신랑'} · {draft.brideName || '신부'}
                </Text>
                <Text style={[styles.draftMeta, { color: palette.textMuted, fontSize: 13 * fontScale }]}>
                  {draft.servicePlan.toUpperCase()} /{' '}
                  {draft.theme === 'emotional' ? '감성 디자인' : '심플 디자인'}
                </Text>
                <Text style={[styles.draftMeta, { color: palette.textMuted, fontSize: 13 * fontScale }]}>
                  예상 금액 {formatPrice(draft.estimatedPrice)} · 티켓 {draft.ticketCount}장
                </Text>
                <Text style={[styles.draftMeta, { color: palette.textMuted, fontSize: 13 * fontScale }]}>
                  URL 초안 {draft.pageIdentifier || '영문 이름을 입력하면 생성됩니다.'}
                </Text>
              </View>
              <View style={styles.draftActionRow}>
                <ActionButton variant="secondary" onPress={() => handleEditDraft(draft.id)}>
                  이어서 작성
                </ActionButton>
                <ActionButton variant="secondary" onPress={() => void removeDraft(draft.id)}>
                  삭제
                </ActionButton>
              </View>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard
        title="빠른 시작"
        description="앱의 주요 흐름을 먼저 확인하고 바로 제작으로 넘어갈 수 있습니다."
      >
        <BulletList items={quickStartItems} />
      </SectionCard>

      <SectionCard
        title="샘플 청첩장"
        description="연동 전에 어떤 결과물이 나오는지 빠르게 참고할 수 있습니다."
      >
        <BulletList items={sampleInvitations} />
      </SectionCard>

      {isBootstrapping ? (
        <Text style={[styles.emptyText, { color: palette.textMuted, fontSize: 13 * fontScale }]}>
          저장된 자동 연동 세션을 확인하고 있습니다.
        </Text>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  infoGroup: {
    gap: 6,
  },
  infoText: {
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  draftCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  draftCopy: {
    gap: 4,
  },
  draftTitle: {
    fontWeight: '700',
  },
  draftMeta: {
    lineHeight: 19,
  },
  draftActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyText: {
    lineHeight: 21,
  },
});
