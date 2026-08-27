import assert from 'node:assert/strict';

import {
  isEventDeletionBlockingAccess,
  readEventDeletionMetadata,
} from '../src/server/eventDeletionPolicy.ts';
import { buildAdminInvitationPageSummary } from '../src/server/adminInvitationPagesService.ts';
import { createClientEditorSessionValue } from '../src/server/clientEditorSession.ts';
import { authorizeMobileClientEditorToken } from '../src/server/clientEditorMobileApi.ts';
import {
  CustomerEventClaimError,
  claimCustomerEventOwnership,
  getCustomerEventOwnershipSnapshot,
  saveCustomerEditableInvitationPageConfig,
} from '../src/server/customerEventsService.ts';
import {
  createAdminEventDeletionService,
  type AdminEventDeletionServiceDependencies,
} from '../src/server/adminEventDeletionService.ts';
import {
  EventOwnershipInviteError,
  consumeEventOwnershipInvite,
  issueEventOwnershipInvite,
} from '../src/server/eventOwnershipInviteService.ts';
import { normalizeEventSummaryRecord } from '../src/server/repositories/eventReadThroughDtos.ts';
import type {
  EventDeletionJob,
} from '../src/server/repositories/adminEventDeletionRepository.ts';
import type { EventDeletionStep } from '../src/types/invitationPage.ts';

const validDeletion = {
  jobId: 'delete-opening-bloom-cafe',
  status: 'pending',
  currentStep: 'block-access',
  requestedAt: '2026-08-13T00:00:00.000Z',
  retryable: true,
};

assert.deepEqual(
  readEventDeletionMetadata(validDeletion),
  validDeletion,
  'valid deletion metadata should be retained'
);

for (const status of ['pending', 'running', 'failed'] as const) {
  assert.equal(
    isEventDeletionBlockingAccess({ ...validDeletion, status }),
    true,
    `${status} deletion jobs should block access`
  );
}

assert.equal(
  readEventDeletionMetadata({ ...validDeletion, status: 'completed' }),
  null,
  'unknown deletion job statuses should be discarded'
);
assert.equal(
  readEventDeletionMetadata({ ...validDeletion, currentStep: 'unexpected' }),
  null,
  'unknown deletion steps should be discarded'
);
assert.equal(
  readEventDeletionMetadata(null),
  null,
  'non-record deletion metadata should be discarded'
);
assert.equal(
  isEventDeletionBlockingAccess(null),
  false,
  'events without deletion metadata should remain accessible'
);

const normalEvent = normalizeEventSummaryRecord('event-normal', {
  slug: 'normal-event',
});
assert.ok(normalEvent);
assert.equal(normalEvent.deletion, null, 'existing events without deletion metadata should remain normal');

const deletingEvent = normalizeEventSummaryRecord('event-deleting', {
  slug: 'deleting-event',
  deletion: validDeletion,
});
assert.ok(deletingEvent);
assert.deepEqual(deletingEvent.deletion, validDeletion, 'DTOs should expose valid deletion metadata');

const invalidDeletionEvent = normalizeEventSummaryRecord('event-invalid-deletion', {
  slug: 'invalid-deletion-event',
  deletion: { ...validDeletion, status: 'completed' },
});
assert.ok(invalidDeletionEvent);
assert.equal(invalidDeletionEvent.deletion, null, 'DTOs should normalize invalid deletion metadata to null');

const adminSummary = buildAdminInvitationPageSummary(
  deletingEvent,
  null,
  new Set(),
  'none'
);
assert.deepEqual(
  adminSummary.deletion,
  validDeletion,
  'admin invitation summaries should receive deletion metadata when present'
);

function isSafeDeletionConflict(error: unknown) {
  return (
    error instanceof Error &&
    'status' in error &&
    error.status === 409 &&
    !error.message.includes(validDeletion.jobId) &&
    !error.message.includes(validDeletion.currentStep)
  );
}

{
  const ownership = await getCustomerEventOwnershipSnapshot(
    'customer-1',
    'deleting-event',
    {
      resolveEventBySlug: async () => ({
        summary: { deletion: validDeletion },
      }) as never,
    }
  );

  assert.deepEqual(
    ownership,
    { status: 'unavailable', summary: null },
    'customer access checks should hide deletion metadata behind an unavailable state'
  );
}

await assert.rejects(
  () =>
    saveCustomerEditableInvitationPageConfig(
      'customer-1',
      'deleting-event',
      { config: { slug: 'deleting-event' } as never },
      {
        resolveEventBySlug: async () => ({
          summary: { deletion: validDeletion },
        }) as never,
      }
    ),
  isSafeDeletionConflict,
  'customer saves should return a safe conflict while deletion blocks access'
);

{
  let claimCalls = 0;

  await assert.rejects(
    () =>
      claimCustomerEventOwnership('customer-1', 'deleting-event', {
        isAdminUserEnabled: async () => false,
        getCustomerIdentity: async () => ({
          uid: 'customer-1',
          email: 'customer@example.test',
          displayName: '고객',
        }),
        resolveEventBySlug: async () => ({
          summary: { deletion: validDeletion },
        }) as never,
        claimOwnerBySlug: async () => {
          claimCalls += 1;
          throw new Error('ownership mutation must not run');
        },
        getEditableSnapshot: async () => null as never,
      }),
    (error: unknown) =>
      error instanceof CustomerEventClaimError && isSafeDeletionConflict(error),
    'customer ownership claims should return a safe conflict while deletion blocks access'
  );
  assert.equal(claimCalls, 0, 'blocked ownership claims must not mutate the event');
}

{
  let inviteMutationCalls = 0;

  await assert.rejects(
    () =>
      issueEventOwnershipInvite(
        {
          pageSlug: 'deleting-event',
          createdByUid: 'admin-1',
          baseUrl: 'https://example.test',
        },
        {
          resolveEventBySlug: async () => ({
            summary: { deletion: validDeletion },
          }) as never,
          issueStoredInvite: async () => {
            inviteMutationCalls += 1;
            throw new Error('ownership invite mutation must not run');
          },
        }
      ),
    (error: unknown) =>
      error instanceof EventOwnershipInviteError && isSafeDeletionConflict(error),
    'ownership invite issuance should return a safe conflict while deletion blocks access'
  );
  assert.equal(
    inviteMutationCalls,
    0,
    'blocked ownership invite requests must not write an invite'
  );
}

{
  let consumeMutationCalls = 0;

  await assert.rejects(
    () =>
      consumeEventOwnershipInvite(
        {
          pageSlug: 'deleting-event',
          token: 'secret-token',
          customer: { uid: 'customer-1' },
        },
        {
          resolveEventBySlug: async () => ({
            summary: { deletion: validDeletion },
          }) as never,
          consumeStoredInvite: async () => {
            consumeMutationCalls += 1;
            throw new Error('ownership consume mutation must not run');
          },
        }
      ),
    (error: unknown) =>
      error instanceof EventOwnershipInviteError && isSafeDeletionConflict(error),
    'ownership invite consumption should return a safe conflict while deletion blocks access'
  );
  assert.equal(
    consumeMutationCalls,
    0,
    'blocked ownership invite consumption must not change ownership'
  );
}

{
  const pageSlug = 'deleting-event';
  const session = createClientEditorSessionValue({
    pageSlug,
    passwordVersion: 1,
    scopes: ['canEditInvitation'],
  });

  await assert.rejects(
    () =>
      authorizeMobileClientEditorToken(pageSlug, session.value, {
        deletionBehavior: 'conflict',
        resolveEventBySlug: async () => ({
          summary: { deletion: validDeletion },
        }) as never,
      }),
    isSafeDeletionConflict,
    'mobile editor saves should receive a safe conflict while deletion blocks access'
  );
}

const deletionSteps: EventDeletionStep[] = [
  'block-access',
  'delete-comments',
  'delete-images',
  'delete-ownership-references',
  'delete-content-and-indexes',
  'delete-event-root',
];

function createDeletionJob(
  overrides: Partial<EventDeletionJob> = {}
): EventDeletionJob {
  return {
    id: 'deletion-job-1',
    eventId: 'event-1',
    slug: 'event-one',
    status: 'pending',
    currentStep: 'block-access',
    completedSteps: [],
    requestedBy: 'admin-1',
    requestedAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides,
  };
}

function createInMemoryDeletionDependencies(
  job: EventDeletionJob | null,
  runStep: AdminEventDeletionServiceDependencies['runStep'] = async () => ({
    deletedCount: 0,
  })
) {
  const actions: string[] = [];
  const calls = { begin: 0, claim: 0, claimWon: 0, find: 0 };
  const failedCheckpoints: Array<{
    step: EventDeletionStep;
    errorCode: string;
    retryable: boolean;
  }> = [];
  const dependencies = {
    begin: async () => {
      calls.begin += 1;
      return job;
    },
    find: async () => {
      calls.find += 1;
      return job ? structuredClone(job) : null;
    },
    claim: async () => {
      calls.claim += 1;
      if (!job || job.status !== 'failed') {
        return null;
      }

      calls.claimWon += 1;
      job.status = 'running';
      return job;
    },
    markStepRunning: async (_jobId, step) => {
      actions.push(`running:${step}`);
      if (job) {
        job.status = 'running';
        job.currentStep = step;
      }
    },
    runStep: async (storedJob, step) => {
      actions.push(`run:${step}`);
      return runStep(storedJob, step);
    },
    completeStep: async (_jobId, step) => {
      actions.push(`completed:${step}`);
      if (job && !job.completedSteps.includes(step)) {
        job.completedSteps.push(step);
      }
    },
    failStep: async (_jobId, step, errorCode, retryable) => {
      actions.push(`failed:${step}`);
      failedCheckpoints.push({ step, errorCode, retryable });
      if (job) {
        job.status = 'failed';
        job.currentStep = step;
        job.errorCode = errorCode;
        job.retryable = retryable;
      }
    },
    completeJob: async () => {
      actions.push('job:completed');
      if (job) {
        job.status = 'completed';
      }
    },
  } as AdminEventDeletionServiceDependencies & {
    claim(
      pageSlug: string,
      requestedBy: string
    ): Promise<EventDeletionJob | null>;
  };

  return { actions, calls, dependencies, failedCheckpoints };
}

{
  const job = createDeletionJob();
  const { actions, calls, dependencies } = createInMemoryDeletionDependencies(job);
  const service = createAdminEventDeletionService(dependencies);

  const result = await service.requestAdminEventDeletion('event-one', 'admin-1');

  assert.deepEqual(
    actions,
    deletionSteps.flatMap((step) => [
      `running:${step}`,
      `run:${step}`,
      `completed:${step}`,
    ]).concat('job:completed'),
    'initial deletion should mark, run, and checkpoint every step in fixed order'
  );
  assert.deepEqual(calls, { begin: 1, claim: 0, claimWon: 0, find: 0 });
  assert.deepEqual(
    result,
    {
      success: true,
      deletionJobId: 'deletion-job-1',
      deletionStatus: 'completed',
    },
    'completed deletion should expose only the safe completed result'
  );
}

{
  const job = createDeletionJob({
    status: 'failed',
    currentStep: 'delete-images',
    completedSteps: ['block-access', 'delete-comments'],
    errorCode: 'event-deletion-temporary-failure',
    retryable: true,
  });
  const { actions, calls, dependencies } = createInMemoryDeletionDependencies(job);
  const service = createAdminEventDeletionService(dependencies);

  const result = await service.retryAdminEventDeletion('event-one', 'admin-1');

  assert.deepEqual(
    actions,
    deletionSteps.slice(2).flatMap((step) => [
      `running:${step}`,
      `run:${step}`,
      `completed:${step}`,
    ]).concat('job:completed'),
    'retry should skip completed checkpoints and resume at the failed step'
  );
  assert.equal(result?.deletionStatus, 'completed');
  assert.deepEqual(
    calls,
    { begin: 0, claim: 1, claimWon: 1, find: 0 },
    'retry should execute only after claiming the failed job'
  );
}

{
  const originalError = new Error('bucket name and internal token must stay private');
  const job = createDeletionJob();
  const { dependencies, failedCheckpoints } = createInMemoryDeletionDependencies(
    job,
    async (_storedJob, step) => {
      if (step === 'delete-images') {
        throw originalError;
      }
      return { deletedCount: 0 };
    }
  );
  const service = createAdminEventDeletionService(dependencies);

  const result = await service.requestAdminEventDeletion('event-one', 'admin-1');

  assert.deepEqual(failedCheckpoints, [
    {
      step: 'delete-images',
      errorCode: 'event-deletion-temporary-failure',
      retryable: true,
    },
  ]);
  assert.deepEqual(
    result,
    {
      success: false,
      deletionJobId: 'deletion-job-1',
      deletionStatus: 'failed',
      failedStep: 'delete-images',
      retryable: true,
    },
    'temporary failures should return a retryable result without the original exception'
  );
  assert.equal(
    JSON.stringify(result).includes(originalError.message),
    false,
    'safe deletion results must not expose original exception messages'
  );
}

{
  const job = createDeletionJob();
  const { dependencies, failedCheckpoints } = createInMemoryDeletionDependencies(
    job,
    async () => {
      throw new Error('Event deletion checkpoint prerequisites are incomplete.');
    }
  );
  const service = createAdminEventDeletionService(dependencies);

  const result = await service.requestAdminEventDeletion('event-one', 'admin-1');

  assert.deepEqual(failedCheckpoints, [
    {
      step: 'block-access',
      errorCode: 'event-deletion-data-inconsistency',
      retryable: false,
    },
  ]);
  assert.deepEqual(result, {
    success: false,
    deletionJobId: 'deletion-job-1',
    deletionStatus: 'failed',
    failedStep: 'block-access',
    retryable: false,
  });
}

for (const job of [
  null,
  createDeletionJob({ status: 'pending' }),
  createDeletionJob({ status: 'running' }),
  createDeletionJob({
    status: 'completed',
    completedSteps: [...deletionSteps],
  }),
]) {
  const originalJob = job ? structuredClone(job) : null;
  const { actions, calls, dependencies } = createInMemoryDeletionDependencies(job);
  const service = createAdminEventDeletionService(dependencies);

  const result = await service.retryAdminEventDeletion('event-one', 'admin-1');

  assert.equal(
    result,
    null,
    'retry should accept only a failed existing deletion job'
  );
  assert.deepEqual(actions, [], 'rejected retry should not mutate job checkpoints');
  assert.deepEqual(
    calls,
    { begin: 0, claim: 1, claimWon: 0, find: 0 },
    'rejected retry should not use job creation or an unclaimed lookup'
  );
  assert.deepEqual(job, originalJob, 'read-only retry lookup should leave job state unchanged');
}

{
  const job = createDeletionJob({
    status: 'failed',
    currentStep: 'delete-images',
    completedSteps: ['block-access', 'delete-comments'],
    errorCode: 'event-deletion-temporary-failure',
    retryable: true,
  });
  const { actions, calls, dependencies } = createInMemoryDeletionDependencies(job);
  const service = createAdminEventDeletionService(dependencies);

  const results = await Promise.all([
    service.retryAdminEventDeletion('event-one', 'admin-1'),
    service.retryAdminEventDeletion('event-one', 'admin-2'),
  ]);

  assert.equal(
    results.filter((result) => result?.deletionStatus === 'completed').length,
    1,
    'only the retry caller that claims the failed job should complete the runner'
  );
  assert.equal(
    results.filter((result) => result === null).length,
    1,
    'the losing concurrent retry should return without executing steps'
  );
  assert.deepEqual(
    actions,
    deletionSteps.slice(2).flatMap((step) => [
      `running:${step}`,
      `run:${step}`,
      `completed:${step}`,
    ]).concat('job:completed'),
    'concurrent retry should run the remaining deletion steps exactly once'
  );
  assert.deepEqual(calls, { begin: 0, claim: 2, claimWon: 1, find: 0 });
}

console.log('admin event deletion policy checks passed');
