import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import type {
  MobileGuestbookCommentAction,
  MobileInvitationDashboard,
} from '../../../types/mobileInvitation';
import {
  GUESTBOOK_PAGE_SIZE,
  getCommentTimestamp,
  type GuestbookSortKey,
} from '../shared';

type UseGuestbookOptions = {
  dashboard: MobileInvitationDashboard | null;
  dashboardLoading: boolean;
  refreshDashboard: (options?: { includeComments?: boolean }) => Promise<boolean>;
  manageComment: (
    commentId: string,
    action: MobileGuestbookCommentAction
  ) => Promise<unknown>;
  setNotice: (message: string) => void;
};

export function useGuestbook({
  dashboard,
  dashboardLoading,
  refreshDashboard,
  manageComment,
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

  const runCommentAction = useCallback(
    async (
      commentId: string,
      action: MobileGuestbookCommentAction,
      successMessage: string
    ) => {
      const result = await manageComment(commentId, action);
      if (result) {
        setNotice(successMessage);
      }
    },
    [manageComment, setNotice]
  );

  const handleHideComment = useCallback(
    async (commentId: string) => {
      Alert.alert(
        '방명록을 숨길까요?',
        '하객 화면에서는 즉시 숨겨지고, 운영 화면에서 다시 공개할 수 있습니다.',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '숨김',
            onPress: () => {
              void runCommentAction(commentId, 'hide', '방명록을 숨김 처리했습니다.');
            },
          },
        ]
      );
    },
    [runCommentAction]
  );

  const handleScheduleDeleteComment = useCallback(
    async (commentId: string) => {
      Alert.alert(
        '삭제 예정으로 옮길까요?',
        '삭제 예정 상태에서는 하객 화면에서 숨겨지고, 30일 안에는 다시 복구할 수 있습니다.',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '삭제 예정',
            style: 'destructive',
            onPress: () => {
              void runCommentAction(
                commentId,
                'scheduleDelete',
                '방명록을 삭제 예정 상태로 옮겼습니다.'
              );
            },
          },
        ]
      );
    },
    [runCommentAction]
  );

  const handleRestoreComment = useCallback(
    async (commentId: string) => {
      void runCommentAction(commentId, 'restore', '방명록을 다시 공개했습니다.');
    },
    [runCommentAction]
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
    handleHideComment,
    handleScheduleDeleteComment,
    handleRestoreComment,
  };
}
