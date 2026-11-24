import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { initializeApp, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import type { InvitationPageSeed } from '../src/types/invitationPage';

const projectId = process.env.GCLOUD_PROJECT;
assert.equal(projectId, 'demo-invitation-rules', 'Only the isolated rules emulator project is allowed.');
for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
  const host = process.env[key] ?? '';
  assert.match(host, /^(?:127\.0\.0\.1|localhost):\d+$/, 'Local emulator required.');
  const port = Number(host.split(':')[1]);
  assert.ok(Number.isInteger(port) && port > 0 && port <= 65535);
}
assert.equal(getApps().length, 0, 'Do not reuse any Admin app.');
const bucketName = projectId + '.appspot.com';
const slug = 'media-pilot-' + randomUUID();
const eventId = 'evt_' + slug;
const ownerUid = 'owner-' + slug;
process.env.NEXT_PUBLIC_USE_FIREBASE = 'true';
process.env.FIREBASE_PROJECT_ID = projectId;
process.env.FIREBASE_STORAGE_BUCKET = bucketName;
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId, storageBucket: bucketName });
process.env.INVITATION_MEDIA_GATEWAY_PILOT_SLUG = slug;
process.env.INVITATION_STABLE_MOBILE_UPLOAD_PILOT = 'true';

const app = initializeApp({ projectId, storageBucket: bucketName }, slug);
const db = getFirestore(app);
const bucket = getStorage(app).bucket(bucketName);
const event = db.collection('events').doc(eventId);
const content = event.collection('content').doc('current');
const index = db.collection('eventSlugIndex').doc(slug);
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

try {
  const { getAllWeddingPageSeeds } = await import('../src/config/weddingPages');
  const { saveServerOptimizedEditableImage } = await import('../src/server/editableImageUploadService');
  const { firestoreEventRepository } = await import('../src/server/repositories/eventRepository');
  const { getServerMediaMigrationPreflight } = await import('../src/server/mediaMigrationPreflightService');
  const { getAdminMediaLibrary } = await import('../src/server/adminMediaLibraryService');
  const { getInvitationMediaGatewayImage, invitationMediaGatewayResponse } = await import('../src/server/invitationMediaGatewayService');
  const { projectMobileUploadReference } = await import('../src/server/mobileUploadReferencePolicy');
  const { readInvitationMediaRecord } = await import('../src/server/repositories/invitationMediaRepository');
  const { projectPilotPublicInvitationMedia, projectPilotPrivateInvitationMedia, collectPublicInvitationImageReferences,
    mapStoredInvitationImageReferences, getInvitationMediaFileName, buildInvitationMediaGatewayUrl } = await import('../src/server/invitationMediaProjection');
  const { getServerInvitationPageBySlug } = await import('../src/server/invitationPageServerService');
  const { buildMobileInvitationShareModel } = await import('../src/app/mobile-share/shareModel');

  const now = new Date();
  const seed = JSON.parse(JSON.stringify(getAllWeddingPageSeeds()[0])) as InvitationPageSeed;
  const config: InvitationPageSeed = {
    ...seed, slug, eventType: 'wedding', displayName: 'Isolated media fixture',
    metadata: { ...seed.metadata, images: { wedding: '', favicon: '/favicon.ico', social: '', kakaoCard: '' } },
    pageData: { ...seed.pageData, galleryImages: [], galleryImageThumbnailUrls: [], coverImageThumbnailUrl: '', themeOverrides: {} },
  };
  // UUID-scoped fixtures only; never clear or modify any pre-existing data.
  await event.create({
    eventId, slug, eventType: 'wedding', status: 'active', ownerUid, published: true, defaultTheme: 'simple',
    title: config.displayName, displayName: config.displayName, summary: config.description,
    supportedVariants: Object.keys(config.variants ?? {}), featureFlags: config.features ?? {},
    visibility: { published: true }, stats: { ticketBalance: 5, ticketCount: 5, commentCount: 3 },
    hasCustomContent: true, hasCustomConfig: true, createdAt: now, updatedAt: now, version: 10,
  });
  await content.create({
    schemaVersion: 1, eventType: 'wedding', slug, content: config, version: 1,
    themeState: { defaultTheme: 'simple', variants: config.variants ?? {} },
    productTier: config.productTier ?? null, featureFlags: config.features ?? {}, createdAt: now, updatedAt: now,
  });
  await index.create({ slug, eventId, eventType: 'wedding', status: 'active', createdAt: now, updatedAt: now });

  const png = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#dddddd' } }).png().toBuffer();
  const uploaded = await saveServerOptimizedEditableImage({
    pageSlug: slug, file: new File([Uint8Array.from(png)], 'fixture.png', { type: 'image/png' }),
    assetKind: 'gallery', uploadSessionId: 'fixture-upload', mobileEditorSessionId: 'fixture-editor-session',
  });
  const paths = [uploaded.path, uploaded.originalPath, uploaded.thumbnailPath];
  async function readStorageState() {
    return Promise.all(paths.map(async path => {
      const [meta] = await bucket.file(path).getMetadata();
      const [bytes] = await bucket.file(path).download();
      return { generation: String(meta.generation), checksum: hash(bytes),
        tokenPresent: Boolean(meta.metadata?.firebaseStorageDownloadTokens), type: meta.contentType };
    }));
  }
  const initialStorage = await readStorageState();
  assert.ok(initialStorage.every(item => item.tokenPresent && item.type === 'image/webp'));
  const stable = projectMobileUploadReference(uploaded, { slug, requestedVersion: 'stable-v1', ownerBound: true });
  assert.equal(stable.path, uploaded.path);
  assert.equal(stable.url, buildInvitationMediaGatewayUrl(slug, uploaded.name));
  assert.equal(projectMobileUploadReference(uploaded, { slug, requestedVersion: null, ownerBound: true }), uploaded);
  const file = uploaded.name;
  const ownerReader = { kind: 'editor-owner' as const, uid: ownerUid, eventId };
  const publicReader = { kind: 'public' as const };
  const deny = (error: unknown) => typeof error === 'object' && error !== null && 'status' in error && error.status === 404;

  // Staged media is available to the correct editor, but not the public or a different event.
  await assert.rejects(getInvitationMediaGatewayImage(slug, file, publicReader), deny);
  await assert.rejects(getInvitationMediaGatewayImage(slug, file, { ...ownerReader, eventId: 'other' }), deny);
  await assert.rejects(getInvitationMediaGatewayImage(slug, file, { ...ownerReader, uid: 'other' }), deny);
  assert.equal(hash((await getInvitationMediaGatewayImage(slug, file, ownerReader)).bytes), initialStorage[0].checksum);
  const inventory = await getAdminMediaLibrary(slug);
  assert.equal(inventory.mode, 'protected');
  if (inventory.mode !== 'protected') throw new Error('Expected protected pilot inventory.');
  assert.equal(inventory.images.length, 1);
  assert.equal(inventory.images[0].url, stable.url);
  assert.equal(inventory.images[0].originalUrl, stable.originalUrl);
  assert.equal(inventory.images[0].thumbnailUrl, stable.thumbnailUrl);
  assert.ok(!JSON.stringify(inventory).includes('token='));

  const legacyConfig: InvitationPageSeed = {
    ...config, metadata: { ...config.metadata, images: { ...config.metadata.images, wedding: uploaded.url, social: uploaded.url, kakaoCard: uploaded.url } },
    pageData: { ...config.pageData, galleryImages: [uploaded.url, uploaded.originalUrl, uploaded.url],
      coverImageThumbnailUrl: uploaded.thumbnailUrl, galleryImageThumbnailUrls: [uploaded.thumbnailUrl, uploaded.originalUrl, uploaded.thumbnailUrl] },
  };
  assert.equal(await firestoreEventRepository.saveContentBySlug({ slug, expectedVersion: 1, config: legacyConfig }), 2);
  const savedLegacy = (await content.get()).data()!;
  const preflight = await getServerMediaMigrationPreflight(slug);
  assert.equal(preflight.revocationAllowed, false);
  assert.equal(preflight.referenceRehearsal.status, 'reversible');
  assert.equal(preflight.referenceRehearsal.sourceVersion, 2);
  assert.ok(preflight.referenceRehearsal.eventVersion !== 2, 'Event metadata uses an independent version.');
  assert.equal(preflight.referenceRehearsal.distinctChangedFiles, 3);
  assert.ok(preflight.referenceRehearsal.rollbackMatches);
  assert.ok(!JSON.stringify(preflight).includes('token='));
  const projectedLegacyPage = projectPilotPublicInvitationMedia(await getServerInvitationPageBySlug(slug, { sampleFallbackMode: 'never' }), slug);
  assert.equal(projectedLegacyPage?.metadata.images.wedding, stable.url);
  assert.equal(hash((await getInvitationMediaGatewayImage(slug, file, publicReader)).bytes), initialStorage[0].checksum);

  const converted = mapStoredInvitationImageReferences(savedLegacy, value => {
    const name = getInvitationMediaFileName(value, bucketName, slug);
    return name ? buildInvitationMediaGatewayUrl(slug, name) : value;
  }) as typeof savedLegacy;
  assert.ok(collectPublicInvitationImageReferences(converted).every(value => !value.includes('token=')));
  assert.equal(await firestoreEventRepository.saveContentBySlug({ slug, expectedVersion: 2, config: converted.content }), 3);
  const savedStable = (await content.get()).data()!;
  assert.deepEqual(savedStable.content, converted.content);
  assert.equal((await getServerMediaMigrationPreflight(slug)).referenceRehearsal.status, 'no-change');

  const page = projectPilotPublicInvitationMedia(await getServerInvitationPageBySlug(slug, { sampleFallbackMode: 'never' }), slug);
  assert.ok(page);
  assert.equal(page.metadata.images.wedding, stable.url);
  assert.equal(buildMobileInvitationShareModel(page, 'simple')?.imageUrl, stable.url);
  const response = invitationMediaGatewayResponse(await getInvitationMediaGatewayImage(slug, file, publicReader));
  assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
  assert.equal(hash(new Uint8Array(await response.arrayBuffer())), initialStorage[0].checksum);
  await firestoreEventRepository.setPublicationBySlug(slug, { published: false, expectedVersion: 3 });
  await assert.rejects(getInvitationMediaGatewayImage(slug, file, publicReader), deny);
  assert.equal(await getServerInvitationPageBySlug(slug, { sampleFallbackMode: 'never' }), null);
  const privatePage = await getServerInvitationPageBySlug(slug, { includePrivate: true, sampleFallbackMode: 'never' });
  assert.ok(privatePage);
  assert.match(projectPilotPrivateInvitationMedia(privatePage, slug, 'customer').metadata.images.wedding, /^\/api\/customer\/events\//);
  assert.match(projectPilotPrivateInvitationMedia(privatePage, slug, 'mobile').metadata.images.wedding, /^\/api\/mobile\/client-editor\//);
  assert.equal(hash((await getInvitationMediaGatewayImage(slug, file, ownerReader)).bytes), initialStorage[0].checksum);
  await firestoreEventRepository.setPublicationBySlug(slug, { published: true, expectedVersion: 3, allowFirstPublication: true });
  assert.equal(hash((await getInvitationMediaGatewayImage(slug, file, publicReader)).bytes), initialStorage[0].checksum);

  await event.update({ displayPeriod: { isActive: true, startDate: new Date('2000-01-01'), endDate: new Date('2000-01-02') } });
  await assert.rejects(getInvitationMediaGatewayImage(slug, file, publicReader), deny);
  await event.update({ displayPeriod: { isActive: false, startDate: null, endDate: null } });
  await event.update({ billingAccessHold: 'fixture-hold' });
  await assert.rejects(getInvitationMediaGatewayImage(slug, file, publicReader), deny);
  await event.update({ billingAccessHold: null });
  await event.update({ deletion: { status: 'pending' } });
  await assert.rejects(getInvitationMediaGatewayImage(slug, file, publicReader), deny);
  await assert.rejects(getInvitationMediaGatewayImage(slug, file, ownerReader), deny);
  await event.update({ deletion: null });

  // Roll back references through the same versioned save path, not direct unguarded document writes.
  await assert.rejects(firestoreEventRepository.saveContentBySlug({ slug, expectedVersion: 2, config: savedLegacy.content }), { code: 'VERSION_CONFLICT' });
  assert.equal(await firestoreEventRepository.saveContentBySlug({ slug, expectedVersion: 3, config: savedLegacy.content }), 4);
  const restored = (await content.get()).data()!;
  assert.deepEqual(restored.content, savedLegacy.content);
  assert.deepEqual(await readStorageState(), initialStorage, 'No media generation, contents, or download-token metadata changed.');
  const finalRecord = await readInvitationMediaRecord(slug);
  assert.equal(finalRecord?.summary.ownerUid, ownerUid);
  assert.equal(finalRecord?.summary.ticketBalance, 5);
  assert.equal((await getServerMediaMigrationPreflight(slug)).referenceRehearsal.status, 'reversible');
  console.log('Isolated Firestore/Storage pilot: upload, inventory, protected/public image bytes, save, share, access blocks, stale rollback and reference restore passed.');
} finally {
  await db.terminate();
  await deleteApp(app);
}
