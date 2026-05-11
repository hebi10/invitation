import {
  getEventTypeDisplayLabel,
  listEnabledEventTypes,
  type EventTypeKey,
} from '@/lib/eventTypes';
import type { AdminCustomerLinkedEventSummary } from '@/services';

export type AssignmentEventTypeFilter = 'all' | EventTypeKey;

function formatUnassignedCountLabel(label: string, count: number) {
  return `${label} (미연결 ${count}개)`;
}

export function getAssignableEventTypeOptions(
  events: AdminCustomerLinkedEventSummary[] = []
) {
  const countByEventType = events.reduce<Partial<Record<EventTypeKey, number>>>(
    (counts, event) => ({
      ...counts,
      [event.eventType]: (counts[event.eventType] ?? 0) + 1,
    }),
    {}
  );

  return [
    {
      value: 'all' as const,
      label: formatUnassignedCountLabel('전체 이벤트', events.length),
    },
    ...listEnabledEventTypes().map((eventType) => ({
      value: eventType,
      label: formatUnassignedCountLabel(
        getEventTypeDisplayLabel(eventType),
        countByEventType[eventType] ?? 0
      ),
    })),
  ];
}

export function filterAssignableEvents(
  events: AdminCustomerLinkedEventSummary[],
  eventType: AssignmentEventTypeFilter,
  searchQuery: string
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return events.filter((event) => {
    if (eventType !== 'all' && event.eventType !== eventType) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      event.displayName,
      event.slug,
      getEventTypeDisplayLabel(event.eventType),
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}
