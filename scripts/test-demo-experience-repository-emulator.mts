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

if (getApps().length === 0) {
  initializeApp({ projectId: PROJECT_ID });
}

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

const app = getApps()[0];
assert.ok(app);
const db = getFirestore(app);
assert.equal((await db.collection('events').get()).size, 0);
assert.equal((await db.collection('eventSlugIndex').get()).size, 0);

console.log('demo experience repository emulator checks passed');
