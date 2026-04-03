import uiStyles from './AdminUi.module.css';

interface EmptyStateProps {
  title: string;
  description: string;
  highlights?: string[];
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  highlights,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className={uiStyles.emptyState}>
      <h3 className={uiStyles.emptyTitle}>{title}</h3>
      <p className={uiStyles.emptyDescription}>{description}</p>
      {highlights && highlights.length > 0 ? (
        <ul className={uiStyles.emptyHighlights}>
          {highlights.map((highlight) => (
            <li key={highlight} className={uiStyles.emptyHighlight}>
              {highlight}
            </li>
          ))}
        </ul>
      ) : null}
      {((actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction)) ? (
        <div className={`${uiStyles.emptyActions} ${uiStyles.emptyAction}`}>
          {actionLabel && onAction ? (
            <button
              type="button"
              className="admin-button admin-button-ghost"
              onClick={onAction}
            >
              {actionLabel}
            </button>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
