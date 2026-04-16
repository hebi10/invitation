import { Modal, Pressable, ScrollView, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { TextField } from '../../../components/TextField';
import { useAppState } from '../../../contexts/AppStateContext';
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
  onDeleteComment: (commentId: string) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
};

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
  onDeleteComment,
  onRefresh,
}: GuestbookModalProps) {
  const { palette } = useAppState();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={manageStyles.modalOverlay}>
        <Pressable style={manageStyles.modalBackdrop} onPress={onClose} />
        <View
          style={[
            manageStyles.modalCard,
            manageStyles.guestbookModalCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <View style={manageStyles.modalHeader}>
            <View style={manageStyles.modalHeaderCopy}>
              <AppText variant="caption" color={palette.accent} style={manageStyles.modalEyebrow}>
                방명록 관리
              </AppText>
              <AppText variant="title" style={manageStyles.modalTitle}>
                연동된 페이지 방명록
              </AppText>
              <AppText variant="muted" style={manageStyles.modalDescription}>
                검색 조건에 맞는 댓글만 확인하고, 필요한 항목은 바로 삭제할 수 있습니다.
              </AppText>
            </View>
            <View style={[manageStyles.modalBadge, { backgroundColor: palette.accentSoft }]}>
              <AppText variant="caption" color={palette.accent} style={manageStyles.modalBadgeText}>
                {filteredCount}/{totalCount}
              </AppText>
            </View>
          </View>

          <TextField
            label="검색어"
            value={searchQuery}
            onChangeText={onChangeSearchQuery}
            placeholder="작성자 또는 내용을 입력해 주세요."
          />

          <AppText variant="caption" style={manageStyles.searchSummaryText}>
            검색 결과 {filteredCount}개 · 페이지 {page}/{totalPages}
          </AppText>

          {comments.length ? (
            <ScrollView
              style={manageStyles.guestbookList}
              contentContainerStyle={manageStyles.guestbookListContent}
            >
              {comments.map((comment) => (
                <View
                  key={comment.id}
                  style={[
                    manageStyles.commentCard,
                    { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder },
                  ]}
                >
                  <View style={manageStyles.commentCopy}>
                    <AppText style={manageStyles.commentAuthor}>{comment.author}</AppText>
                    <AppText variant="muted" style={manageStyles.commentMessage}>
                      {comment.message}
                    </AppText>
                    <AppText variant="caption" style={manageStyles.commentMeta}>
                      {comment.createdAt
                        ? new Date(comment.createdAt).toLocaleString('ko-KR')
                        : '작성 시각 정보 없음'}
                    </AppText>
                  </View>
                  <ActionButton variant="danger" onPress={() => void onDeleteComment(comment.id)}>
                    삭제
                  </ActionButton>
                </View>
              ))}
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

          <View style={manageStyles.modalActions}>
            <ActionButton variant="secondary" onPress={onClose}>
              닫기
            </ActionButton>
            <ActionButton variant="secondary" onPress={() => void onRefresh()} disabled={!canRefresh}>
              목록 새로고침
            </ActionButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}
