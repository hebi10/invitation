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
  const isOpening = previewFormState.eventType === 'opening';

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
          {renderFieldMeta(isOpening ? '오픈 날짜' : '예식 날짜', 'required')}
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
          {renderFieldMeta(isOpening ? '오픈 시간' : '예식 시간', 'required')}
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
          {renderFieldMeta(
            isOpening ? '영업 시작 시간' : '본식 시간',
            'optional',
            isOpening ? '예: 오전 10시' : '예: 오후 2시 30분'
          )}
          <input
            className={styles.input}
            value={
              previewFormState.pageData?.ceremony?.time ??
              previewFormState.pageData?.ceremonyTime ??
              ''
            }
            placeholder={isOpening ? '예: 오전 10시' : '예: 오후 2시 30분'}
            onChange={(event) =>
              handleScheduleDetailChange('ceremony', 'time', event.target.value)
            }
          />
        </label>
        <label className={styles.field}>
          {renderFieldMeta(
            isOpening ? '매장 내 위치' : '본식 장소',
            'optional',
            isOpening ? '예: 1층 쇼룸' : '예: 3층 그랜드홀'
          )}
          <input
            className={styles.input}
            value={previewFormState.pageData?.ceremony?.location ?? ''}
            placeholder={isOpening ? '예: 1층 쇼룸' : '예: 3층 그랜드홀'}
            onChange={(event) =>
              handleScheduleDetailChange('ceremony', 'location', event.target.value)
            }
          />
        </label>
      </div>

      <div className={styles.twoColumnGrid}>
        <label className={styles.field}>
          {renderFieldMeta(
            isOpening ? '운영시간' : '피로연 시간',
            'optional',
            isOpening ? '예: 매일 10:00 - 21:00' : '예: 오후 4시 30분'
          )}
          <input
            className={styles.input}
            value={previewFormState.pageData?.reception?.time ?? ''}
            placeholder={isOpening ? '예: 매일 10:00 - 21:00' : '예: 오후 4시 30분'}
            onChange={(event) =>
              handleScheduleDetailChange('reception', 'time', event.target.value)
            }
          />
        </label>
        <label className={styles.field}>
          {renderFieldMeta(
            isOpening ? '예약/채널 안내' : '피로연 장소',
            'optional',
            isOpening ? '예: 네이버 예약 가능' : '예: 1층 연회장'
          )}
          <input
            className={styles.input}
            value={previewFormState.pageData?.reception?.location ?? ''}
            placeholder={isOpening ? '예: 네이버 예약 가능' : '예: 1층 연회장'}
            onChange={(event) =>
              handleScheduleDetailChange('reception', 'location', event.target.value)
            }
          />
        </label>
      </div>
    </div>
  );
}
