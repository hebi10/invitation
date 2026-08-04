import styles from './page.module.css';
import { getSelectedTemplateLabel } from './pageWizardTemplateSelection';

type TextTemplate = {
  label: string;
  value: string;
};

type TemplateChoiceGroupProps = {
  labelId: string;
  title: string;
  description: string;
  templates: readonly TextTemplate[];
  value: string;
  onSelect: (value: string) => void;
};

export default function TemplateChoiceGroup({
  labelId,
  title,
  description,
  templates,
  value,
  onSelect,
}: TemplateChoiceGroupProps) {
  const selectedTemplateLabel = getSelectedTemplateLabel(templates, value);

  return (
    <section className={styles.templateSection} aria-labelledby={labelId}>
      <div className={styles.templateHeader}>
        <strong id={labelId}>{title}</strong>
        <span>{description}</span>
      </div>
      <div className={styles.templateRow} role="group" aria-labelledby={labelId}>
        {templates.map((template) => {
          const isSelected = selectedTemplateLabel === template.label;

          return (
            <button
              key={template.label}
              type="button"
              className={`${styles.templateButton} ${
                isSelected ? styles.templateButtonSelected : ''
              }`}
              aria-pressed={isSelected}
              onClick={() => onSelect(template.value)}
            >
              <span className={styles.templateButtonLabel}>{template.label}</span>
              <span className={styles.templateButtonMeta} aria-hidden="true">
                {isSelected ? '✓ 선택됨' : '템플릿'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
