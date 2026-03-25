import uiStyles from './AdminUi.module.css';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className={uiStyles.emptyState}>
      <h3 className={uiStyles.emptyTitle}>{title}</h3>
      <p className={uiStyles.emptyDescription}>{description}</p>
      {actionLabel && onAction ? (
        <button type="button" className={`admin-button admin-button-ghost ${uiStyles.emptyAction}`} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
