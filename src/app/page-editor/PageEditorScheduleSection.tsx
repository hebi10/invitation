import type { InvitationPageSeed } from '@/types/invitationPage';

import {
  formatDateInputValue,
  formatTimeInputValue,
} from './pageEditorDerivedState';
import { renderFieldMeta } from './pageEditorFieldMeta';
import styles from './page.module.css';

type PageDataTextField =
  | 'subtitle'
  | 'ceremonyTime'
  | 'ceremonyAddress'
  | 'ceremonyContact'
  | 'greetingMessage'
  | 'greetingAuthor'
  | 'mapUrl'
  | 'mapDescription'
  | 'venueName';

interface PageEditorScheduleSectionProps {
  formState: InvitationPageSeed;
  weddingSummary: string;
  onDateInputChange: (value: string) => void;
  onTimeInputChange: (value: string) => void;
  onManualDateTextChange: (value: string) => void;
  onPageDataFieldChange: (field: PageDataTextField, value: string) => void;
  onScheduleDetailFieldChange: (
    kind: 'ceremony' | 'reception',
    field: 'time' | 'location',
    value: string
  ) => void;
}

export default function PageEditorScheduleSection({
  formState,
  weddingSummary,
  onDateInputChange,
  onTimeInputChange,
  onManualDateTextChange,
  onPageDataFieldChange,
  onScheduleDetailFieldChange,
}: PageEditorScheduleSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>날짜와 시간 입력</h2>
          <p className={styles.sectionDescription}>
            날짜와 시간을 정확히 입력하면 표지 문구와 달력 미리보기가 함께 업데이트됩니다.
          </p>
        </div>
      </div>

      <div className={styles.dualGrid}>
        <label className={styles.field}>
          {renderFieldMeta(
            '예식 날짜',
            'required',
            '달력에서 날짜를 선택하면 자동으로 대표 날짜 문구가 바뀝니다.'
          )}
          <input
            className={styles.input}
            type="date"
            value={formatDateInputValue(formState)}
            onChange={(event) => onDateInputChange(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          {renderFieldMeta(
            '예식 시간',
            'required',
            '30분 단위나 정각처럼 실제 진행 시간을 입력해 주세요.'
          )}
          <input
            className={styles.input}
            type="time"
            value={formatTimeInputValue(formState)}
            onChange={(event) => onTimeInputChange(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.summaryHighlightCard}>
        <span className={styles.summaryHighlightLabel}>문장형 요약</span>
        <strong className={styles.summaryHighlightValue}>{weddingSummary}</strong>
        <p className={styles.summaryHighlightText}>
          손님이 읽는 날짜 문구와 카운트다운 계산은 이 값을 기준으로 맞춰집니다.
        </p>
      </div>

      <details className={styles.detailsGroup}>
        <summary className={styles.detailsSummary}>표지에 보이는 날짜 문구 직접 수정</summary>
        <div className={styles.detailsBody}>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              {renderFieldMeta(
                '대표 날짜 문구',
                'required',
                '자동 생성된 문구를 조금 다르게 표현하고 싶을 때만 수정해 주세요.'
              )}
              <input
                className={styles.input}
                value={formState.date}
                placeholder="예: 2026년 4월 14일 화요일"
                onChange={(event) => onManualDateTextChange(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              {renderFieldMeta(
                '표시 시간 문구',
                'optional',
                '오후 3시, 오후 3시 30분처럼 손님에게 보일 시간 표현입니다.'
              )}
              <input
                className={styles.input}
                value={formState.pageData?.ceremonyTime ?? ''}
                placeholder="예: 오후 3시"
                onChange={(event) =>
                  onPageDataFieldChange('ceremonyTime', event.target.value)
                }
              />
            </label>
          </div>
        </div>
      </details>

      <details className={styles.detailsGroup}>
        <summary className={styles.detailsSummary}>본식/피로연 상세 일정 (선택)</summary>
        <div className={styles.detailsBody}>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              {renderFieldMeta('본식 시간', 'optional', '예: 오후 2시 30분')}
              <input
                className={styles.input}
                value={
                  formState.pageData?.ceremony?.time ??
                  formState.pageData?.ceremonyTime ??
                  ''
                }
                placeholder="예: 오후 2시 30분"
                onChange={(event) =>
                  onScheduleDetailFieldChange('ceremony', 'time', event.target.value)
                }
              />
            </label>

            <label className={styles.field}>
              {renderFieldMeta('본식 장소', 'optional', '예: 3층 그랜드홀')}
              <input
                className={styles.input}
                value={formState.pageData?.ceremony?.location ?? ''}
                placeholder="예: 3층 그랜드홀"
                onChange={(event) =>
                  onScheduleDetailFieldChange(
                    'ceremony',
                    'location',
                    event.target.value
                  )
                }
              />
            </label>

            <label className={styles.field}>
              {renderFieldMeta('피로연 시간', 'optional', '예: 오후 4시 30분')}
              <input
                className={styles.input}
                value={formState.pageData?.reception?.time ?? ''}
                placeholder="예: 오후 4시 30분"
                onChange={(event) =>
                  onScheduleDetailFieldChange('reception', 'time', event.target.value)
                }
              />
            </label>

            <label className={styles.field}>
              {renderFieldMeta('피로연 장소', 'optional', '예: 1층 연회장')}
              <input
                className={styles.input}
                value={formState.pageData?.reception?.location ?? ''}
                placeholder="예: 1층 연회장"
                onChange={(event) =>
                  onScheduleDetailFieldChange(
                    'reception',
                    'location',
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </div>
      </details>
    </section>
  );
}
