import { EVENT_TYPE_KEYS, getEventTypeMeta, type EventTypeKey } from '@/lib/eventTypes';

import styles from '../page.module.css';
import {
  getEventTypeDescription,
  getEventTypeLabel,
  type EventTypeStepProps,
} from '../pageWizardShared';

export default function EventTypeStep({
  eventType,
  setEventType,
  updateForm,
}: EventTypeStepProps) {
  return (
    <div className={styles.fieldGrid}>
      <section className={styles.choiceSection}>
        <div className={styles.choiceSectionHeader}>
          <span className={styles.choiceSectionBadge}>이벤트</span>
          <h3 className={styles.choiceSectionTitle}>생성할 이벤트 타입을 선택해 주세요</h3>
          <p className={styles.choiceSectionText}>
            현재는 모바일 청첩장과 birthday PoC를 먼저 지원하고, 다른 이벤트 타입은 같은 구조로
            확장할 수 있게 준비 중입니다.
          </p>
        </div>
        <div className={styles.choiceOptions}>
          {EVENT_TYPE_KEYS.map((eventTypeKey) => {
            const meta = getEventTypeMeta(eventTypeKey);
            const isActive = eventType === eventTypeKey;
            const isEnabled = meta.enabled;

            return (
              <button
                key={eventTypeKey}
                type="button"
                aria-pressed={isActive}
                className={`${styles.choiceCard} ${isActive ? styles.choiceCardActive : ''}`}
                onClick={() => {
                  if (!isEnabled) {
                    return;
                  }

                  setEventType(eventTypeKey);
                  updateForm((draft) => {
                    draft.eventType = eventTypeKey as EventTypeKey;
                  });
                }}
                disabled={!isEnabled}
              >
                <div className={styles.choiceCardTop}>
                  <span className={styles.choiceTag}>{meta.key}</span>
                  {isActive ? (
                    <span className={styles.choiceSelectedBadge}>선택됨</span>
                  ) : !isEnabled ? (
                    <span className={styles.optionalBadge}>준비 중</span>
                  ) : null}
                </div>
                <h3 className={styles.choiceTitle}>{getEventTypeLabel(eventTypeKey)}</h3>
                <p className={styles.choiceText}>{getEventTypeDescription(eventTypeKey)}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
