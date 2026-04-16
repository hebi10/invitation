import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { quickStartItems } from '../../constants/content';
import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { BulletList } from '../../components/BulletList';
import { SectionCard } from '../../components/SectionCard';
import { WebPreviewNotice } from '../../components/WebPreviewNotice';
import { useAppState } from '../../contexts/AppStateContext';
import { formatPrice } from '../../lib/format';

export default function HomeScreen() {
  const router = useRouter();
  const isExpoWebPreview = Platform.OS === 'web';
  const { drafts, removeDraft, palette, fontScale } = useAppState();

  const handleEditDraft = (draftId: string) => {
    router.push({
      pathname: '/create',
      params: { draftId },
    });
  };

  return (
    <AppScreen
      title="모바일 청첩장"
      subtitle="새 청첩장 생성, 기존 페이지 연동, 초안 관리와 샘플 확인을 한 곳에서 시작할 수 있습니다."
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
          <Text
            style={[
              styles.emptyText,
              { color: palette.textMuted, fontSize: 14 * fontScale },
            ]}
          >
            Expo 웹에서는 로그인과 운영 편집이 차단되어 있습니다. 실제 작업은
            네이티브 앱 또는 Next 웹 편집기에서 진행해 주세요.
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard
        title="내가 저장한 초안"
        description="저장한 초안을 이어서 작성하거나 정리할 수 있습니다."
        badge={`${drafts.length}개`}
      >
        {drafts.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              { color: palette.textMuted, fontSize: 14 * fontScale },
            ]}
          >
            아직 저장한 초안이 없습니다. 먼저 새 청첩장을 만들고 초안을 저장해
            보세요.
          </Text>
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
                <Text
                  style={[
                    styles.draftTitle,
                    { color: palette.text, fontSize: 15 * fontScale },
                  ]}
                >
                  {(draft.groomName || '신랑')} · {(draft.brideName || '신부')}
                </Text>
                <Text
                  style={[
                    styles.draftMeta,
                    { color: palette.textMuted, fontSize: 13 * fontScale },
                  ]}
                >
                  {draft.servicePlan.toUpperCase()} /{' '}
                  {draft.theme === 'emotional' ? '감성 디자인' : '심플 디자인'}
                </Text>
                <Text
                  style={[
                    styles.draftMeta,
                    { color: palette.textMuted, fontSize: 13 * fontScale },
                  ]}
                >
                  예상 금액 {formatPrice(draft.estimatedPrice)} · 티켓 {draft.ticketCount}장
                </Text>
                <Text
                  style={[
                    styles.draftMeta,
                    { color: palette.textMuted, fontSize: 13 * fontScale },
                  ]}
                >
                  URL 초안{' '}
                  {draft.pageIdentifier || '영문 이름을 입력하면 자동으로 생성됩니다'}
                </Text>
              </View>
              <View style={styles.draftActionRow}>
                <ActionButton
                  variant="secondary"
                  onPress={() => handleEditDraft(draft.id)}
                >
                  이어서 작성
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={() => void removeDraft(draft.id)}
                >
                  삭제
                </ActionButton>
              </View>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard
        title="빠른 시작"
        description="서비스 흐름을 먼저 읽고 바로 다음 단계로 이어갈 수 있습니다."
      >
        <BulletList items={quickStartItems} />
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  primaryActionColumn: {
    gap: 10,
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
