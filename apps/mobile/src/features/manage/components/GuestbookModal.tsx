import { ScrollView, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { InvitationEditorModalShell } from '../../../components/manage/InvitationEditorModalShell';
import { SectionCard } from '../../../components/SectionCard';
import { TextField } from '../../../components/TextField';
import { usePreferences } from '../../../contexts/PreferencesContext';
import type { MobileGuestbookComment } from '../../../types/mobileInvitation';
import { manageStyles } from '../manageStyles';

type GuestbookModalProps = {
  visible: boolean;
  totalCount: number;
  filteredCount: number;
  comments: MobileGuestbookComment[];
  searchQuery: string;
  page: number;
  totalPages: number;
  canRefresh: boolean;
  onClose: () => void;
  onChangeSearchQuery: (value: string) => void;
  onChangePage: (value: number) => void;
  onHideComment: (commentId: string) => void | Promise<void>;
  onScheduleDeleteComment: (commentId: string) => void | Promise<void>;
  onRestoreComment: (commentId: string) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
};

function formatCommentDate(value: string | null) {
  if (!value) {
    return '작성 시각 정보 없음';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '작성 시각 정보 없음';
  }

  return date.toLocaleString('ko-KR');
}

function formatScheduledDeleteDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('ko-KR');
}

export function GuestbookModal({
  visible,
  totalCount,
  filteredCount,
  comments,
  searchQuery,
  page,
  totalPages,
  canRefresh,
  onClose,
  onChangeSearchQuery,
  onChangePage,
  onHideComment,
  onScheduleDeleteComment,
  onRestoreComment,
  onRefresh,
}: GuestbookModalProps) {
  const { palette, fontScale } = usePreferences();

  return (
    <InvitationEditorModalShell
      visible={visible}
      onClose={onClose}
      title="연동된 페이지 방명록"
      description="방명록을 검색하고 숨김, 삭제 예정, 복구 상태를 바로 관리할 수 있습니다."
      palette={palette}
      fontScale={fontScale}
    >
      <SectionCard
        title="방명록 검색"
        description="작성자 이름이나 내용으로 필요한 방명록을 빠르게 찾습니다."
        badge={`${filteredCount}/${totalCount}`}
      >
        <TextField
          label="검색어"
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          placeholder="작성자 이름이나 메시지를 입력해 주세요"
        />
        <AppText variant="caption" style={manageStyles.searchSummaryText}>
          검색 결과 {filteredCount}개, 페이지 {page}/{totalPages}
        </AppText>
        <ActionButton
          variant="secondary"
          onPress={() => void onRefresh()}
          disabled={!canRefresh}
          fullWidth
        >
          방명록 새로고침
        </ActionButton>
      </SectionCard>

      <SectionCard
        title="방명록 관리"
        description="공개 댓글은 숨기거나 삭제 예정으로 보낼 수 있고, 숨긴 댓글과 삭제 예정 댓글은 다시 복구할 수 있습니다."
      >
        {comments.length ? (
          <ScrollView
            style={manageStyles.guestbookList}
            contentContainerStyle={manageStyles.guestbookListContent}
            showsVerticalScrollIndicator={false}
          >
            {comments.map((comment) => {
              const scheduledDeleteDate = formatScheduledDeleteDate(
                comment.scheduledDeleteAt
              );
              const statusTone =
                comment.status === 'pending_delete'
                  ? {
                      backgroundColor: palette.dangerSoft,
                      color: palette.danger,
                      label: '삭제 예정',
                      helper: scheduledDeleteDate
                        ? `${scheduledDeleteDate} 이후 영구 삭제됩니다.`
                        : '30일 안에는 다시 복구할 수 있습니다.',
                    }
                  : comment.status === 'hidden'
                    ? {
                        backgroundColor: palette.noticeSoft,
                        color: palette.notice,
                        label: '숨김',
                        helper:
                          '하객 화면에서는 보이지 않으며 운영 화면에서 다시 공개할 수 있습니다.',
                      }
                    : {
                        backgroundColor: palette.accentSoft,
                        color: palette.accent,
                        label: '공개',
                        helper: '하객 화면에 노출 중인 방명록입니다.',
                      };

              return (
                <View
                  key={comment.id}
                  style={[
                    manageStyles.commentCard,
                    {
                      backgroundColor: palette.surfaceMuted,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <View style={manageStyles.commentStatusRow}>
                    <AppText style={manageStyles.commentAuthor}>{comment.author}</AppText>
                    <View
                      style={[
                        manageStyles.commentStatusBadge,
                        { backgroundColor: statusTone.backgroundColor },
                      ]}
                    >
                      <AppText
                        style={[
                          manageStyles.commentStatusBadgeText,
                          { color: statusTone.color },
                        ]}
                      >
                        {statusTone.label}
                      </AppText>
                    </View>
                  </View>

                  <View style={manageStyles.commentCopy}>
                    <AppText variant="muted" style={manageStyles.commentMessage}>
                      {comment.message}
                    </AppText>
                    <AppText variant="caption" style={manageStyles.commentMeta}>
                      {formatCommentDate(comment.createdAt)}
                    </AppText>
                    <AppText variant="caption" style={manageStyles.commentStatusHint}>
                      {statusTone.helper}
                    </AppText>
                  </View>

                  <View style={manageStyles.commentActionRow}>
                    {comment.status === 'pending_delete' ? (
                      <ActionButton
                        variant="secondary"
                        onPress={() => void onRestoreComment(comment.id)}
                        style={manageStyles.actionHalfButton}
                      >
                        복구
                      </ActionButton>
                    ) : (
                      <>
                        <ActionButton
                          variant="secondary"
                          onPress={() =>
                            comment.status === 'hidden'
                              ? void onRestoreComment(comment.id)
                              : void onHideComment(comment.id)
                          }
                          style={manageStyles.actionHalfButton}
                        >
                          {comment.status === 'hidden' ? '다시 공개' : '숨김'}
                        </ActionButton>
                        <ActionButton
                          variant="danger"
                          onPress={() => void onScheduleDeleteComment(comment.id)}
                          style={manageStyles.actionHalfButton}
                        >
                          삭제 예정
                        </ActionButton>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <AppText variant="muted" style={manageStyles.loadingText}>
            검색 조건에 맞는 방명록이 없습니다.
          </AppText>
        )}

        <View style={manageStyles.paginationRow}>
          <ActionButton
            variant="secondary"
            onPress={() => onChangePage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            이전
          </ActionButton>
          <AppText style={manageStyles.paginationText}>
            {page} / {totalPages}
          </AppText>
          <ActionButton
            variant="secondary"
            onPress={() => onChangePage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            다음
          </ActionButton>
        </View>
      </SectionCard>
    </InvitationEditorModalShell>
  );
}
