import styles from '../page.module.css';
import { buildWeddingDateObject } from '../pageWizardData';
import { renderFieldMeta, type ScheduleStepProps } from '../pageWizardShared';

export default function ScheduleStep({
  previewFormState,
  currentWeddingSummary,
  onDateInputChange,
  onTimeInputChange,
}: ScheduleStepProps) {
  const weddingDate = buildWeddingDateObject(previewFormState);

  return (
    <div className={styles.fieldGrid}>
      <div className={styles.twoColumnGrid}>
        <label className={styles.field}>
          {renderFieldMeta('예식 날짜', 'required')}
          <input
            className={styles.input}
            type="date"
            value={
              weddingDate
                ? `${weddingDate.getFullYear()}-${String(
                    weddingDate.getMonth() + 1
                  ).padStart(2, '0')}-${String(weddingDate.getDate()).padStart(
                    2,
                    '0'
                  )}`
                : ''
            }
            onChange={(event) => onDateInputChange(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          {renderFieldMeta('예식 시간', 'required')}
          <input
            className={styles.input}
            type="time"
            value={
              weddingDate
                ? `${String(weddingDate.getHours()).padStart(2, '0')}:${String(
                    weddingDate.getMinutes()
                  ).padStart(2, '0')}`
                : ''
            }
            onChange={(event) => onTimeInputChange(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>문장 미리보기</span>
        <strong className={styles.summaryValue}>{currentWeddingSummary}</strong>
      </div>
    </div>
  );
}
