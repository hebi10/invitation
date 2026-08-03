import EmptyState from './EmptyState';
import { getAdminQueryErrorMessage } from './adminPageUtils';
import uiStyles from './AdminUi.module.css';

interface AdminQueryStateProps {
  loading: boolean;
  error: Error | null;
  empty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onRetry: () => void;
  compact?: boolean;
  loadingMessage?: string;
  errorTitle?: string;
}

export default function AdminQueryState({
  loading,
  error,
  empty,
  emptyTitle,
  emptyDescription,
  onRetry,
  compact = false,
  loadingMessage = '이벤트를 불러오는 중입니다.',
  errorTitle = '이벤트를 불러오지 못했습니다.',
}: AdminQueryStateProps) {
  if (loading) {
    return (
      <div className={uiStyles.queryLoading} role="status" aria-live="polite">
        {loadingMessage}
      </div>
    );
  }

  if (error) {
    return (
      <div className={compact ? uiStyles.queryErrorCompact : uiStyles.queryError} role="alert">
        <div>
          <strong>{errorTitle}</strong>
          <p>{getAdminQueryErrorMessage(error)}</p>
        </div>
        <button type="button" className="admin-button admin-button-ghost" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    );
  }

  if (empty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return null;
}
