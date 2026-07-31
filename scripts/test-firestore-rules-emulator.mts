import assert from 'node:assert/strict';

import { initializeApp, deleteApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

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

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      mapValue: {
        fields: toFirestoreFields(value as Record<string, unknown>),
      },
    };
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
await db.recursiveDelete(db.collection('eventSecrets'));
await db.recursiveDelete(db.collection('billingFulfillments'));
await db.recursiveDelete(db.collection('settings'));

await db.collection('admin-users').doc('admin-1').set({ enabled: true });
await db.collection('admin-users').doc('admin-disabled').set({ enabled: false });
await db.collection('events').doc('event-1').set({
  eventId: 'event-1',
  slug: 'public-event',
  ownerUid: 'owner-1',
  displayName: 'Public Event',
  productTier: 'standard',
  featureFlags: {},
  ticketBalance: 1,
  ticketCount: 1,
  stats: {
    ticketBalance: 1,
    ticketCount: 1,
  },
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
await db.collection('events').doc('event-1').collection('content').doc('current').set({
  schemaVersion: 1,
  eventType: 'wedding',
  slug: 'public-event',
  productTier: 'standard',
  featureFlags: {},
  content: {
    productTier: 'standard',
    features: {},
    displayName: 'Public Event',
  },
});

const now = Timestamp.now();
const minute = 60_000;
const before = Timestamp.fromMillis(now.toMillis() - minute);
const after = Timestamp.fromMillis(now.toMillis() + minute);

const periodEvents = [
  {
    id: 'event-active-window',
    slug: 'active-window',
    displayPeriod: {
      isActive: true,
      startDate: before,
      endDate: after,
    },
  },
  {
    id: 'event-scheduled',
    slug: 'scheduled',
    displayPeriod: {
      isActive: true,
      startDate: after,
      endDate: Timestamp.fromMillis(after.toMillis() + minute),
    },
  },
  {
    id: 'event-expired',
    slug: 'expired',
    displayPeriod: {
      isActive: true,
      startDate: Timestamp.fromMillis(before.toMillis() - minute),
      endDate: before,
    },
  },
  {
    id: 'event-incomplete',
    slug: 'incomplete',
    displayPeriod: {
      isActive: true,
      startDate: before,
    },
  },
  {
    id: 'event-disabled-period',
    slug: 'disabled-period',
    displayPeriod: {
      isActive: false,
    },
    visibilityDates: {
      displayStartAt: Timestamp.fromMillis(before.toMillis() - minute),
      displayEndAt: before,
    },
  },
] as const;

for (const event of periodEvents) {
  await db.collection('events').doc(event.id).set({
    eventId: event.id,
    slug: event.slug,
    ownerUid: 'owner-1',
    displayName: event.slug,
    visibility: {
      published: true,
      ...('visibilityDates' in event ? event.visibilityDates : {}),
    },
    displayPeriod: event.displayPeriod,
  });
}
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
await db.collection('events').doc('event-1').collection('linkTokens').doc('token-1').set({
  status: 'active',
});
await db.collection('eventSecrets').doc('event-1').set({ passwordHash: 'hash' });
await db.collection('billingFulfillments').doc('transaction-1').set({
  status: 'processing',
});
await db.collection('settings').doc('app').set({ enabled: true });

await expectAllowed(await restGet('events/event-1'), 'public event read by visitor');
await expectDenied(await restGet('events/event-2'), 'private event read by visitor');
await expectAllowed(
  await restGet('events/event-active-window'),
  'active display period'
);
await expectDenied(
  await restGet('events/event-scheduled'),
  'scheduled display period'
);
await expectDenied(
  await restGet('events/event-expired'),
  'expired display period'
);
await expectDenied(
  await restGet('events/event-incomplete'),
  'incomplete active display period'
);
await expectAllowed(
  await restGet('events/event-disabled-period'),
  'disabled period ignores stale visibility dates'
);
await expectAllowed(await restGet('events/event-1', 'owner-1'), 'owned event read by owner');
await expectAllowed(
  await restPatch('events/event-1', { displayName: 'Updated Public Event' }, 'owner-1'),
  'owned event summary update by owner'
);
for (const [field, value] of [
  ['ownerUid', 'owner-2'],
  ['productTier', 'premium'],
  ['ticketBalance', 99],
  ['slug', 'changed-slug'],
] as const) {
  await expectDenied(
    await restPatch(`events/event-1`, { [field]: value }, 'owner-1'),
    `owned event protected field ${field}`
  );
}
await expectDenied(
  await restPatch(
    'events/event-1/content/current',
    {
      content: {
        productTier: 'premium',
        features: {},
        displayName: 'Public Event',
      },
    },
    'owner-1'
  ),
  'owned event content product tier'
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
  await restPatch('events/event-1/comments/comment-1', { status: 'hidden' }, 'admin-disabled'),
  'comment update by disabled admin'
);
await expectDenied(
  await restPatch('events/event-1/comments/comment-public-create', {
    author: 'Guest',
    message: 'Hello',
    pageSlug: 'public-event',
  }),
  'public comment direct create'
);
await expectDenied(
  await restPatch('eventSlugIndex/public-event', { eventId: 'event-2' }, 'owner-1'),
  'owned slug index event id change'
);
await expectDenied(
  await restPatch('eventSlugIndex/public-event', { slug: 'changed-slug' }, 'owner-1'),
  'owned slug index slug change'
);
await expectDenied(
  await restPatch('eventSlugIndex/public-event', { status: 'redirect' }, 'other-1'),
  'foreign slug index update'
);
await expectDenied(
  await restGet('eventSecrets/event-1', 'owner-1'),
  'server-only secret read by owner'
);
await expectDenied(
  await restPatch('eventSecrets/event-1', { passwordHash: 'hash' }, 'owner-1'),
  'server-only secret write by owner'
);
await expectDenied(
  await restGet('billingFulfillments/transaction-1', 'owner-1'),
  'billing fulfillment read by owner'
);
await expectDenied(
  await restGet('settings/app', 'owner-1'),
  'settings read by owner'
);
await expectDenied(
  await restGet('events/event-1/linkTokens/token-1', 'owner-1'),
  'link token read by owner'
);
await expectDenied(
  await restPatch(
    'events/event-1/linkTokens/token-1',
    { status: 'revoked' },
    'owner-1'
  ),
  'link token write by owner'
);

await deleteApp(app);
console.log('firestore rules emulator checks passed');
