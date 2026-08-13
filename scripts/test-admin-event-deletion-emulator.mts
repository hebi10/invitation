import assert from 'node:assert/strict';

import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const projectId = process.env.GCLOUD_PROJECT || 'demo-invitation-rules';
const bucketName = `${projectId}.appspot.com`;

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  throw new Error(
    'Firestore and Storage emulator hosts are required. Run through firebase emulators:exec.'
  );
}

process.env.NEXT_PUBLIC_USE_FIREBASE = 'true';
process.env.FIREBASE_PROJECT_ID = projectId;
process.env.GOOGLE_CLOUD_PROJECT = projectId;
process.env.FIREBASE_STORAGE_BUCKET = bucketName;
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId,
  storageBucket: bucketName,
});

const app = getApps()[0] ?? initializeApp({ projectId, storageBucket: bucketName });
const db = getFirestore(app);
const bucket = getStorage(app).bucket(bucketName);
const repository = await import('@/server/repositories/adminEventDeletionRepository');

const {
  beginEventDeletion,
  claimFailedEventDeletionJob,
  completeEventDeletionJob,
  completeEventDeletionStep,
  failEventDeletionStep,
  markEventDeletionStepRunning,
  runEventDeletionRepositoryStep,
} = repository;

const eventId = 'event-recoverable-delete';
const pageSlug = 'recoverable-delete';
const eventRef = db.collection('events').doc(eventId);
const jobCollection = db.collection('eventDeletionJobs');
const storagePath = `wedding-images/${pageSlug}/photo.png`;

for (const collectionName of [
  'events',
  'eventSlugIndex',
  'eventSecrets',
  'billingFulfillments',
  'eventDeletionJobs',
  'customerWallets',
]) {
  await db.recursiveDelete(db.collection(collectionName));
}
await bucket.deleteFiles({ prefix: `wedding-images/${pageSlug}/`, force: true });

const now = new Date('2026-08-13T00:00:00.000Z');
await eventRef.set({
  eventId,
  eventType: 'wedding',
  slug: pageSlug,
  status: 'active',
  displayName: '복구 가능한 삭제 테스트',
  ownerUid: 'customer-1',
  published: true,
  defaultTheme: 'emotional',
  supportedVariants: ['emotional'],
  featureFlags: {},
  stats: { commentCount: 1, ticketCount: 0, ticketBalance: 0 },
  visibility: { published: true, displayStartAt: null, displayEndAt: null },
  hasCustomConfig: true,
  hasCustomContent: true,
  createdAt: now,
  updatedAt: now,
  lastSavedAt: now,
  version: 1,
});
await db.collection('eventSlugIndex').doc(pageSlug).set({
  slug: pageSlug,
  eventId,
  eventType: 'wedding',
  status: 'active',
  targetSlug: null,
  createdAt: now,
  updatedAt: now,
});
await db.collection('eventSlugIndex').doc('recoverable-delete-alias').set({
  slug: 'recoverable-delete-alias',
  eventId,
  eventType: 'wedding',
  status: 'redirect',
  targetSlug: pageSlug,
  createdAt: now,
  updatedAt: now,
});
await eventRef.collection('content').doc('current').set({ title: '삭제할 본문' });
await eventRef.collection('comments').doc('comment-1').set({ message: '삭제할 댓글' });
await eventRef.collection('ownershipInvites').doc('current').set({ status: 'active' });
await eventRef.collection('linkTokens').doc('token-1').set({ tokenHash: 'hash' });
await eventRef.collection('auditLogs').doc('log-1').set({ action: 'created' });
await db.collection('eventSecrets').doc(eventId).set({ passwordHash: 'hash' });
await db.collection('billingFulfillments').doc('billing-by-event').set({ eventId });
await db.collection('billingFulfillments').doc('billing-by-created-slug').set({
  createdPageSlug: pageSlug,
});
await db.collection('billingFulfillments').doc('billing-by-target-slug').set({
  targetPageSlug: pageSlug,
});
const ledgerCreatedAt = new Date('2026-08-12T09:00:00.000Z');
const ledgerFixtures = [
  {
    ownerUid: 'customer-1',
    ledgerId: 'ledger-by-event-id',
    eventId,
    pageSlug: 'legacy-event-alias',
  },
  {
    ownerUid: 'customer-1',
    ledgerId: 'ledger-by-page-slug',
    eventId: 'legacy-event-id',
    pageSlug,
  },
  {
    ownerUid: 'customer-2',
    ledgerId: 'ledger-by-both',
    eventId,
    pageSlug,
  },
] as const;
for (const fixture of ledgerFixtures) {
  const walletRef = db.collection('customerWallets').doc(fixture.ownerUid);
  await walletRef.set({
    ownerUid: fixture.ownerUid,
    pageCreationCredits: { standard: 0, deluxe: 0, premium: 1 },
    operationTicketBalance: 3,
    updatedAt: ledgerCreatedAt,
  });
  await walletRef.collection('ledger').doc(fixture.ledgerId).set({
    ownerUid: fixture.ownerUid,
    kind: 'pageCreation',
    direction: 'debit',
    quantity: 1,
    tier: 'premium',
    source: 'eventAssignment',
    platform: 'admin',
    status: 'assigned',
    eventId: fixture.eventId,
    pageSlug: fixture.pageSlug,
    transactionId: 'transaction-retained',
    provider: 'web',
    note: '감사 정보 유지',
    createdByUid: 'admin-1',
    createdAt: ledgerCreatedAt,
  });
}
await db
  .collection('customerWallets')
  .doc('customer-2')
  .collection('ledger')
  .doc('ledger-unrelated')
  .set({
    ownerUid: 'customer-2',
    kind: 'operationTicket',
    direction: 'credit',
    quantity: 2,
    tier: null,
    source: 'adminGrant',
    platform: 'admin',
    status: 'active',
    eventId: 'event-unrelated',
    pageSlug: 'unrelated',
    transactionId: null,
    provider: null,
    note: null,
    createdByUid: 'admin-1',
    createdAt: ledgerCreatedAt,
  });
await bucket.file(storagePath).save(Buffer.from([1, 2, 3]), {
  resumable: false,
  contentType: 'image/png',
});

const [firstJob, secondJob] = await Promise.all([
  beginEventDeletion(pageSlug, 'admin-1'),
  beginEventDeletion(pageSlug, 'admin-1'),
]);

assert.ok(firstJob, 'the first request should create a deletion job');
assert.ok(secondJob, 'the concurrent request should reuse a deletion job');
assert.equal(firstJob.id, secondJob.id, 'same-slug concurrent requests should reuse one job');
assert.equal((await jobCollection.get()).size, 1, 'only one active job should be stored');
assert.equal(
  (await eventRef.get()).get('deletion.jobId'),
  firstJob.id,
  'event access blocking metadata should reference the active job'
);

const incompleteEventId = 'event-incomplete-deletion';
const incompleteSlug = 'incomplete-deletion';
await db.collection('events').doc(incompleteEventId).set({
  eventId: incompleteEventId,
  eventType: 'wedding',
  slug: incompleteSlug,
  status: 'active',
  displayName: '미완료 삭제 테스트',
  visibility: { published: false },
  createdAt: now,
  updatedAt: now,
});
await db.collection('eventSlugIndex').doc(incompleteSlug).set({
  slug: incompleteSlug,
  eventId: incompleteEventId,
  eventType: 'wedding',
  status: 'active',
  createdAt: now,
  updatedAt: now,
});
const incompleteJob = await beginEventDeletion(incompleteSlug, 'admin-1');
assert.ok(incompleteJob);
const incompleteJobBeforeClaim = (
  await jobCollection.doc(incompleteJob.id).get()
).data();
const incompleteEventBeforeClaim = (
  await db.collection('events').doc(incompleteEventId).get()
).data();
assert.equal(
  await claimFailedEventDeletionJob(incompleteSlug, 'admin-retry'),
  null,
  'a pending job must not be claimed for retry'
);
assert.deepEqual(
  (await jobCollection.doc(incompleteJob.id).get()).data(),
  incompleteJobBeforeClaim,
  'a rejected retry claim must not mutate the pending job'
);
assert.deepEqual(
  (await db.collection('events').doc(incompleteEventId).get()).data(),
  incompleteEventBeforeClaim,
  'a rejected retry claim must not mutate event deletion metadata'
);
await assert.rejects(
  completeEventDeletionJob(incompleteJob.id),
  /checkpoint/i,
  'a job must not complete before every deletion step is checkpointed'
);
assert.equal(
  (await jobCollection.doc(incompleteJob.id).get()).get('status'),
  'pending',
  'a rejected completion must preserve the active status'
);

const missingMetadataEventId = 'event-missing-deletion-metadata';
const missingMetadataSlug = 'missing-deletion-metadata';
const missingMetadataEventRef = db.collection('events').doc(missingMetadataEventId);
await missingMetadataEventRef.set({
  eventId: missingMetadataEventId,
  eventType: 'wedding',
  slug: missingMetadataSlug,
  status: 'active',
  displayName: '삭제 메타데이터 복원 테스트',
  visibility: { published: false },
  createdAt: now,
  updatedAt: now,
});
await db.collection('eventSlugIndex').doc(missingMetadataSlug).set({
  slug: missingMetadataSlug,
  eventId: missingMetadataEventId,
  eventType: 'wedding',
  status: 'active',
  createdAt: now,
  updatedAt: now,
});
const missingMetadataJob = await beginEventDeletion(
  missingMetadataSlug,
  'admin-1'
);
assert.ok(missingMetadataJob);
await completeEventDeletionStep(missingMetadataJob.id, 'block-access');
await failEventDeletionStep(
  missingMetadataJob.id,
  'delete-comments',
  'firestore-unavailable',
  true
);
await missingMetadataEventRef.update({ deletion: FieldValue.delete() });

const missingMetadataClaims = await Promise.all([
  claimFailedEventDeletionJob(missingMetadataSlug, 'admin-retry-1'),
  claimFailedEventDeletionJob(missingMetadataSlug, 'admin-retry-2'),
]);
const claimedMissingMetadataJobs = missingMetadataClaims.filter(
  (job) => job !== null
);
assert.equal(
  claimedMissingMetadataJobs.length,
  1,
  'a durable failed job should restore missing event metadata for one retry claimant'
);
const claimedMissingMetadataJob = claimedMissingMetadataJobs[0];
assert.ok(claimedMissingMetadataJob);
assert.deepEqual(claimedMissingMetadataJob.completedSteps, ['block-access']);
assert.equal(
  (await missingMetadataEventRef.get()).get('deletion.jobId'),
  missingMetadataJob.id
);
assert.equal(
  (await missingMetadataEventRef.get()).get('deletion.status'),
  'running'
);
await markEventDeletionStepRunning(
  claimedMissingMetadataJob.id,
  'delete-comments'
);
await runEventDeletionRepositoryStep(
  claimedMissingMetadataJob,
  'delete-comments'
);
await completeEventDeletionStep(
  claimedMissingMetadataJob.id,
  'delete-comments'
);
assert.deepEqual(
  (await jobCollection.doc(missingMetadataJob.id).get()).get('completedSteps'),
  ['block-access', 'delete-comments'],
  'the winning retry should resume and checkpoint the failed step'
);
await failEventDeletionStep(
  missingMetadataJob.id,
  'delete-images',
  'storage-unavailable',
  true
);
await missingMetadataEventRef.set(
  {
    deletion: {
      jobId: incompleteJob.id,
      status: 'pending',
      currentStep: incompleteJob.currentStep,
      requestedAt: incompleteJob.requestedAt,
    },
  },
  { merge: true }
);
const activeMismatchJobBeforeClaim = (
  await jobCollection.doc(missingMetadataJob.id).get()
).data();
const activeMismatchEventBeforeClaim = (
  await missingMetadataEventRef.get()
).data();
assert.equal(
  await claimFailedEventDeletionJob(
    missingMetadataSlug,
    'admin-conflicting-retry'
  ),
  null,
  'event metadata pointing to another active job must reject the durable claim'
);
assert.deepEqual(
  (await jobCollection.doc(missingMetadataJob.id).get()).data(),
  activeMismatchJobBeforeClaim
);
assert.deepEqual(
  (await missingMetadataEventRef.get()).data(),
  activeMismatchEventBeforeClaim,
  'an active-job mismatch must be rejected without writes'
);

await assert.rejects(
  runEventDeletionRepositoryStep(firstJob, 'delete-event-root'),
  /checkpoint/i,
  'the event root must not be deleted before all earlier checkpoints'
);
assert.equal((await eventRef.get()).exists, true);

await markEventDeletionStepRunning(firstJob.id, 'block-access');
await runEventDeletionRepositoryStep(firstJob, 'block-access');
await completeEventDeletionStep(firstJob.id, 'block-access');
await markEventDeletionStepRunning(firstJob.id, 'delete-comments');
await failEventDeletionStep(
  firstJob.id,
  'delete-comments',
  'firestore-unavailable',
  true
);

const failedJobSnapshot = await jobCollection.doc(firstJob.id).get();
assert.equal(failedJobSnapshot.get('status'), 'failed');
assert.deepEqual(
  failedJobSnapshot.get('completedSteps'),
  ['block-access'],
  'a failed checkpoint should preserve steps that already completed'
);
assert.equal((await eventRef.get()).get('deletion.status'), 'failed');
assert.equal((await eventRef.get()).get('deletion.retryable'), true);

const concurrentClaims = await Promise.all([
  claimFailedEventDeletionJob(pageSlug, 'admin-retry-1'),
  claimFailedEventDeletionJob('recoverable-delete-alias', 'admin-retry-2'),
]);
const claimedJobs = concurrentClaims.filter((job) => job !== null);
assert.equal(
  claimedJobs.length,
  1,
  'concurrent retries should allow only one failed-job execution claim'
);
assert.equal(claimedJobs[0]?.status, 'running');
assert.deepEqual(claimedJobs[0]?.completedSteps, ['block-access']);
assert.equal(
  (await jobCollection.doc(firstJob.id).get()).get('status'),
  'running',
  'the winning claim should transition the job to running once'
);
assert.equal((await eventRef.get()).get('deletion.status'), 'running');
assert.ok(
  ['admin-retry-1', 'admin-retry-2'].includes(
    (await jobCollection.doc(firstJob.id).get()).get('requestedBy')
  ),
  'the claimed job should record the winning retry administrator'
);

await markEventDeletionStepRunning(firstJob.id, 'delete-comments');
await runEventDeletionRepositoryStep(firstJob, 'delete-comments');
await runEventDeletionRepositoryStep(firstJob, 'delete-comments');
assert.equal(
  (await eventRef.collection('comments').get()).empty,
  true,
  'deleting already-missing comments should succeed'
);
await completeEventDeletionStep(firstJob.id, 'delete-comments');

await markEventDeletionStepRunning(firstJob.id, 'delete-images');
await runEventDeletionRepositoryStep(firstJob, 'delete-images');
await runEventDeletionRepositoryStep(firstJob, 'delete-images');
assert.equal(
  (await bucket.file(storagePath).exists())[0],
  false,
  'deleting an already-missing storage object should succeed'
);
await completeEventDeletionStep(firstJob.id, 'delete-images');

await markEventDeletionStepRunning(firstJob.id, 'delete-ownership-references');
await runEventDeletionRepositoryStep(firstJob, 'delete-ownership-references');

const firstAnonymizedAt = new Map<string, number>();
for (const fixture of ledgerFixtures) {
  const ledgerSnapshot = await db
    .collection('customerWallets')
    .doc(fixture.ownerUid)
    .collection('ledger')
    .doc(fixture.ledgerId)
    .get();
  assert.equal(ledgerSnapshot.exists, true, 'accounting ledger documents must be retained');
  assert.equal(ledgerSnapshot.get('eventId'), null);
  assert.equal(ledgerSnapshot.get('pageSlug'), null);
  assert.equal(ledgerSnapshot.get('kind'), 'pageCreation');
  assert.equal(ledgerSnapshot.get('direction'), 'debit');
  assert.equal(ledgerSnapshot.get('quantity'), 1);
  assert.equal(ledgerSnapshot.get('tier'), 'premium');
  assert.equal(ledgerSnapshot.get('source'), 'eventAssignment');
  assert.equal(ledgerSnapshot.get('platform'), 'admin');
  assert.equal(ledgerSnapshot.get('status'), 'assigned');
  assert.equal(ledgerSnapshot.get('transactionId'), 'transaction-retained');
  assert.equal(ledgerSnapshot.get('provider'), 'web');
  assert.equal(ledgerSnapshot.get('note'), '감사 정보 유지');
  assert.equal(ledgerSnapshot.get('createdByUid'), 'admin-1');
  assert.equal(ledgerSnapshot.get('createdAt').toDate().getTime(), ledgerCreatedAt.getTime());
  const deletedEventAt = ledgerSnapshot.get('deletedEventAt');
  assert.equal(typeof deletedEventAt?.toDate, 'function');
  firstAnonymizedAt.set(
    `${fixture.ownerUid}/${fixture.ledgerId}`,
    deletedEventAt.toDate().getTime()
  );
}

await runEventDeletionRepositoryStep(firstJob, 'delete-ownership-references');
for (const fixture of ledgerFixtures) {
  const ledgerSnapshot = await db
    .collection('customerWallets')
    .doc(fixture.ownerUid)
    .collection('ledger')
    .doc(fixture.ledgerId)
    .get();
  assert.equal(
    ledgerSnapshot.get('deletedEventAt').toDate().getTime(),
    firstAnonymizedAt.get(`${fixture.ownerUid}/${fixture.ledgerId}`),
    'idempotent reruns must preserve the original anonymization timestamp'
  );
}
const unrelatedLedger = await db
  .collection('customerWallets')
  .doc('customer-2')
  .collection('ledger')
  .doc('ledger-unrelated')
  .get();
assert.equal(unrelatedLedger.get('eventId'), 'event-unrelated');
assert.equal(unrelatedLedger.get('pageSlug'), 'unrelated');
assert.equal(unrelatedLedger.get('deletedEventAt'), undefined);
assert.equal(
  (await db.collectionGroup('ledger').where('eventId', '==', eventId).get()).empty,
  true,
  'no wallet ledger should retain the deleted event ID'
);
assert.equal(
  (await db.collectionGroup('ledger').where('pageSlug', '==', pageSlug).get()).empty,
  true,
  'no wallet ledger should retain the deleted page slug'
);
await completeEventDeletionStep(firstJob.id, 'delete-ownership-references');

await markEventDeletionStepRunning(firstJob.id, 'delete-content-and-indexes');
await runEventDeletionRepositoryStep(firstJob, 'delete-content-and-indexes');
await runEventDeletionRepositoryStep(firstJob, 'delete-content-and-indexes');
await completeEventDeletionStep(firstJob.id, 'delete-content-and-indexes');

await markEventDeletionStepRunning(firstJob.id, 'delete-event-root');
await runEventDeletionRepositoryStep(firstJob, 'delete-event-root');
await failEventDeletionStep(
  firstJob.id,
  'delete-event-root',
  'checkpoint-write-unavailable',
  true
);
assert.equal(
  (await eventRef.get()).exists,
  false,
  'the event root may already be gone when its checkpoint fails'
);
assert.equal(
  (await db.collection('eventSlugIndex').where('eventId', '==', eventId).get()).empty,
  true,
  'post-index retry must not depend on deleted slug indexes'
);

const postRootClaims = await Promise.all([
  claimFailedEventDeletionJob(pageSlug, 'admin-post-root-1'),
  claimFailedEventDeletionJob(pageSlug, 'admin-post-root-2'),
]);
const claimedPostRootJobs = postRootClaims.filter((job) => job !== null);
assert.equal(
  claimedPostRootJobs.length,
  1,
  'a durable failed job should allow only one retry claim after event and indexes are gone'
);
const claimedPostRootJob = claimedPostRootJobs[0];
assert.ok(claimedPostRootJob);
assert.equal(claimedPostRootJob.status, 'running');
assert.deepEqual(claimedPostRootJob.completedSteps, [
  'block-access',
  'delete-comments',
  'delete-images',
  'delete-ownership-references',
  'delete-content-and-indexes',
]);

await markEventDeletionStepRunning(claimedPostRootJob.id, 'delete-event-root');
await runEventDeletionRepositoryStep(claimedPostRootJob, 'delete-event-root');
await completeEventDeletionStep(firstJob.id, 'delete-event-root');
await Promise.all([
  completeEventDeletionJob(firstJob.id),
  markEventDeletionStepRunning(firstJob.id, 'delete-event-root'),
  failEventDeletionStep(
    firstJob.id,
    'delete-event-root',
    'late-firestore-unavailable',
    true
  ),
  completeEventDeletionStep(firstJob.id, 'delete-event-root'),
]);
await failEventDeletionStep(
  firstJob.id,
  'delete-event-root',
  'late-after-completion',
  true
);

const completedJobSnapshot = await jobCollection.doc(firstJob.id).get();
assert.equal(completedJobSnapshot.get('status'), 'completed');
assert.equal(
  completedJobSnapshot.get('errorCode'),
  null,
  'late checkpoints must not attach a failure to a completed job'
);
assert.deepEqual(completedJobSnapshot.get('completedSteps'), [
  'block-access',
  'delete-comments',
  'delete-images',
  'delete-ownership-references',
  'delete-content-and-indexes',
  'delete-event-root',
]);
assert.equal((await eventRef.get()).exists, false);
assert.equal((await eventRef.collection('content').doc('current').get()).exists, false);
assert.equal((await eventRef.collection('comments').doc('comment-1').get()).exists, false);
assert.equal((await eventRef.collection('ownershipInvites').doc('current').get()).exists, false);
assert.equal((await eventRef.collection('linkTokens').doc('token-1').get()).exists, false);
assert.equal((await eventRef.collection('auditLogs').doc('log-1').get()).exists, false);
assert.equal((await db.collection('eventSecrets').doc(eventId).get()).exists, false);
assert.equal(
  (await db.collection('eventSlugIndex').where('eventId', '==', eventId).get()).empty,
  true
);
assert.equal(
  (await db.collection('billingFulfillments').where('eventId', '==', eventId).get()).empty,
  true
);
assert.equal(
  (
    await db
      .collection('billingFulfillments')
      .where('createdPageSlug', '==', pageSlug)
      .get()
  ).empty,
  true
);
assert.equal(
  (
    await db
      .collection('billingFulfillments')
      .where('targetPageSlug', '==', pageSlug)
      .get()
  ).empty,
  true
);

console.log('admin event deletion emulator checks passed');
