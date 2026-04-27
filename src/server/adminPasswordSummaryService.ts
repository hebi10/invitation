import 'server-only';

import { listStoredEventSummaries } from './repositories/eventRepository';
import {
  type EventSummaryRecord,
} from './repositories/eventReadThroughDtos';
import { syncEventPasswordSecuritySummary } from './repositories/eventSecretRepository';

export interface AdminClientPasswordSummaryRecord {
  eventId: string;
  slug: string;
  displayName: string;
  defaultTheme: string;
  hasPassword: boolean;
  passwordVersion: number;
  requiresReset: boolean;
  updatedAt: string | null;
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function hasCompleteSecuritySummary(summary: EventSummaryRecord) {
  return (
    summary.security !== null &&
    typeof summary.security.hasPassword === 'boolean' &&
    (summary.security.hasPassword === false ||
      typeof summary.security.passwordVersion === 'number')
  );
}

export async function listAdminClientPasswordSummaries() {
  const eventSummaries = await listStoredEventSummaries();

  const resolvedSecurityEntries = await Promise.all(
    eventSummaries.map(async (summary) => {
      const security = hasCompleteSecuritySummary(summary)
        ? summary.security
        : await syncEventPasswordSecuritySummary(summary);

      return {
        eventId: summary.eventId,
        slug: summary.slug,
        displayName: summary.displayName ?? summary.title ?? summary.slug,
        defaultTheme: summary.defaultTheme,
        hasPassword: security?.hasPassword === true,
        passwordVersion: security?.passwordVersion ?? 0,
        requiresReset: security?.requiresReset === true,
        updatedAt: toIsoString(security?.passwordUpdatedAt),
      } satisfies AdminClientPasswordSummaryRecord;
    })
  );

  return resolvedSecurityEntries.sort((left, right) =>
    left.displayName.localeCompare(right.displayName, 'ko')
  );
}
