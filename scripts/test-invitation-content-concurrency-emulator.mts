import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInThisContext } from 'node:vm';
import { deleteApp as deleteAdminApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import ts from 'typescript';

const projectId = process.env.GCLOUD_PROJECT;
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
assert.equal(projectId, 'demo-invitation-rules', 'Use only the isolated demo-invitation-rules project.');
assert.match(emulatorHost, /^(?:127\.0\.0\.1|localhost):\d+$/, 'A local Firestore emulator is required.');
const [hostname, portText] = emulatorHost.split(':');
const port = Number(portText);
assert.ok(Number.isInteger(port) && port > 0 && port <= 65535, 'Use a valid local emulator port.');
assert.equal(getApps().length, 0, 'This isolated test must not reuse another Admin app.');

process.env.NEXT_PUBLIC_USE_FIREBASE = 'true';
process.env.FIREBASE_PROJECT_ID = projectId;
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId });

const runId = randomUUID();
const slug = `content-race-${runId}`;
const eventId = `evt_${slug}`;
const ownerUid = `owner-${runId}`;
const adminUid = `admin-${runId}`;
const adminApp = initializeApp({ projectId }, `content-concurrency-${runId}`);
const db = getFirestore(adminApp);
const eventRef = db.collection('events').doc(eventId);
const contentRef = eventRef.collection('content').doc('current');
const indexRef = db.collection('eventSlugIndex').doc(slug);

const nativeRequire = createRequire(import.meta.url);
const clientApps = nativeRequire('firebase/app') as typeof import('firebase/app');
const clientSdk = nativeRequire('firebase/firestore') as typeof import('firebase/firestore');
const clientApp = clientApps.initializeApp({ projectId, apiKey: 'local-emulator-only' }, `content-client-${runId}`);
const clientDb = clientSdk.getFirestore(clientApp);
clientSdk.connectFirestoreEmulator(clientDb, hostname, port, { mockUserToken: { sub: adminUid } });

// Keep production repositories, mappers and SDK transactions intact. Only the
// browser-only Firebase bootstrap is supplied with this real emulator connection.
const loadedModules = new Map<string, { exports: unknown }>();
function loadClientModule(file: string): unknown {
  let absolute = path.resolve(file);
  if (!existsSync(absolute)) absolute += '.ts';
  if (loadedModules.has(absolute)) return loadedModules.get(absolute)!.exports;
  const loadedModule = { exports: {} as unknown };
  loadedModules.set(absolute, loadedModule);
  const source = ts.transpileModule(readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const execute = runInThisContext(`(function(require, module, exports) {\n${source}\n})`, { filename: absolute }) as (
    requireModule: (id: string) => unknown, module: { exports: unknown }, exports: unknown
  ) => void;
  execute((id) => {
    if (id === '@/lib/firebase') return {
      USE_FIREBASE: true,
      ensureFirebaseInit: async () => ({ db: clientDb, auth: { currentUser: { uid: adminUid } } }),
    };
    if (id === 'firebase/firestore') return clientSdk;
    if (id.startsWith('@/')) return loadClientModule(path.resolve('src', id.slice(2)));
    if (id.startsWith('.')) return loadClientModule(path.resolve(path.dirname(absolute), id));
    return nativeRequire(id);
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

function assertConflict(error: unknown, version: number) {
  assert.ok(error && typeof error === 'object');
  assert.equal((error as { status: number }).status, 409);
  assert.equal((error as { code: string }).code, 'VERSION_CONFLICT');
  assert.equal((error as { currentVersion: number }).currentVersion, version);
  return true;
}

try {
  const [{ firestoreEventRepository }, { getAllWeddingPageSeeds }] = await Promise.all([
    import('@/server/repositories/eventRepository'),
    import('@/config/weddingPages'),
  ]);
  const config = JSON.parse(JSON.stringify({
    ...getAllWeddingPageSeeds()[0], slug, displayName: 'Initial fixture', description: 'Local test content',
  })) as import('../src/types/invitationPage').InvitationPageSeed;
  const now = new Date('2026-10-01T00:00:00Z');
  // UUID-scoped create calls only: no database reset, cleanup or existing-data overwrite.
  await db.collection('admin-users').doc(adminUid).create({ enabled: true });
  await eventRef.create({
    eventId, slug, eventType: 'wedding', ownerUid, published: false, defaultTheme: 'simple',
    title: config.displayName, displayName: config.displayName, summary: config.description,
    supportedVariants: Object.keys(config.variants ?? {}), featureFlags: config.features ?? {},
    visibility: { published: false }, stats: { ticketBalance: 5, ticketCount: 5, commentCount: 3 },
    hasCustomContent: true, hasCustomConfig: true, createdAt: now, updatedAt: now, version: 10,
  });
  await contentRef.create({
    schemaVersion: 1, eventType: 'wedding', slug, content: config,
    productTier: config.productTier ?? null, featureFlags: config.features ?? {},
    createdAt: now, updatedAt: now,
  });
  await indexRef.create({ slug, eventId, eventType: 'wedding', status: 'active', createdAt: now, updatedAt: now });

  const attempts = [
    { config: { ...config, displayName: 'Server edit A' }, published: true, defaultTheme: 'classic-r' as const },
    { config: { ...config, displayName: 'Server edit B' }, published: false, defaultTheme: 'simple' as const },
  ];
  const saves = await Promise.allSettled(attempts.map((input) =>
    firestoreEventRepository.saveContentBySlug({ slug, expectedVersion: 0, ...input })));
  assert.equal(saves.filter((result) => result.status === 'fulfilled').length, 1, 'Only one version-0 snapshot can commit.');
  const winnerIndex = saves.findIndex((result) => result.status === 'fulfilled');
  const loser = saves.find((result) => result.status === 'rejected') as PromiseRejectedResult;
  assertConflict(loser.reason, 1);

  async function assertStored(version: number, expected: typeof attempts[number]) {
    const [eventSnapshot, contentSnapshot] = await Promise.all([eventRef.get(), contentRef.get()]);
    const event = eventSnapshot.data()!;
    const content = contentSnapshot.data()!;
    assert.equal(content.version, version);
    assert.equal(content.content.displayName, expected.config.displayName);
    assert.equal(content.themeState.defaultTheme, expected.defaultTheme);
    assert.equal(event.title, expected.config.displayName);
    assert.equal(event.published, expected.published);
    assert.equal(event.visibility.published, expected.published);
    assert.equal(event.defaultTheme, expected.defaultTheme);
    assert.equal(event.ownerUid, ownerUid);
    assert.equal(event.stats.ticketBalance, 5);
    assert.equal(event.stats.ticketCount, 5);
    assert.equal(event.stats.commentCount, 3);
  }
  await assertStored(1, attempts[winnerIndex]);
  const beforeStale = await Promise.all([eventRef.get(), contentRef.get(), indexRef.get()]);
  await assert.rejects(firestoreEventRepository.saveContentBySlug({
    slug, expectedVersion: 0, ...attempts[1 - winnerIndex],
  }), (error) => assertConflict(error, 1));
  const afterStale = await Promise.all([eventRef.get(), contentRef.get(), indexRef.get()]);
  assert.deepEqual(afterStale.map((snapshot) => snapshot.data()), beforeStale.map((snapshot) => snapshot.data()),
    'Stale save must not partially write content, publication, theme or slug metadata.');

  const next = { ...attempts[0], config: { ...config, displayName: 'Server next edit' } };
  assert.equal(await firestoreEventRepository.saveContentBySlug({ slug, expectedVersion: 1, ...next }), 2);
  await assertStored(2, next);
  console.log('real Firestore server content concurrency, conflict atomicity and subsequent save passed');

  const clientRepository = loadClientModule('src/services/repositories/clientEventRepositoryCore.ts') as
    typeof import('../src/services/repositories/clientEventRepositoryCore');
  const crossAttempts = [
    { ...attempts[0], config: { ...config, displayName: 'Server cross edit' } },
    { ...attempts[1], config: { ...config, displayName: 'Client cross edit' } },
  ];
  const crossSaves = await Promise.allSettled([
    firestoreEventRepository.saveContentBySlug({ slug, expectedVersion: 2, ...crossAttempts[0] }),
    clientRepository.saveClientEventContentBySlug({ slug, expectedVersion: 2, ...crossAttempts[1] }),
  ]);
  assert.equal(crossSaves.filter((result) => result.status === 'fulfilled').length, 1,
    'Admin SDK and authenticated client SDK must share the same content version boundary.');
  const crossWinner = crossSaves.findIndex((result) => result.status === 'fulfilled');
  const crossLoser = crossSaves.find((result) => result.status === 'rejected') as PromiseRejectedResult;
  assertConflict(crossLoser.reason, 3);
  await assertStored(3, crossAttempts[crossWinner]);
  await assert.rejects(clientRepository.saveClientEventContentBySlug({
    slug, expectedVersion: 2, ...crossAttempts[1],
  }), (error) => assertConflict(error, 3));
  await assertStored(3, crossAttempts[crossWinner]);

  const clientNext = { ...attempts[1], config: { ...config, displayName: 'Client next edit' } };
  assert.equal(await clientRepository.saveClientEventContentBySlug({ slug, expectedVersion: 3, ...clientNext }), 4);
  await assert.rejects(firestoreEventRepository.saveContentBySlug({
    slug, expectedVersion: 3, ...crossAttempts[0],
  }), (error) => assertConflict(error, 4));
  await assertStored(4, clientNext);
  console.log('real Firestore Admin/client SDK conflict and authorized client follow-up save passed');
} finally {
  await clientSdk.terminate(clientDb);
  await clientApps.deleteApp(clientApp);
  await db.terminate();
  await deleteAdminApp(adminApp);
}
