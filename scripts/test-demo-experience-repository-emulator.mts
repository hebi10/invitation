import assert from 'node:assert/strict';

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-invitation-rules';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('FIRESTORE_EMULATOR_HOST is required. Run through firebase emulators:exec.');
}

process.env.NEXT_PUBLIC_USE_FIREBASE = 'true';
process.env.FIREBASE_PROJECT_ID = PROJECT_ID;
process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;

const app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID });
const db = getFirestore(app);

const TEST_COLLECTIONS = ['events', 'eventSlugIndex', 'demoExperiences'];

type CleanupTask = () => Promise<void>;

async function runCleanupTasks(tasks: CleanupTask[]) {
  const results = await Promise.allSettled(
    tasks.map((task) => Promise.resolve().then(task))
  );
  const failures = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason] : []
  );

  if (failures.length > 0) {
    throw new AggregateError(failures, 'Test cleanup failed.');
  }
}

async function runTestWithCleanup(testBody: CleanupTask, cleanup: CleanupTask) {
  const [bodyResult] = await Promise.allSettled([Promise.resolve().then(testBody)]);
  const [cleanupResult] = await Promise.allSettled([Promise.resolve().then(cleanup)]);

  if (bodyResult.status === 'rejected' && cleanupResult.status === 'rejected') {
    throw new AggregateError(
      [bodyResult.reason, cleanupResult.reason],
      'Test body and cleanup both failed.'
    );
  }
  if (bodyResult.status === 'rejected') {
    throw bodyResult.reason;
  }
  if (cleanupResult.status === 'rejected') {
    throw cleanupResult.reason;
  }
}

async function clearTestCollections() {
  await runCleanupTasks(
    TEST_COLLECTIONS.map(
      (collectionName) => () => db.recursiveDelete(db.collection(collectionName))
    )
  );
}

const bodyFailure = new Error('injected test body failure');
const cleanupFailure = new Error('injected final cleanup failure');
await assert.rejects(
  runTestWithCleanup(
    () => {
      throw bodyFailure;
    },
    () => {
      throw cleanupFailure;
    }
  ),
  (error: unknown) => {
    assert.ok(error instanceof AggregateError);
    assert.deepEqual(error.errors, [bodyFailure, cleanupFailure]);
    return true;
  },
  'body and cleanup failures must both be reported'
);
await assert.rejects(
  runTestWithCleanup(
    async () => undefined,
    () => {
      throw cleanupFailure;
    }
  ),
  (error: unknown) => error === cleanupFailure,
  'cleanup failure must fail a successful test body'
);

await runTestWithCleanup(async () => {
  await clearTestCollections();

const [{ createDemoExperienceSeedEvents, DEMO_EXPERIENCE_DAILY_SLUG }, repositoryModule] =
  await Promise.all([
    import('@/config/demoExperienceSeeds'),
    import('@/server/repositories/demoExperienceRepository'),
  ]);

const { DemoExperienceVersionConflictError, firestoreDemoExperienceRepository } =
  repositoryModule;
const dateKey = '2026-08-03';
const seeds = createDemoExperienceSeedEvents(dateKey);

await firestoreDemoExperienceRepository.bootstrapDate(dateKey, seeds);
await firestoreDemoExperienceRepository.bootstrapDate(dateKey, seeds);

const bootstrapped = await firestoreDemoExperienceRepository.listEvents(dateKey);
assert.equal(bootstrapped.length, 15);
assert.ok(bootstrapped.every((event) => event.kind === 'seed'));

const dailyConfig = structuredClone(seeds[0]!.config);
dailyConfig.slug = DEMO_EXPERIENCE_DAILY_SLUG;
dailyConfig.displayName = '금일 체험 청첩장';

const concurrentSaves = await Promise.allSettled(
  [0, 1].map(() =>
    firestoreDemoExperienceRepository.saveDailyWorkspace({
      dateKey,
      slug: DEMO_EXPERIENCE_DAILY_SLUG,
      config: dailyConfig,
      published: false,
      defaultTheme: seeds[0]!.defaultTheme,
      expectedVersion: 0,
    })
  )
);

assert.equal(concurrentSaves.filter((result) => result.status === 'fulfilled').length, 1);
const rejected = concurrentSaves.find((result) => result.status === 'rejected');
assert.ok(rejected && rejected.status === 'rejected');
assert.ok(rejected.reason instanceof DemoExperienceVersionConflictError);
assert.equal(rejected.reason.currentVersion, 1);

const daily = await firestoreDemoExperienceRepository.findEventBySlug(
  dateKey,
  DEMO_EXPERIENCE_DAILY_SLUG
);
assert.equal(daily?.kind, 'daily-workspace');
assert.equal(daily?.version, 1);
assert.equal(daily?.config.displayName, '금일 체험 청첩장');

const firstSeedComments = await firestoreDemoExperienceRepository.listComments(
  dateKey,
  seeds[1]!.slug
);
assert.equal(firstSeedComments.length, seeds[1]!.comments.length);

assert.equal((await db.collection('events').get()).size, 0);
assert.equal((await db.collection('eventSlugIndex').get()).size, 0);

console.log('demo experience repository emulator checks passed');
}, clearTestCollections);
