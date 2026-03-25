import uiStyles from './AdminUi.module.css';

export type StatusTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

interface StatusBadgeProps {
  tone?: StatusTone;
  children: React.ReactNode;
}

export default function StatusBadge({ tone = 'neutral', children }: StatusBadgeProps) {
  return <span className={`${uiStyles.statusBadge} ${uiStyles[`badge${capitalize(tone)}`]}`}>{children}</span>;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
