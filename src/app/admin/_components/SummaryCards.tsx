import uiStyles from './AdminUi.module.css';

type SummaryTone = 'primary' | 'warning' | 'success' | 'neutral';

export type SummaryCardItem = {
  id: string;
  label: string;
  value: number | string;
  meta: string;
  tone?: SummaryTone;
  onClick?: () => void;
};

interface SummaryCardsProps {
  items: SummaryCardItem[];
}

export default function SummaryCards({ items }: SummaryCardsProps) {
  return (
    <section className={uiStyles.summaryGrid} aria-label="요약 지표">
      {items.map((item) => {
        const sharedClassName = `${uiStyles.summaryCard} ${uiStyles[`summaryTone${capitalize(item.tone ?? 'neutral')}`]} ${
          item.onClick ? uiStyles.summaryInteractive : ''
        }`;

        if (item.onClick) {
          return (
            <button key={item.id} type="button" className={sharedClassName} onClick={item.onClick}>
              <span className={uiStyles.summaryLabel}>{item.label}</span>
              <strong className={uiStyles.summaryValue}>{item.value}</strong>
              <p className={uiStyles.summaryMeta}>{item.meta}</p>
            </button>
          );
        }

        return (
          <article key={item.id} className={sharedClassName}>
            <span className={uiStyles.summaryLabel}>{item.label}</span>
            <strong className={uiStyles.summaryValue}>{item.value}</strong>
            <p className={uiStyles.summaryMeta}>{item.meta}</p>
          </article>
        );
      })}
    </section>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
