import 'server-only';

import { getServerFirestore } from './firebaseAdmin';
import { listStoredEventSummaries } from './repositories/eventRepository';
import {
  buildEventSecretRecordFromEventDoc,
  type EventSecretRecordDto,
  type EventSummaryRecord,
} from './repositories/eventReadThroughDtos';

const EVENT_SECRET_COLLECTION = 'eventSecrets';

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

function buildPasswordSecurityFromSecret(
  secretRecord: EventSecretRecordDto | null,
  summary: EventSummaryRecord
) {
  const hasHash = Boolean(
    secretRecord?.passwordHash &&
      secretRecord.passwordSalt &&
      secretRecord.passwordIterations
  );
  const hasPassword = Boolean(secretRecord);

  return {
    hasPassword,
    passwordVersion: secretRecord?.passwordVersion ?? null,
    requiresReset: hasPassword ? !hasHash : false,
    passwordUpdatedAt: secretRecord?.updatedAt ?? null,
    displayName: summary.displayName ?? summary.title ?? summary.slug,
  };
}

async function syncMissingSecuritySummary(summary: EventSummaryRecord) {
  const db = getServerFirestore();
  if (!db) {
    return summary.security;
  }

  const secretSnapshot = await db
    .collection(EVENT_SECRET_COLLECTION)
    .doc(summary.eventId)
    .get();
  const secretRecord = secretSnapshot.exists
    ? buildEventSecretRecordFromEventDoc(summary, secretSnapshot.data() ?? {})
    : null;
  const nextSecurity = buildPasswordSecurityFromSecret(secretRecord, summary);

  await db
    .collection('events')
    .doc(summary.eventId)
    .set(
      {
        security: {
          hasPassword: nextSecurity.hasPassword,
          passwordVersion: nextSecurity.passwordVersion,
          requiresReset: nextSecurity.requiresReset,
          passwordUpdatedAt: nextSecurity.passwordUpdatedAt,
        },
      },
      { merge: true }
    );

  return {
    hasPassword: nextSecurity.hasPassword,
    passwordVersion: nextSecurity.passwordVersion,
    requiresReset: nextSecurity.requiresReset,
    passwordUpdatedAt: nextSecurity.passwordUpdatedAt,
  };
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
        : await syncMissingSecuritySummary(summary);

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
