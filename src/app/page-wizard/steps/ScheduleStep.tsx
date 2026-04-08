import styles from '../page.module.css';
import { buildWeddingDateObject } from '../pageWizardData';
import { renderFieldMeta, type ScheduleStepProps } from '../pageWizardShared';

export default function ScheduleStep({
  previewFormState,
  updateForm,
  currentWeddingSummary,
  onDateInputChange,
  onTimeInputChange,
}: ScheduleStepProps) {
  const weddingDate = buildWeddingDateObject(previewFormState);

  const handleScheduleDetailChange = (
    kind: 'ceremony' | 'reception',
    field: 'time' | 'location',
    value: string
  ) => {
    updateForm((draft) => {
      if (!draft.pageData) {
        return;
      }

      const currentDetail = draft.pageData[kind] ?? {};
      draft.pageData[kind] = {
        ...currentDetail,
        [field]: value,
      };

      if (kind === 'ceremony' && field === 'time') {
        draft.pageData.ceremonyTime = value;
      }
    });
  };

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

      <div className={styles.twoColumnGrid}>
        <label className={styles.field}>
          {renderFieldMeta('본식 시간', 'optional', '예: 오후 2시 30분')}
          <input
            className={styles.input}
            value={
              previewFormState.pageData?.ceremony?.time ??
              previewFormState.pageData?.ceremonyTime ??
              ''
            }
            placeholder="예: 오후 2시 30분"
            onChange={(event) =>
              handleScheduleDetailChange('ceremony', 'time', event.target.value)
            }
          />
        </label>
        <label className={styles.field}>
          {renderFieldMeta('본식 장소', 'optional', '예: 3층 그랜드홀')}
          <input
            className={styles.input}
            value={previewFormState.pageData?.ceremony?.location ?? ''}
            placeholder="예: 3층 그랜드홀"
            onChange={(event) =>
              handleScheduleDetailChange('ceremony', 'location', event.target.value)
            }
          />
        </label>
      </div>

      <div className={styles.twoColumnGrid}>
        <label className={styles.field}>
          {renderFieldMeta('피로연 시간', 'optional', '예: 오후 4시 30분')}
          <input
            className={styles.input}
            value={previewFormState.pageData?.reception?.time ?? ''}
            placeholder="예: 오후 4시 30분"
            onChange={(event) =>
              handleScheduleDetailChange('reception', 'time', event.target.value)
            }
          />
        </label>
        <label className={styles.field}>
          {renderFieldMeta('피로연 장소', 'optional', '예: 1층 연회장')}
          <input
            className={styles.input}
            value={previewFormState.pageData?.reception?.location ?? ''}
            placeholder="예: 1층 연회장"
            onChange={(event) =>
              handleScheduleDetailChange('reception', 'location', event.target.value)
            }
          />
        </label>
      </div>
    </div>
  );
}
