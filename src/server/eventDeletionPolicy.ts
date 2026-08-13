import type {
  EventDeletionJobStatus,
  EventDeletionMetadata,
  EventDeletionStep,
} from '@/types/invitationPage';

export type {
  EventDeletionJobStatus,
  EventDeletionMetadata,
  EventDeletionStep,
} from '@/types/invitationPage';

const deletionJobStatuses = new Set<EventDeletionJobStatus>([
  'pending',
  'running',
  'failed',
]);

const deletionSteps = new Set<EventDeletionStep>([
  'block-access',
  'delete-comments',
  'delete-images',
  'delete-ownership-references',
  'delete-content-and-indexes',
  'delete-event-root',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function readEventDeletionMetadata(value: unknown): EventDeletionMetadata | null {
  if (!isRecord(value)) {
    return null;
  }

  const jobId = readNonEmptyString(value.jobId);
  const requestedAt = readNonEmptyString(value.requestedAt);
  const status = value.status;
  const currentStep = value.currentStep;

  if (
    !jobId ||
    !requestedAt ||
    typeof status !== 'string' ||
    !deletionJobStatuses.has(status as EventDeletionJobStatus) ||
    typeof currentStep !== 'string' ||
    !deletionSteps.has(currentStep as EventDeletionStep) ||
    (value.retryable !== undefined && typeof value.retryable !== 'boolean')
  ) {
    return null;
  }

  return {
    jobId,
    status: status as EventDeletionJobStatus,
    currentStep: currentStep as EventDeletionStep,
    requestedAt,
    ...(typeof value.retryable === 'boolean' ? { retryable: value.retryable } : {}),
  };
}

export function isEventDeletionBlockingAccess(
  metadata: EventDeletionMetadata | null | undefined
) {
  return (
    metadata?.status === 'pending' ||
    metadata?.status === 'running' ||
    metadata?.status === 'failed'
  );
}
