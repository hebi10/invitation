import { useRouter } from 'expo-router';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { SectionCard } from '../../components/SectionCard';
import { WebPreviewNotice } from '../../components/WebPreviewNotice';
import { quickStartItems, servicePlans } from '../../constants/content';
import { useAppFeedback } from '../../contexts/AppFeedbackContext';
import { useDrafts } from '../../contexts/DraftsContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { formatPrice } from '../../lib/format';

export default function HomeScreen() {
  const router = useRouter();
  const isExpoWebPreview = Platform.OS === 'web';
  const { showToast } = useAppFeedback();
  const { drafts, removeDraft } = useDrafts();
  const { palette } = usePreferences();

  const handleEditDraft = (draftId: string) => {
    router.push({
      pathname: '/create',
      params: { draftId },
    });
  };

  const handleDeleteDraft = (draftId: string) => {
    Alert.alert(
      '초안을 삭제할까요?',
      '삭제한 초안은 다시 복구할 수 없습니다.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            void removeDraft(draftId).then(() => {
              showToast('초안을 삭제했습니다.', {
                tone: 'success',
              });
            });
          },
        },
      ]
    );
  };

  return (
    <AppScreen
      title="모바일 청첩장"
      subtitle="두 사람의 소식을 준비하고, 내 청첩장을 이어서 관리하세요."
    >
      {isExpoWebPreview ? <WebPreviewNotice /> : null}

      <SectionCard
        title="지금 바로 시작하기"
        description="신규 고객은 새 청첩장을 만들고, 기존 고객은 페이지 연동으로 바로 운영 화면으로 들어갈 수 있습니다."
      >
        <View style={styles.primaryActionColumn}>
          <ActionButton onPress={() => router.push('/create')} fullWidth>
            새 청첩장 만들기
          </ActionButton>
          <ActionButton
            variant="secondary"
            onPress={() => router.push('/login')}
            disabled={isExpoWebPreview}
            fullWidth
          >
            기존 페이지 연동
          </ActionButton>
        </View>
        {isExpoWebPreview ? (
          <AppText variant="muted" style={styles.emptyText}>
            웹에서는 화면과 초안을 확인할 수 있습니다. 청첩장 연동과 운영은 앱에서 이용해 주세요.
          </AppText>
        ) : null}
      </SectionCard>

      <SectionCard
        title="최근 저장한 초안"
        description="저장한 초안을 이어서 작성하거나 정리할 수 있습니다."
        badge={`${drafts.length}개`}
      >
        {drafts.length === 0 ? (
          <AppText variant="muted" style={styles.emptyText}>
            아직 저장한 초안이 없습니다. 먼저 새 청첩장을 만들고 초안을 저장해 보세요.
          </AppText>
        ) : (
          drafts.map((draft) => (
            <View
              key={draft.id}
              style={[
                styles.draftCard,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.cardBorder,
                },
              ]}
            >
              <View style={styles.draftCopy}>
                <AppText style={styles.draftTitle}>
                  {(draft.groomName || '신랑')} · {(draft.brideName || '신부')}
                </AppText>
                <AppText variant="muted" style={styles.draftMeta}>
                  PREMIUM · 모든 웨딩 디자인 포함
                </AppText>
                <AppText variant="muted" style={styles.draftMeta}>
                  제작 금액 {formatPrice(servicePlans[0].price)}
                </AppText>
                <AppText variant="muted" style={styles.draftMeta}>
                  청첩장 주소{' '}
                  {draft.pageIdentifier || '추천 주소가 자동으로 준비됩니다.'}
                </AppText>
              </View>
              <View style={styles.draftActionRow}>
                <ActionButton variant="secondary" onPress={() => handleEditDraft(draft.id)}>
                  이어서 작성
                </ActionButton>
                <ActionButton variant="secondary" onPress={() => handleDeleteDraft(draft.id)}>
                  삭제
                </ActionButton>
              </View>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard
        title="빠른 시작"
        description="원하는 작업을 선택해 바로 이동하세요."
      >
        {quickStartItems.map((label, index) => (
          <ActionButton key={label} variant="secondary" fullWidth
            onPress={() => router.push((['/create', '/login', '/guide'] as const)[index])}>
            {label}
          </ActionButton>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  primaryActionColumn: {
    gap: 10,
  },
  draftCard: {
    borderRadius: 0,
    padding: 16,
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
