import { WizardField } from '../WizardFieldValidation';
import styles from '../page.module.css';
import blockStyles from './WizardVenueBlocks.module.css';
import { buildWeddingDateObject } from '../pageWizardData';
import { renderFieldMeta, type ScheduleStepProps } from '../pageWizardShared';

export default function ScheduleStep({
  previewFormState,
  updateForm,
  currentWeddingSummary,
  onDateInputChange,
  onTimeInputChange,
  mode = 'all',
}: ScheduleStepProps & { mode?: 'primary' | 'details' | 'all' }) {
  const weddingDate = buildWeddingDateObject(previewFormState);
  const detailSummary = [
    previewFormState.pageData?.ceremony?.time ?? previewFormState.pageData?.ceremonyTime,
    previewFormState.pageData?.ceremony?.location,
    previewFormState.pageData?.reception?.time,
    previewFormState.pageData?.reception?.location,
  ].filter((value) => value?.trim()).join(' · ');
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
      {mode !== 'details' ? (<section className={blockStyles.block}>
      <h3 className={blockStyles.title}>{isOpening ? '오픈 일정' : '예식 일정'}</h3>
      <div className={blockStyles.inlineFields}>
        <WizardField label={isOpening ? '오픈 날짜' : '예식 날짜'} className={styles.field}>
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
            onInput={(event) =>
              onDateInputChange((event.currentTarget as HTMLInputElement).value)
            }
            onChange={(event) => onDateInputChange(event.target.value)}
          />
        </WizardField>
        <WizardField label={isOpening ? '오픈 시간' : '예식 시간'} className={styles.field}>
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
            onInput={(event) =>
              onTimeInputChange((event.currentTarget as HTMLInputElement).value)
            }
            onChange={(event) => onTimeInputChange(event.target.value)}
          />
        </WizardField>
      </div>

      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>문장 미리보기</span>
        <strong className={styles.summaryValue}>{currentWeddingSummary}</strong>
      </div>

      </section>) : null}
      {mode !== 'primary' ? (
      <details className={blockStyles.optional}>
        <summary className={blockStyles.summary}>
          {isOpening ? '영업시간·예약 안내' : '본식 상세·피로연 안내'}
          <span className={blockStyles.badge}>선택</span>
          <span className={blockStyles.summaryText}>{detailSummary || '필요한 경우에만 입력해 주세요'}</span>
        </summary>
        <div className={`${styles.fieldGrid} ${blockStyles.body}`}>
      <div className={styles.twoColumnGrid}>
        <label className={styles.field}>
          {renderFieldMeta(
            isOpening ? '영업 시작 시간 안내' : '별도 시간 안내 문구',
            'optional',
            isOpening ? '예: 오전 10시' : '예: 오후 2시 30분부터 입장'
          )}
          <input
            className={styles.input}
            value={
              previewFormState.pageData?.ceremony?.time ??
              previewFormState.pageData?.ceremonyTime ??
              ''
            }
            placeholder={isOpening ? '예: 오전 10시' : '예: 오후 2시 30분부터 입장'}
            onChange={(event) =>
              handleScheduleDetailChange('ceremony', 'time', event.target.value)
            }
          />
        </label>
        <label className={styles.field}>
          {renderFieldMeta(
            isOpening ? '매장 내 위치' : '층·홀 이름',
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
      </details>
      ) : null}
    </div>
  );
}
