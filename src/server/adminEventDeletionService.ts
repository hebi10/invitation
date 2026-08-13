import 'server-only';

import {
  beginEventDeletion,
  claimFailedEventDeletionJob,
  completeEventDeletionJob,
  completeEventDeletionStep,
  deleteEventAndOperationalRecordsBySlug,
  failEventDeletionStep,
  markEventDeletionStepRunning,
  runEventDeletionRepositoryStep,
  type DeleteStepResult,
  type DeleteAdminEventResult,
  type EventDeletionJob,
  type EventDeletionJobStatus,
} from './repositories/adminEventDeletionRepository';
import type { EventDeletionStep } from '@/types/invitationPage';

export type { DeleteAdminEventResult };

const EVENT_DELETION_STEPS: EventDeletionStep[] = [
  'block-access',
  'delete-comments',
  'delete-images',
  'delete-ownership-references',
  'delete-content-and-indexes',
  'delete-event-root',
];

const DATA_INCONSISTENCY_ERROR_MESSAGES = new Set([
  'Event deletion job was not found.',
  'Event deletion checkpoint prerequisites are incomplete.',
]);

const DATA_INCONSISTENCY_ERROR_CODES = new Set([
  'data-loss',
  'failed-precondition',
  'invalid-argument',
  'not-found',
  'permission-denied',
  'unauthenticated',
]);

export interface AdminEventDeletionResult {
  success: boolean;
  deletionJobId?: string;
  deletionStatus?: EventDeletionJobStatus;
  failedStep?: EventDeletionStep;
  retryable?: boolean;
}

export interface AdminEventDeletionServiceDependencies {
  begin(pageSlug: string, requestedBy: string): Promise<EventDeletionJob | null>;
  claim(pageSlug: string, requestedBy: string): Promise<EventDeletionJob | null>;
  markStepRunning(jobId: string, step: EventDeletionStep): Promise<void>;
  runStep(job: EventDeletionJob, step: EventDeletionStep): Promise<DeleteStepResult>;
  completeStep(jobId: string, step: EventDeletionStep): Promise<void>;
  failStep(
    jobId: string,
    step: EventDeletionStep,
    errorCode: string,
    retryable: boolean
  ): Promise<void>;
  completeJob(jobId: string): Promise<void>;
}

function readErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string') {
    return null;
  }

  return code.includes('/') ? code.slice(code.lastIndexOf('/') + 1) : code;
}

function isDataInconsistencyError(error: unknown) {
  return (
    (error instanceof Error && DATA_INCONSISTENCY_ERROR_MESSAGES.has(error.message)) ||
    DATA_INCONSISTENCY_ERROR_CODES.has(readErrorCode(error) ?? '')
  );
}

async function runAdminEventDeletionJob(
  job: EventDeletionJob,
  dependencies: AdminEventDeletionServiceDependencies
): Promise<AdminEventDeletionResult> {
  let activeStep: EventDeletionStep = job.currentStep;

  try {
    for (const step of EVENT_DELETION_STEPS) {
      if (job.completedSteps.includes(step)) {
        continue;
      }

      activeStep = step;
      await dependencies.markStepRunning(job.id, step);
      await dependencies.runStep(job, step);
      await dependencies.completeStep(job.id, step);
    }

    await dependencies.completeJob(job.id);
    return {
      success: true,
      deletionJobId: job.id,
      deletionStatus: 'completed',
    };
  } catch (error) {
    const dataInconsistency = isDataInconsistencyError(error);
    const retryable = !dataInconsistency;
    const errorCode = dataInconsistency
      ? 'event-deletion-data-inconsistency'
      : 'event-deletion-temporary-failure';

    await dependencies.failStep(job.id, activeStep, errorCode, retryable);
    return {
      success: false,
      deletionJobId: job.id,
      deletionStatus: 'failed',
      failedStep: activeStep,
      retryable,
    };
  }
}

export function createAdminEventDeletionService(
  dependencies: AdminEventDeletionServiceDependencies
) {
  return {
    async requestAdminEventDeletion(
      pageSlug: string,
      requestedBy: string
    ): Promise<AdminEventDeletionResult | null> {
      const job = await dependencies.begin(pageSlug, requestedBy);
      if (!job) {
        return null;
      }
      if (job.status === 'failed') {
        return {
          success: false,
          deletionJobId: job.id,
          deletionStatus: 'failed',
          failedStep: job.currentStep,
          retryable: job.retryable === true,
        };
      }

      return runAdminEventDeletionJob(job, dependencies);
    },

    async retryAdminEventDeletion(
      pageSlug: string,
      requestedBy: string
    ): Promise<AdminEventDeletionResult | null> {
      const job = await dependencies.claim(pageSlug, requestedBy);
      if (!job) {
        return null;
      }

      return runAdminEventDeletionJob(job, dependencies);
    },
  };
}

const adminEventDeletionService = createAdminEventDeletionService({
  begin: beginEventDeletion,
  claim: claimFailedEventDeletionJob,
  markStepRunning: markEventDeletionStepRunning,
  runStep: runEventDeletionRepositoryStep,
  completeStep: completeEventDeletionStep,
  failStep: failEventDeletionStep,
  completeJob: completeEventDeletionJob,
});

export const requestAdminEventDeletion =
  adminEventDeletionService.requestAdminEventDeletion;
export const retryAdminEventDeletion =
  adminEventDeletionService.retryAdminEventDeletion;

export async function deleteAdminEventBySlug(pageSlug: string): Promise<DeleteAdminEventResult | null> {
  return deleteEventAndOperationalRecordsBySlug(pageSlug);
}
