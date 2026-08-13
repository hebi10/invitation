import 'server-only';

import type {
  EventDeletionMetadata,
  EventDeletionStep,
} from '@/types/invitationPage';

import { getServerFirestore, getServerStorageBucket } from '../firebaseAdmin';
import {
  EVENT_SLUG_INDEX_COLLECTION,
  EVENTS_COLLECTION,
  resolveStoredEventBySlug,
} from './eventRepository';

const EVENT_SECRETS_COLLECTION = 'eventSecrets';
const BILLING_FULFILLMENTS_COLLECTION = 'billingFulfillments';
const EVENT_DELETION_JOBS_COLLECTION = 'eventDeletionJobs';
const EVENT_COMMENTS_COLLECTION = 'comments';
const EVENT_CONTENT_COLLECTION = 'content';
const EVENT_OWNERSHIP_INVITES_COLLECTION = 'ownershipInvites';
const EVENT_LINK_TOKENS_COLLECTION = 'linkTokens';
const EVENT_AUDIT_LOGS_COLLECTION = 'auditLogs';
const MOBILE_CLIENT_EDITOR_SESSIONS_COLLECTION = 'mobile-client-editor-sessions';
const CUSTOMER_WALLET_LEDGER_COLLECTION = 'ledger';

const EVENT_DELETION_STEPS: EventDeletionStep[] = [
  'block-access',
  'delete-comments',
  'delete-images',
  'delete-ownership-references',
  'delete-content-and-indexes',
  'delete-event-root',
];

const EVENT_DELETION_PREREQUISITE_STEPS = EVENT_DELETION_STEPS.slice(0, -1);

export type EventDeletionJobStatus = EventDeletionMetadata['status'] | 'completed';

export interface EventDeletionJob {
  id: string;
  eventId: string;
  slug: string;
  status: EventDeletionJobStatus;
  currentStep: EventDeletionStep;
  completedSteps: EventDeletionStep[];
  requestedBy: string;
  requestedAt: string;
  updatedAt: string;
  completedAt?: string;
  errorCode?: string;
  retryable?: boolean;
}

export type DeleteStepResult = {
  deletedCount: number;
};

type DeleteCountResult = {
  deletedCount: number;
};

export type DeleteAdminEventResult = {
  eventId: string;
  slug: string;
  deleted: {
    eventDocument: boolean;
    eventSecrets: number;
    slugIndexes: number;
    billingFulfillments: number;
  };
};

async function deleteDocumentRecursively(
  docRef: FirebaseFirestore.DocumentReference
): Promise<number> {
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return 0;
  }

  let deletedCount = 0;
  const subcollections = await docRef.listCollections();

  for (const collectionRef of subcollections) {
    deletedCount += await deleteCollectionRecursively(collectionRef);
  }

  await docRef.delete();
  return deletedCount + 1;
}

async function deleteCollectionRecursively(
  collectionRef: FirebaseFirestore.CollectionReference
): Promise<number> {
  const snapshot = await collectionRef.get();
  let deletedCount = 0;

  for (const docSnapshot of snapshot.docs) {
    deletedCount += await deleteDocumentRecursively(docSnapshot.ref);
  }

  return deletedCount;
}

async function deleteDocumentIfExists(
  docRef: FirebaseFirestore.DocumentReference
): Promise<number> {
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return 0;
  }

  await docRef.delete();
  return 1;
}

async function collectQueryRefs(
  queries: FirebaseFirestore.Query[]
): Promise<FirebaseFirestore.DocumentReference[]> {
  const refs = new Map<string, FirebaseFirestore.DocumentReference>();

  for (const query of queries) {
    const snapshot = await query.get();
    snapshot.docs.forEach((docSnapshot) => {
      refs.set(docSnapshot.ref.path, docSnapshot.ref);
    });
  }

  return [...refs.values()];
}

async function deleteRefs(
  refs: FirebaseFirestore.DocumentReference[]
): Promise<DeleteCountResult> {
  if (!refs.length) {
    return { deletedCount: 0 };
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  let deletedCount = 0;

  for (let index = 0; index < refs.length; index += 400) {
    const batch = db.batch();
    const chunk = refs.slice(index, index + 400);

    chunk.forEach((ref) => {
      batch.delete(ref);
    });

    await batch.commit();
    deletedCount += chunk.length;
  }

  return { deletedCount };
}

async function anonymizeEventLedgerRefs(
  refs: FirebaseFirestore.DocumentReference[]
): Promise<number> {
  if (!refs.length) {
    return 0;
  }

  const db = requireFirestore();
  const deletedEventAt = new Date();
  let anonymizedCount = 0;

  for (let index = 0; index < refs.length; index += 400) {
    const chunk = refs.slice(index, index + 400);
    anonymizedCount += await db.runTransaction(async (transaction) => {
      const snapshots = await transaction.getAll(...chunk);
      let updatedCount = 0;

      snapshots.forEach((snapshot) => {
        if (!snapshot.exists) {
          return;
        }

        transaction.update(snapshot.ref, {
          eventId: null,
          pageSlug: null,
          deletedEventAt: snapshot.get('deletedEventAt') ?? deletedEventAt,
        });
        updatedCount += 1;
      });

      return updatedCount;
    });
  }

  return anonymizedCount;
}

function requireFirestore() {
  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  return db;
}

function readNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isEventDeletionStep(value: unknown): value is EventDeletionStep {
  return (
    typeof value === 'string' &&
    EVENT_DELETION_STEPS.includes(value as EventDeletionStep)
  );
}

function readEventDeletionJob(
  id: string,
  data: Record<string, unknown> | undefined
): EventDeletionJob | null {
  if (!data) {
    return null;
  }

  const eventId = readNonEmptyString(data.eventId);
  const slug = readNonEmptyString(data.slug);
  const requestedBy = readNonEmptyString(data.requestedBy);
  const requestedAt = readNonEmptyString(data.requestedAt);
  const updatedAt = readNonEmptyString(data.updatedAt);
  const status = data.status;
  const currentStep = data.currentStep;
  const completedSteps = Array.isArray(data.completedSteps)
    ? data.completedSteps.filter(isEventDeletionStep)
    : [];

  if (
    !eventId ||
    !slug ||
    !requestedBy ||
    !requestedAt ||
    !updatedAt ||
    (status !== 'pending' &&
      status !== 'running' &&
      status !== 'failed' &&
      status !== 'completed') ||
    !isEventDeletionStep(currentStep)
  ) {
    return null;
  }

  return {
    id,
    eventId,
    slug,
    status,
    currentStep,
    completedSteps,
    requestedBy,
    requestedAt,
    updatedAt,
    ...(readNonEmptyString(data.completedAt)
      ? { completedAt: readNonEmptyString(data.completedAt)! }
      : {}),
    ...(readNonEmptyString(data.errorCode)
      ? { errorCode: readNonEmptyString(data.errorCode)! }
      : {}),
    ...(typeof data.retryable === 'boolean' ? { retryable: data.retryable } : {}),
  };
}

function isActiveEventDeletionJob(job: EventDeletionJob | null) {
  return Boolean(job && job.status !== 'completed');
}

export async function beginEventDeletion(
  pageSlug: string,
  requestedBy: string
): Promise<EventDeletionJob | null> {
  const normalizedPageSlug = pageSlug.trim();
  const normalizedRequestedBy = requestedBy.trim();
  if (!normalizedPageSlug || !normalizedRequestedBy) {
    return null;
  }

  const resolvedEvent = await resolveStoredEventBySlug(normalizedPageSlug);
  if (!resolvedEvent) {
    return null;
  }

  const db = requireFirestore();
  const eventRef = db.collection(EVENTS_COLLECTION).doc(resolvedEvent.summary.eventId);
  const candidateJobRef = db.collection(EVENT_DELETION_JOBS_COLLECTION).doc();

  return db.runTransaction(async (transaction) => {
    const eventSnapshot = await transaction.get(eventRef);
    if (!eventSnapshot.exists) {
      return null;
    }

    const existingJobId = readNonEmptyString(eventSnapshot.get('deletion.jobId'));
    if (existingJobId) {
      const existingJobSnapshot = await transaction.get(
        db.collection(EVENT_DELETION_JOBS_COLLECTION).doc(existingJobId)
      );
      const existingJob = readEventDeletionJob(
        existingJobSnapshot.id,
        existingJobSnapshot.data()
      );
      if (isActiveEventDeletionJob(existingJob)) {
        return existingJob;
      }
    }

    const now = new Date().toISOString();
    const job: EventDeletionJob = {
      id: candidateJobRef.id,
      eventId: resolvedEvent.summary.eventId,
      slug: resolvedEvent.summary.slug,
      status: 'pending',
      currentStep: 'block-access',
      completedSteps: [],
      requestedBy: normalizedRequestedBy,
      requestedAt: now,
      updatedAt: now,
    };

    transaction.create(candidateJobRef, job);
    transaction.set(
      eventRef,
      {
        deletion: {
          jobId: job.id,
          status: job.status,
          currentStep: job.currentStep,
          requestedAt: job.requestedAt,
        },
      },
      { merge: true }
    );

    return job;
  });
}

async function updateEventDeletionCheckpoint(
  jobId: string,
  update: {
    status: 'running' | 'failed';
    currentStep: EventDeletionStep;
    errorCode?: string;
    retryable?: boolean;
    completedStep?: EventDeletionStep;
  }
) {
  const db = requireFirestore();
  const jobRef = db.collection(EVENT_DELETION_JOBS_COLLECTION).doc(jobId);

  await db.runTransaction(async (transaction) => {
    const jobSnapshot = await transaction.get(jobRef);
    const job = readEventDeletionJob(jobSnapshot.id, jobSnapshot.data());
    if (!job) {
      throw new Error('Event deletion job was not found.');
    }
    if (job.status === 'completed') {
      return;
    }

    const eventRef = db.collection(EVENTS_COLLECTION).doc(job.eventId);
    const eventSnapshot = await transaction.get(eventRef);
    const now = new Date().toISOString();
    const completedSteps = update.completedStep
      ? [...new Set([...job.completedSteps, update.completedStep])]
      : job.completedSteps;
    const jobUpdate = {
      status: update.status,
      currentStep: update.currentStep,
      completedSteps,
      updatedAt: now,
      errorCode: update.errorCode ?? null,
      retryable: update.retryable ?? null,
    };

    transaction.set(jobRef, jobUpdate, { merge: true });
    if (eventSnapshot.exists) {
      transaction.set(
        eventRef,
        {
          deletion: {
            jobId: job.id,
            status: update.status,
            currentStep: update.currentStep,
            requestedAt: job.requestedAt,
            ...(typeof update.retryable === 'boolean'
              ? { retryable: update.retryable }
              : {}),
          },
        },
        { merge: true }
      );
    }
  });
}

export async function markEventDeletionStepRunning(
  jobId: string,
  step: EventDeletionStep
): Promise<void> {
  await updateEventDeletionCheckpoint(jobId, {
    status: 'running',
    currentStep: step,
  });
}

export async function completeEventDeletionStep(
  jobId: string,
  step: EventDeletionStep
): Promise<void> {
  await updateEventDeletionCheckpoint(jobId, {
    status: 'running',
    currentStep: step,
    completedStep: step,
  });
}

export async function failEventDeletionStep(
  jobId: string,
  step: EventDeletionStep,
  errorCode: string,
  retryable: boolean
): Promise<void> {
  await updateEventDeletionCheckpoint(jobId, {
    status: 'failed',
    currentStep: step,
    errorCode: errorCode.trim() || 'unknown',
    retryable,
  });
}

export async function completeEventDeletionJob(jobId: string): Promise<void> {
  const db = requireFirestore();
  const jobRef = db.collection(EVENT_DELETION_JOBS_COLLECTION).doc(jobId);

  await db.runTransaction(async (transaction) => {
    const jobSnapshot = await transaction.get(jobRef);
    const job = readEventDeletionJob(jobSnapshot.id, jobSnapshot.data());
    if (!job) {
      throw new Error('Event deletion job was not found.');
    }
    if (job.status === 'completed') {
      return;
    }
    if (!EVENT_DELETION_STEPS.every((step) => job.completedSteps.includes(step))) {
      throw new Error('Event deletion checkpoint prerequisites are incomplete.');
    }

    const now = new Date().toISOString();
    transaction.set(
      jobRef,
      {
        status: 'completed',
        updatedAt: now,
        completedAt: now,
        errorCode: null,
        retryable: null,
      },
      { merge: true }
    );
  });
}

async function deleteEventSubcollection(
  eventId: string,
  collectionName: string
): Promise<number> {
  const db = requireFirestore();
  return deleteCollectionRecursively(
    db.collection(EVENTS_COLLECTION).doc(eventId).collection(collectionName)
  );
}

async function deleteStoragePrefix(prefix: string): Promise<number> {
  const bucket = getServerStorageBucket();
  if (!bucket) {
    throw new Error('Server Storage is not available.');
  }

  const [files] = await bucket.getFiles({ prefix });
  await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })));
  return files.length;
}

async function deleteOwnershipReferences(job: EventDeletionJob) {
  const db = requireFirestore();
  const sessionRefs = await collectQueryRefs([
    db.collection(MOBILE_CLIENT_EDITOR_SESSIONS_COLLECTION).where('eventId', '==', job.eventId),
    db.collection(MOBILE_CLIENT_EDITOR_SESSIONS_COLLECTION).where('pageSlug', '==', job.slug),
  ]);
  const ledgerRefs = await collectQueryRefs([
    db.collectionGroup(CUSTOMER_WALLET_LEDGER_COLLECTION).where('eventId', '==', job.eventId),
    db.collectionGroup(CUSTOMER_WALLET_LEDGER_COLLECTION).where('pageSlug', '==', job.slug),
  ]);
  const [inviteCount, tokenCount, sessionResult, anonymizedLedgerCount] = await Promise.all([
    deleteEventSubcollection(job.eventId, EVENT_OWNERSHIP_INVITES_COLLECTION),
    deleteEventSubcollection(job.eventId, EVENT_LINK_TOKENS_COLLECTION),
    deleteRefs(sessionRefs),
    anonymizeEventLedgerRefs(ledgerRefs),
  ]);
  return (
    inviteCount +
    tokenCount +
    sessionResult.deletedCount +
    anonymizedLedgerCount
  );
}

async function deleteContentAndIndexes(job: EventDeletionJob) {
  const db = requireFirestore();
  const slugIndexRefs = await collectQueryRefs([
    db.collection(EVENT_SLUG_INDEX_COLLECTION).where('eventId', '==', job.eventId),
  ]);
  const billingRefs = await collectQueryRefs([
    db.collection(BILLING_FULFILLMENTS_COLLECTION).where('eventId', '==', job.eventId),
    db.collection(BILLING_FULFILLMENTS_COLLECTION).where('createdPageSlug', '==', job.slug),
    db.collection(BILLING_FULFILLMENTS_COLLECTION).where('targetPageSlug', '==', job.slug),
  ]);
  const [contentCount, auditLogCount, secretCount, slugResult, billingResult] =
    await Promise.all([
      deleteEventSubcollection(job.eventId, EVENT_CONTENT_COLLECTION),
      deleteEventSubcollection(job.eventId, EVENT_AUDIT_LOGS_COLLECTION),
      deleteDocumentIfExists(db.collection(EVENT_SECRETS_COLLECTION).doc(job.eventId)),
      deleteRefs(slugIndexRefs),
      deleteRefs(billingRefs),
    ]);

  return (
    contentCount +
    auditLogCount +
    secretCount +
    slugResult.deletedCount +
    billingResult.deletedCount
  );
}

async function assertEventRootDeletionReady(jobId: string) {
  const db = requireFirestore();
  const snapshot = await db.collection(EVENT_DELETION_JOBS_COLLECTION).doc(jobId).get();
  const job = readEventDeletionJob(snapshot.id, snapshot.data());
  if (
    !job ||
    !EVENT_DELETION_PREREQUISITE_STEPS.every((step) =>
      job.completedSteps.includes(step)
    )
  ) {
    throw new Error('Event deletion checkpoint prerequisites are incomplete.');
  }

  return job;
}

export async function runEventDeletionRepositoryStep(
  job: EventDeletionJob,
  step: EventDeletionStep
): Promise<DeleteStepResult> {
  switch (step) {
    case 'block-access':
      return { deletedCount: 0 };
    case 'delete-comments':
      return {
        deletedCount: await deleteEventSubcollection(
          job.eventId,
          EVENT_COMMENTS_COLLECTION
        ),
      };
    case 'delete-images':
      return {
        deletedCount: await deleteStoragePrefix(`wedding-images/${job.slug}/`),
      };
    case 'delete-ownership-references':
      return { deletedCount: await deleteOwnershipReferences(job) };
    case 'delete-content-and-indexes':
      return { deletedCount: await deleteContentAndIndexes(job) };
    case 'delete-event-root': {
      const storedJob = await assertEventRootDeletionReady(job.id);
      const db = requireFirestore();
      return {
        deletedCount: await deleteDocumentRecursively(
          db.collection(EVENTS_COLLECTION).doc(storedJob.eventId)
        ),
      };
    }
  }
}

export async function deleteEventAndOperationalRecordsBySlug(
  pageSlug: string
): Promise<DeleteAdminEventResult | null> {
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) {
    return null;
  }

  const resolvedEvent = await resolveStoredEventBySlug(normalizedPageSlug);
  if (!resolvedEvent) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const eventId = resolvedEvent.summary.eventId;
  const canonicalSlug = resolvedEvent.summary.slug;
  const eventDocRef = db.collection(EVENTS_COLLECTION).doc(eventId);

  const slugIndexRefs = await collectQueryRefs([
    db.collection(EVENT_SLUG_INDEX_COLLECTION).where('eventId', '==', eventId),
  ]);

  const billingRefs = await collectQueryRefs([
    db.collection(BILLING_FULFILLMENTS_COLLECTION).where('eventId', '==', eventId),
    db.collection(BILLING_FULFILLMENTS_COLLECTION).where('createdPageSlug', '==', canonicalSlug),
    db.collection(BILLING_FULFILLMENTS_COLLECTION).where('targetPageSlug', '==', canonicalSlug),
  ]);

  const eventDocumentDeleteCount = await deleteDocumentRecursively(eventDocRef);
  const eventSecretsDeleteCount = await deleteDocumentIfExists(
    db.collection(EVENT_SECRETS_COLLECTION).doc(eventId)
  );
  const slugIndexesDeleteResult = await deleteRefs(slugIndexRefs);
  const billingDeleteResult = await deleteRefs(billingRefs);

  return {
    eventId,
    slug: canonicalSlug,
    deleted: {
      eventDocument: eventDocumentDeleteCount > 0,
      eventSecrets: eventSecretsDeleteCount,
      slugIndexes: slugIndexesDeleteResult.deletedCount,
      billingFulfillments: billingDeleteResult.deletedCount,
    },
  };
}
