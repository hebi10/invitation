import assert from 'node:assert/strict';

import { deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { Timestamp } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectStorageEmulator,
  deleteObject,
  getBytes,
  getStorage,
  listAll,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from 'firebase/storage';

const projectId = process.env.GCLOUD_PROJECT || 'demo-invitation-rules';
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
const bucket = `${projectId}.appspot.com`;

if (!storageHost || !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'Firestore and Storage emulator hosts are required. Run through firebase emulators:exec.'
  );
}

process.env.NEXT_PUBLIC_USE_FIREBASE = 'true';
process.env.FIREBASE_PROJECT_ID = projectId;
process.env.FIREBASE_STORAGE_BUCKET = bucket;
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId,
  storageBucket: bucket,
});

const { getServerFirebaseAdminApp, getServerFirestore } = await import(
  '@/server/firebaseAdmin'
);
const db = getServerFirestore();
assert.ok(db, 'Firestore emulator must be available.');

const storageHostParts = storageHost.split(':');
const storagePort = Number(storageHostParts.pop());
const storageHostname = storageHostParts.join(':');
assert.ok(storageHostname && Number.isInteger(storagePort));

function createStorageContext(name: string, uid?: string) {
  const app = initializeApp(
    {
      projectId,
      storageBucket: bucket,
    },
    `storage-rules-${name}`
  );
  const storage = getStorage(app);
  connectStorageEmulator(storage, storageHostname, storagePort, {
    ...(uid
      ? {
          mockUserToken: {
            sub: uid,
            iat: Math.floor(Date.now() / 1000),
          },
        }
      : {}),
  });
  return { app, storage };
}

async function upload(
  storage: FirebaseStorage,
  storagePath: string,
  body: Uint8Array,
  contentType: string
) {
  return uploadBytes(ref(storage, storagePath), body, { contentType });
}

async function download(storage: FirebaseStorage, storagePath: string) {
  return getBytes(ref(storage, storagePath));
}

async function list(storage: FirebaseStorage, prefix: string) {
  return listAll(ref(storage, prefix));
}

async function remove(storage: FirebaseStorage, storagePath: string) {
  return deleteObject(ref(storage, storagePath));
}

async function expectAllowed<T>(operation: Promise<T>, label: string) {
  try {
    await operation;
  } catch (error) {
    assert.fail(`${label} expected allow, got ${String(error)}`);
  }
}

async function expectDenied(operation: Promise<unknown>, label: string) {
  try {
    await operation;
  } catch {
    return;
  }
  assert.fail(`${label} should be denied`);
}

await db.recursiveDelete(db.collection('events'));
await db.recursiveDelete(db.collection('eventSlugIndex'));
await db.recursiveDelete(db.collection('admin-users'));
await db.recursiveDelete(db.collection('memory-pages'));

const anonymous = createStorageContext('anonymous');
const owner = createStorageContext('owner', 'owner-1');
const other = createStorageContext('other', 'other-1');
const admin = createStorageContext('admin', 'admin-1');
const disabledAdmin = createStorageContext(
  'admin-disabled',
  'admin-disabled'
);

await db.collection('admin-users').doc('admin-1').set({ enabled: true });
await db.collection('admin-users').doc('admin-disabled').set({ enabled: false });

const now = Timestamp.now();
const minute = 60_000;
const before = Timestamp.fromMillis(now.toMillis() - minute);
const after = Timestamp.fromMillis(now.toMillis() + minute);
const eventFixtures = [
  {
    id: 'event-public',
    slug: 'public-event',
    visibility: { published: true },
  },
  {
    id: 'event-private',
    slug: 'private-event',
    visibility: { published: false },
  },
  {
    id: 'event-active',
    slug: 'active-event',
    visibility: { published: true },
    displayPeriod: {
      isActive: true,
      startDate: before,
      endDate: after,
    },
  },
  {
    id: 'event-scheduled',
    slug: 'scheduled-event',
    visibility: { published: true },
    displayPeriod: {
      isActive: true,
      startDate: after,
      endDate: Timestamp.fromMillis(after.toMillis() + minute),
    },
  },
  {
    id: 'event-incomplete',
    slug: 'incomplete-event',
    visibility: { published: true },
    displayPeriod: {
      isActive: true,
      startDate: before,
    },
  },
  {
    id: 'event-expired',
    slug: 'expired-event',
    visibility: { published: true },
    displayPeriod: {
      isActive: true,
      startDate: Timestamp.fromMillis(before.toMillis() - minute),
      endDate: before,
    },
  },
  {
    id: 'event-disabled-period',
    slug: 'disabled-period-event',
    visibility: {
      published: true,
      displayStartAt: after,
      displayEndAt: Timestamp.fromMillis(after.toMillis() + minute),
    },
    displayPeriod: {
      isActive: false,
    },
  },
] as const;

for (const event of eventFixtures) {
  await db.collection('events').doc(event.id).set({
    eventId: event.id,
    slug: event.slug,
    ownerUid: 'owner-1',
    visibility: event.visibility,
    ...('displayPeriod' in event ? { displayPeriod: event.displayPeriod } : {}),
  });
  await db.collection('eventSlugIndex').doc(event.slug).set({
    eventId: event.id,
    slug: event.slug,
    status: 'active',
  });
}

await db.collection('memory-pages').doc('public-memory').set({
  enabled: true,
  visibility: 'public',
});
await db.collection('memory-pages').doc('private-memory').set({
  enabled: false,
  visibility: 'private',
});

const smallImage = new Uint8Array([1, 2, 3, 4]);
const adminApp = getServerFirebaseAdminApp();
assert.ok(adminApp, 'Firebase Admin app must be available.');
await getAdminStorage(adminApp)
  .bucket(bucket)
  .file('demo-wedding-images/sample.png')
  .save(smallImage, { contentType: 'image/png' });

for (const [context, label] of [
  [anonymous, 'anonymous visitor'],
  [owner, 'event owner'],
  [admin, 'administrator'],
] as const) {
  await expectDenied(
    download(context.storage, 'demo-wedding-images/sample.png'),
    `demo image read by ${label}`
  );
  await expectDenied(
    upload(
      context.storage,
      `demo-wedding-images/${label.replace(/\s+/g, '-')}.png`,
      smallImage,
      'image/png'
    ),
    `demo image write by ${label}`
  );
}

for (const slug of [
  'public-event',
  'private-event',
  'active-event',
  'scheduled-event',
  'incomplete-event',
  'expired-event',
  'disabled-period-event',
]) {
  await expectAllowed(
    upload(
      owner.storage,
      `wedding-images/${slug}/photo.png`,
      smallImage,
      'image/png'
    ),
    `owner image upload for ${slug}`
  );
}

await expectAllowed(
  download(anonymous.storage, 'wedding-images/public-event/photo.png'),
  'public event image download'
);
await expectAllowed(
  download(anonymous.storage, 'wedding-images/active-event/photo.png'),
  'active display period image download'
);
await expectDenied(
  download(anonymous.storage, 'wedding-images/private-event/photo.png'),
  'private event image download'
);
await expectDenied(
  download(anonymous.storage, 'wedding-images/scheduled-event/photo.png'),
  'scheduled event image download'
);
await expectDenied(
  download(anonymous.storage, 'wedding-images/incomplete-event/photo.png'),
  'incomplete event image download'
);
await expectDenied(
  download(anonymous.storage, 'wedding-images/expired-event/photo.png'),
  'expired event image download'
);
await expectAllowed(
  download(
    anonymous.storage,
    'wedding-images/disabled-period-event/photo.png'
  ),
  'disabled display period image download'
);
await expectAllowed(
  download(owner.storage, 'wedding-images/private-event/photo.png'),
  'owner private image download'
);
await expectAllowed(
  list(owner.storage, 'wedding-images/public-event/'),
  'owner image list'
);
await expectDenied(
  list(other.storage, 'wedding-images/public-event/'),
  'foreign image list'
);
await expectDenied(
  upload(
    other.storage,
    'wedding-images/public-event/foreign.png',
    smallImage,
    'image/png'
  ),
  'foreign image upload'
);
await expectDenied(
  remove(other.storage, 'wedding-images/public-event/photo.png'),
  'foreign image delete'
);
await expectDenied(
  upload(
    owner.storage,
    'wedding-images/public-event/not-image.txt',
    smallImage,
    'text/plain'
  ),
  'non-image upload'
);

const maximumImage = new Uint8Array(8 * 1024 * 1024);
await expectAllowed(
  upload(
    owner.storage,
    'wedding-images/public-event/maximum.png',
    maximumImage,
    'image/png'
  ),
  'image at application limit'
);
const oversizedImage = new Uint8Array(maximumImage.byteLength + 1);
await expectDenied(
  upload(
    owner.storage,
    'wedding-images/public-event/oversized.png',
    oversizedImage,
    'image/png'
  ),
  'image larger than application limit'
);

await expectAllowed(
  upload(
    admin.storage,
    'memory-images/public-memory/photo.png',
    smallImage,
    'image/png'
  ),
  'admin memory image upload'
);
await expectAllowed(
  upload(
    admin.storage,
    'memory-images/private-memory/photo.png',
    smallImage,
    'image/png'
  ),
  'admin private memory image upload'
);
await expectDenied(
  upload(
    disabledAdmin.storage,
    'memory-images/public-memory/disabled-admin.png',
    smallImage,
    'image/png'
  ),
  'disabled admin memory image upload'
);
await expectAllowed(
  download(anonymous.storage, 'memory-images/public-memory/photo.png'),
  'public memory image download'
);
await expectDenied(
  download(anonymous.storage, 'memory-images/private-memory/photo.png'),
  'private memory image download'
);
await expectAllowed(
  remove(owner.storage, 'wedding-images/public-event/photo.png'),
  'owner image delete'
);

await Promise.all(
  [anonymous, owner, other, admin, disabledAdmin].map(({ app }) => deleteApp(app))
);
await db.terminate();
await deleteAdminApp(adminApp);

console.log('storage rules emulator checks passed');
