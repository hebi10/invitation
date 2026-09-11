'use client';

import { useRef, useState } from 'react';
import type { Comment } from '@/services/commentService';

import { filterAdminEventComments } from './adminEventWorkspaceModel';
import { useAdminWorkGuard } from './AdminWorkGuard';
import styles from '../page.module.css';
import workspace from './AdminPeopleWorkspace.module.css';

interface AdminEventCommentsTabProps {
  pageSlug: string;
  comments: Comment[];
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  onRefresh: () => void;
  onDelete: (comment: Comment) => void | Promise<void>;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AdminEventCommentsTab({
  pageSlug,
  comments,
  loading,
  refreshing,
  error,
  onRefresh,
  onDelete,
}: AdminEventCommentsTabProps) {
  const eventComments = filterAdminEventComments(comments, pageSlug);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const deletionInProgress = useRef(false);
  useAdminWorkGuard({ dirty: false, busy: deletingId !== null });

  const handleDelete = async (comment: Comment) => {
    if (deletionInProgress.current) return;
    deletionInProgress.current = true;
    setDeletingId(comment.id);
    setDeleteError('');
    try {
      await onDelete(comment);
    } catch {
      setDeleteError('방명록을 삭제하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      deletionInProgress.current = false;
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.eventManagementStack}>
      <div className={styles.eventManagementHeading}>
        <div>
          <h3>방명록</h3>
          <p>선택 이벤트에 등록된 메시지 {eventComments.length}개</p>
        </div>
        <button
          type="button"
          className="admin-button admin-button-secondary"
          disabled={refreshing || deletingId !== null}
          onClick={onRefresh}
        >
          {refreshing ? '새로고침 중' : '새로고침'}
        </button>
      </div>

      {loading && comments.length === 0 ? (
        <p className={styles.eventManagementState}>방명록을 불러오는 중입니다.</p>
      ) : null}
      {error && comments.length === 0 ? (
        <p className={styles.eventManagementError} role="alert">방명록을 불러오지 못했습니다.</p>
      ) : null}
      {deleteError ? <p className={styles.eventManagementError} role="alert">{deleteError}</p> : null}
      {!loading && !error && eventComments.length === 0 ? (
        <p className={styles.eventManagementState}>등록된 방명록 메시지가 없습니다.</p>
      ) : null}

      {eventComments.length > 0 ? (
        <ul className={styles.eventCommentList}>
          {eventComments.map((comment) => (
            <li key={`${comment.collectionName ?? 'comments'}:${comment.id}`}>
              <div>
                <strong>{comment.author}</strong>
                <span>{formatDate(comment.createdAt)}</span>
                <p>{comment.message}</p>
              </div>
              <details className={workspace.actions}>
                <summary aria-label={`${comment.author} 방명록 작업`}>작업</summary>
              <button
                type="button"
                className="admin-button admin-button-danger"
                onClick={() => void handleDelete(comment)}
                disabled={deletingId !== null}
                aria-label={`${comment.author}의 방명록 삭제`}
              >
                {deletingId === comment.id ? '삭제 중' : '방명록 삭제'}
              </button>
              </details>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
