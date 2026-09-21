import { useState } from 'react';

import styles from './page.module.css';
import panelStyles from './pageWizardEditorPanels.module.css';
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
  const [previewTemplate, setPreviewTemplate] = useState<TextTemplate | null>(null);
  const [undoValue, setUndoValue] = useState<{ previous: string; applied: string } | null>(null);

  return (
    <section className={styles.templateSection} aria-labelledby={labelId}>
      <div className={styles.templateHeader}>
        <strong id={labelId}>{title}</strong>
        <span>{description}</span>
      </div>
      <div className={styles.templateRow} role="group" aria-labelledby={labelId}>
        {templates.map((template) => {
          const isSelected = previewTemplate?.label === template.label;

          return (
            <button
              key={template.label}
              type="button"
              className={`${styles.templateButton} ${
                isSelected ? styles.templateButtonSelected : ''
              }`}
              aria-pressed={isSelected}
              onClick={() => setPreviewTemplate(template)}
            >
              <span className={styles.templateButtonLabel}>{template.label}</span>
              <span className={styles.templateButtonMeta} aria-hidden="true">
                {selectedTemplateLabel === template.label ? '적용 중' : isSelected ? '미리보기 중' : '미리보기'}
              </span>
            </button>
          );
        })}
      </div>
      {previewTemplate ? (
        <div className={panelStyles.templatePreview} aria-live="polite">
          <strong>{previewTemplate.label} 미리보기</strong>
          <p>{previewTemplate.value}</p>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={value === previewTemplate.value}
            onClick={() => {
              setUndoValue({ previous: value, applied: previewTemplate.value });
              onSelect(previewTemplate.value);
            }}
          >
            {value === previewTemplate.value ? '현재 적용된 문구' : '이 문구 적용'}
          </button>
        </div>
      ) : null}
      {undoValue && value === undoValue.applied ? (
        <button type="button" className={styles.secondaryButton} onClick={() => {
          onSelect(undoValue.previous);
          setUndoValue(null);
        }}>
          적용 전 문구로 되돌리기
        </button>
      ) : null}
    </section>
  );
}
