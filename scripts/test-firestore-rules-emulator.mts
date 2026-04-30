import assert from 'node:assert/strict';

import { initializeApp, deleteApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-invitation-rules';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;

if (!EMULATOR_HOST) {
  throw new Error('FIRESTORE_EMULATOR_HOST is required. Run through firebase emulators:exec.');
}

function base64UrlEncode(value: unknown) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function createAuthToken(uid: string) {
  const now = Math.floor(Date.now() / 1000);
  return [
    base64UrlEncode({ alg: 'none', typ: 'JWT' }),
    base64UrlEncode({
      aud: PROJECT_ID,
      auth_time: now,
      exp: now + 3600,
      firebase: {
        identities: {},
        sign_in_provider: 'password',
      },
      iat: now,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      sub: uid,
      user_id: uid,
    }),
    '',
  ].join('.');
}

function documentUrl(path: string) {
  return `http://${EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
}

function authHeaders(uid?: string) {
  return uid
    ? {
        Authorization: `Bearer ${createAuthToken(uid)}`,
        'Content-Type': 'application/json',
      }
    : {
        'Content-Type': 'application/json',
      };
}

async function restGet(path: string, uid?: string) {
  return fetch(documentUrl(path), {
    headers: authHeaders(uid),
  });
}

async function restPatch(path: string, fields: Record<string, unknown>, uid?: string) {
  const updateMask = Object.keys(fields)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join('&');

  return fetch(`${documentUrl(path)}?${updateMask}`, {
    body: JSON.stringify({ fields: toFirestoreFields(fields) }),
    headers: authHeaders(uid),
    method: 'PATCH',
  });
}

async function restDelete(path: string, uid?: string) {
  return fetch(documentUrl(path), {
    headers: authHeaders(uid),
    method: 'DELETE',
  });
}

function toFirestoreFields(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, toFirestoreValue(value)])
  );
}

function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    return { stringValue: value };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }

  if (value === null) {
    return { nullValue: null };
  }

  throw new Error(`Unsupported Firestore REST value: ${String(value)}`);
}

async function expectAllowed(response: Response, label: string) {
  if (!response.ok) {
    const body = await response.text();
    assert.fail(`${label} expected allow, got ${response.status}: ${body}`);
  }
}

async function expectDenied(response: Response, label: string) {
  assert.equal(response.ok, false, `${label} should be denied`);
  assert.equal(response.status, 403, `${label} should return 403`);
}

const app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID });
const db = getFirestore(app);

await db.recursiveDelete(db.collection('events'));
await db.recursiveDelete(db.collection('eventSlugIndex'));
await db.recursiveDelete(db.collection('admin-users'));

await db.collection('admin-users').doc('admin-1').set({ enabled: true });
await db.collection('events').doc('event-1').set({
  eventId: 'event-1',
  slug: 'public-event',
  ownerUid: 'owner-1',
  displayName: 'Public Event',
  visibility: {
    published: true,
  },
});
await db.collection('events').doc('event-2').set({
  eventId: 'event-2',
  slug: 'private-event',
  ownerUid: 'owner-1',
  displayName: 'Private Event',
  visibility: {
    published: false,
  },
});
await db.collection('eventSlugIndex').doc('public-event').set({
  eventId: 'event-1',
  slug: 'public-event',
  status: 'active',
});
await db.collection('eventSlugIndex').doc('private-event').set({
  eventId: 'event-2',
  slug: 'private-event',
  status: 'active',
});
await db.collection('events').doc('event-1').collection('comments').doc('comment-1').set({
  author: 'Guest',
  message: 'Congratulations',
  pageSlug: 'public-event',
  status: 'visible',
});

await expectAllowed(await restGet('events/event-1'), 'public event read by visitor');
await expectDenied(await restGet('events/event-2'), 'private event read by visitor');
await expectAllowed(await restGet('events/event-1', 'owner-1'), 'owned event read by owner');
await expectAllowed(
  await restPatch('events/event-1', { displayName: 'Updated Public Event' }, 'owner-1'),
  'owned event summary update by owner'
);
await expectAllowed(
  await restPatch('events/event-1/comments/comment-1', { status: 'hidden' }, 'owner-1'),
  'owned comment direct update by owner'
);
await expectAllowed(
  await restDelete('events/event-1/comments/comment-1', 'owner-1'),
  'owned comment direct delete by owner'
);
await expectDenied(
  await restPatch('events/event-1/comments/comment-1', { status: 'hidden' }, 'other-1'),
  'foreign comment direct update by another customer'
);
await db.collection('events').doc('event-1').collection('comments').doc('comment-1').set({
  author: 'Guest',
  message: 'Congratulations',
  pageSlug: 'public-event',
  status: 'visible',
});
await expectAllowed(
  await restPatch('events/event-1/comments/comment-1', { status: 'hidden' }, 'admin-1'),
  'comment update by admin'
);
await expectDenied(
  await restPatch('eventSecrets/event-1', { passwordHash: 'hash' }, 'owner-1'),
  'server-only secret write by owner'
);

await deleteApp(app);
console.log('firestore rules emulator checks passed');
