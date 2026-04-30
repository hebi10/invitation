import styles from '../page.module.css';
import { buildWeddingDateObject } from '../pageWizardData';
import { renderFieldMeta, type ScheduleStepProps } from '../pageWizardShared';

export default function BirthdayScheduleStep({
  previewFormState,
  updateForm,
  currentWeddingSummary,
  onDateInputChange,
  onTimeInputChange,
}: ScheduleStepProps) {
  const birthdayDate = buildWeddingDateObject(previewFormState);
  const isFirstBirthday = previewFormState.eventType === 'first-birthday';

  return (
    <div className={styles.fieldGrid}>
      <div className={styles.twoColumnGrid}>
        <label className={styles.field}>
          {renderFieldMeta(isFirstBirthday ? '돌잔치 날짜' : '파티 날짜', 'required')}
          <input
            className={styles.input}
            type="date"
            value={
              birthdayDate
                ? `${birthdayDate.getFullYear()}-${String(
                    birthdayDate.getMonth() + 1
                  ).padStart(2, '0')}-${String(birthdayDate.getDate()).padStart(2, '0')}`
                : ''
            }
            onChange={(event) => onDateInputChange(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          {renderFieldMeta(isFirstBirthday ? '돌잔치 시간' : '파티 시간', 'required')}
          <input
            className={styles.input}
            type="time"
            value={
              birthdayDate
                ? `${String(birthdayDate.getHours()).padStart(2, '0')}:${String(
                    birthdayDate.getMinutes()
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

      <label className={styles.field}>
        {renderFieldMeta(isFirstBirthday ? '돌잔치 장소명' : '파티 장소명', 'required')}
        <input
          className={styles.input}
          value={previewFormState.venue}
          placeholder={isFirstBirthday ? 'OO호텔 돌잔치홀' : '강남 OO레스토랑'}
          onChange={(event) =>
            updateForm((draft) => {
              draft.venue = event.target.value;
              if (draft.pageData) {
                draft.pageData.venueName = event.target.value;
                draft.pageData.ceremony = {
                  ...draft.pageData.ceremony,
                  location: event.target.value,
                };
              }
            })
          }
        />
      </label>
    </div>
  );
}
