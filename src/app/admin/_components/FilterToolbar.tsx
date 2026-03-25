import uiStyles from './AdminUi.module.css';

type FilterChip = {
  id: string;
  label: string;
  onRemove?: () => void;
};

interface FilterToolbarProps {
  fields: React.ReactNode;
  actions?: React.ReactNode;
  chips?: FilterChip[];
}

export default function FilterToolbar({ fields, actions, chips }: FilterToolbarProps) {
  return (
    <div className={uiStyles.toolbar}>
      <div className={uiStyles.toolbarRow}>
        <div className={uiStyles.toolbarFields}>{fields}</div>
        {actions ? <div className={uiStyles.toolbarActions}>{actions}</div> : null}
      </div>

      {chips && chips.length > 0 ? (
        <div className={uiStyles.filterChips}>
          {chips.map((chip) => (
            <span key={chip.id} className={uiStyles.filterChip}>
              {chip.label}
              {chip.onRemove ? (
                <button type="button" className={uiStyles.chipDismiss} onClick={chip.onRemove} aria-label={`${chip.label} 제거`}>
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
