import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { useAppFeedback } from '../contexts/AppFeedbackContext';
import { useDrafts } from '../contexts/DraftsContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { formatDateLabel } from '../features/manage/linkedInvitationDisplay';
import { ActionButton } from './ActionButton';
import { AppText } from './AppText';
import { SectionCard } from './SectionCard';

export function DraftInvitationsSection() {
  const router = useRouter();
  const { drafts, isReady, removeDraft } = useDrafts();
  const { palette } = usePreferences();
  const { showToast } = useAppFeedback();

  if (!isReady || drafts.length === 0) return null;

  const handleDelete = (draftId: string) => {
    Alert.alert('초안을 삭제할까요?', '삭제한 초안은 다시 복구할 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void removeDraft(draftId)
            .then(() => showToast('초안을 삭제했습니다.', { tone: 'success' }))
            .catch(() => showToast('초안을 삭제하지 못했습니다. 다시 시도해 주세요.', { tone: 'error' }));
        },
      },
    ]);
  };

  return (
    <SectionCard title="저장한 초안" description="이전 방식으로 저장한 미결제 초안입니다. 새 제작 방식에서는 결제 후 정보를 입력하며, 기존 초안의 입력값은 자동 이전되지 않습니다." badge={`${drafts.length}개`}>
      {drafts.map((draft) => (
        <View
          key={draft.id}
          style={[styles.draft, { borderColor: palette.cardBorder, backgroundColor: palette.surface }]}
        >
          <View style={styles.copy}>
            <AppText variant="caption" color={palette.textMuted}>저장한 제작 초안</AppText>
            <AppText variant="title">{draft.groomName || '신랑'} · {draft.brideName || '신부'}</AppText>
            <AppText variant="muted">
              {draft.weddingDate ? `예식일 ${formatDateLabel(draft.weddingDate)}` : '예식일 미입력'}
              {draft.venue ? ` · ${draft.venue}` : ''}
            </AppText>
            <AppText variant="caption" color={palette.textMuted}>
              {draft.pageIdentifier ? `청첩장 주소 · /${draft.pageIdentifier}` : '청첩장 주소는 제작 시 정할 수 있습니다.'}
            </AppText>
          </View>
          <View style={styles.actions}>
            <ActionButton style={styles.continueButton} onPress={() => router.push('/create')}>
              새 방식으로 제작
            </ActionButton>
            <ActionButton variant="secondary" onPress={() => handleDelete(draft.id)}
              accessibilityLabel={`${draft.groomName || '신랑'} ${draft.brideName || '신부'} 초안 삭제`}>
              초안 삭제
            </ActionButton>
          </View>
        </View>
      ))}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  draft: { borderWidth: 1, borderRadius: 0, padding: 14, gap: 14 },
  copy: { gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  continueButton: { flexGrow: 1, flexBasis: 140, minWidth: 130 },
});
