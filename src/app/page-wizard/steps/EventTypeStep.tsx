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
  const availableEventTypeText = EVENT_TYPE_KEYS
    .filter((eventTypeKey) => getEventTypeMeta(eventTypeKey).enabled)
    .map((eventTypeKey) => getEventTypeLabel(eventTypeKey, 'admin'))
    .join(', ');

  return (
    <div className={styles.fieldGrid}>
      <section className={styles.choiceSection}>
        <div className={styles.choiceSectionHeader}>
          <span className={styles.choiceSectionBadge}>이벤트</span>
          <h3 className={styles.choiceSectionTitle}>생성할 이벤트 타입을 선택해 주세요</h3>
          <p className={styles.choiceSectionText}>
            {availableEventTypeText}
            유형을 만들 수 있습니다. 준비 중인 타입은 선택할 수 없습니다.
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
                  <span className={styles.choiceTag}>{meta.adminLabel}</span>
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
