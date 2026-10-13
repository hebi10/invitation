import AdminQueryState from './AdminQueryState';
import styles from '../page.module.css';

export default function AdminStaleQueryNotice({
  error,
  sourceLabel,
  hasPreviousData,
  onRetry,
}: {
  error: Error | null;
  sourceLabel: string;
  hasPreviousData: boolean;
  onRetry: () => void;
}) {
  if (!error) return null;
  return <div className={styles.eventManagementStack}>
    <AdminQueryState loading={false} error={error} empty={false}
      emptyTitle="" emptyDescription="" compact={hasPreviousData} onRetry={onRetry}
      errorTitle={`${sourceLabel} 최신 정보를 불러오지 못했습니다.`} />
    {hasPreviousData ? <p className={styles.eventManagementState}>이전에 조회한 {sourceLabel} 정보를 표시합니다. 다시 조회해 주세요.</p> : null}
  </div>;
}
