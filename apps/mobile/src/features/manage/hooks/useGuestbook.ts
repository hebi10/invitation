import { useCallback, useEffect, useMemo, useState } from 'react';

import type { MobileInvitationDashboard } from '../../../types/mobileInvitation';
import {
  GUESTBOOK_PAGE_SIZE,
  getCommentTimestamp,
  type GuestbookSortKey,
} from '../shared';

type UseGuestbookOptions = {
  dashboard: MobileInvitationDashboard | null;
  dashboardLoading: boolean;
  refreshDashboard: (options?: { includeComments?: boolean }) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  setNotice: (message: string) => void;
};

export function useGuestbook({
  dashboard,
  dashboardLoading,
  refreshDashboard,
  deleteComment,
  setNotice,
}: UseGuestbookOptions) {
  const [guestbookModalVisible, setGuestbookModalVisible] = useState(false);
  const [hasRequestedGuestbookLoad, setHasRequestedGuestbookLoad] = useState(false);
  const [guestbookSearchQuery, setGuestbookSearchQuery] = useState('');
  const [guestbookSortKey, setGuestbookSortKey] =
    useState<GuestbookSortKey>('latest');
  const [guestbookPage, setGuestbookPage] = useState(1);

  const guestbookFilteredSortedComments = useMemo(() => {
    const source = dashboard?.comments ?? [];
    const normalizedQuery = guestbookSearchQuery.trim().toLocaleLowerCase('ko-KR');

    const filtered = normalizedQuery
      ? source.filter((comment) => {
          const author = comment.author.toLocaleLowerCase('ko-KR');
          const message = comment.message.toLocaleLowerCase('ko-KR');
          return author.includes(normalizedQuery) || message.includes(normalizedQuery);
        })
      : source;

    return [...filtered].sort((left, right) => {
      if (guestbookSortKey === 'latest') {
        return getCommentTimestamp(right.createdAt) - getCommentTimestamp(left.createdAt);
      }

      if (guestbookSortKey === 'oldest') {
        return getCommentTimestamp(left.createdAt) - getCommentTimestamp(right.createdAt);
      }

      if (guestbookSortKey === 'author-asc') {
        return left.author.localeCompare(right.author, 'ko');
      }

      return right.author.localeCompare(left.author, 'ko');
    });
  }, [dashboard?.comments, guestbookSearchQuery, guestbookSortKey]);

  const guestbookTotalPages = useMemo(
    () => Math.max(1, Math.ceil(guestbookFilteredSortedComments.length / GUESTBOOK_PAGE_SIZE)),
    [guestbookFilteredSortedComments.length]
  );

  const guestbookPageComments = useMemo(() => {
    const startIndex = (guestbookPage - 1) * GUESTBOOK_PAGE_SIZE;
    return guestbookFilteredSortedComments.slice(
      startIndex,
      startIndex + GUESTBOOK_PAGE_SIZE
    );
  }, [guestbookFilteredSortedComments, guestbookPage]);

  useEffect(() => {
    setHasRequestedGuestbookLoad(false);
  }, [dashboard?.page.slug, guestbookModalVisible]);

  useEffect(() => {
    if (
      !guestbookModalVisible ||
      hasRequestedGuestbookLoad ||
      !dashboard ||
      dashboardLoading ||
      dashboard.commentsIncluded
    ) {
      return;
    }

    setHasRequestedGuestbookLoad(true);
    void refreshDashboard({ includeComments: true });
  }, [
    dashboard,
    dashboardLoading,
    guestbookModalVisible,
    hasRequestedGuestbookLoad,
    refreshDashboard,
  ]);

  useEffect(() => {
    setGuestbookPage(1);
  }, [guestbookSearchQuery, guestbookSortKey, dashboard?.comments.length]);

  useEffect(() => {
    setGuestbookPage((current) => Math.min(current, guestbookTotalPages));
  }, [guestbookTotalPages]);

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      const deleted = await deleteComment(commentId);
      if (deleted) {
        setNotice('방명록 댓글을 삭제했습니다.');
      }
    },
    [deleteComment, setNotice]
  );

  const openGuestbookModal = useCallback(() => {
    setGuestbookModalVisible(true);
    setGuestbookPage(1);
  }, []);

  const closeGuestbookModal = useCallback(() => {
    setGuestbookModalVisible(false);
  }, []);

  return {
    guestbookModalVisible,
    guestbookSearchQuery,
    guestbookSortKey,
    guestbookPage,
    guestbookFilteredSortedComments,
    guestbookTotalPages,
    guestbookPageComments,
    setGuestbookSearchQuery,
    setGuestbookSortKey,
    setGuestbookPage,
    openGuestbookModal,
    closeGuestbookModal,
    handleDeleteComment,
  };
}
