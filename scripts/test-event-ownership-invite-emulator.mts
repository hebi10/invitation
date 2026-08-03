import assert from 'node:assert/strict';

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.GCLOUD_PROJECT || 'demo-invitation-rules';
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('FIRESTORE_EMULATOR_HOST is required.');
}

process.env.NEXT_PUBLIC_USE_FIREBASE = 'true';
process.env.GCLOUD_PROJECT = projectId;

const app = getApps()[0] ?? initializeApp({ projectId });
const db = getFirestore(app);

const {
  consumeEventOwnershipInvite,
  inspectEventOwnershipInvite,
  issueEventOwnershipInvite,
} = await import('../src/server/eventOwnershipInviteService.ts');

await db.recursiveDelete(db.collection('events'));
await db.recursiveDelete(db.collection('eventSlugIndex'));
await db.recursiveDelete(db.collection('admin-users'));

await db.collection('admin-users').doc('admin-1').set({ enabled: true });

async function seedEvent(input: {
  eventId: string;
  slug: string;
  displayName: string;
  ownerUid: string | null;
}) {
  const now = new Date('2026-08-03T00:00:00.000Z');
  await db.collection('events').doc(input.eventId).set({
    eventId: input.eventId,
    eventType: 'wedding',
    slug: input.slug,
    status: 'active',
    displayName: input.displayName,
    ownerUid: input.ownerUid,
    ownerEmail: null,
    ownerDisplayName: null,
    published: false,
    defaultTheme: 'emotional',
    supportedVariants: ['emotional'],
    featureFlags: {},
    stats: { commentCount: 0, ticketCount: 0, ticketBalance: 0 },
    visibility: { published: false, displayStartAt: null, displayEndAt: null },
    hasCustomConfig: true,
    hasCustomContent: true,
    createdAt: now,
    updatedAt: now,
    lastSavedAt: now,
    version: 1,
  });
  await db.collection('eventSlugIndex').doc(input.slug).set({
    slug: input.slug,
    eventId: input.eventId,
    eventType: 'wedding',
    status: 'active',
    targetSlug: null,
    createdAt: now,
    updatedAt: now,
  });
}

await seedEvent({
  eventId: 'event-unassigned',
  slug: 'unassigned',
  displayName: '미연결 청첩장',
  ownerUid: null,
});
await seedEvent({
  eventId: 'event-admin',
  slug: 'admin-owned',
  displayName: '관리자 소유 청첩장',
  ownerUid: 'admin-1',
});
await seedEvent({
  eventId: 'event-customer',
  slug: 'customer-owned',
  displayName: '고객 소유 청첩장',
  ownerUid: 'customer-existing',
});
await seedEvent({
  eventId: 'event-concurrent',
  slug: 'concurrent',
  displayName: '동시 연결 청첩장',
  ownerUid: null,
});

const now = new Date('2026-08-03T00:00:00.000Z');
const first = await issueEventOwnershipInvite({
  pageSlug: 'unassigned',
  createdByUid: 'admin-1',
  baseUrl: 'https://example.test',
  now,
});

assert.equal(
  first.expiresAt.getTime(),
  now.getTime() + 7 * 24 * 60 * 60 * 1000,
  'issued links should expire after exactly seven days'
);
assert.match(
  first.url,
  /^https:\/\/example\.test\/connect\/unassigned#token=/,
  'raw tokens should be placed in a URL fragment'
);

const storedFirst = await db
  .collection('events')
  .doc('event-unassigned')
  .collection('ownershipInvites')
  .doc('current')
  .get();
assert.notEqual(storedFirst.get('tokenHash'), first.token, 'Firestore should store only a hash');

const second = await issueEventOwnershipInvite({
  pageSlug: 'unassigned',
  createdByUid: 'admin-1',
  baseUrl: 'https://example.test',
  now,
});
assert.equal(
  (await inspectEventOwnershipInvite({ pageSlug: 'unassigned', token: first.token, now })).status,
  'invalid',
  'reissuing should revoke the previous token'
);
assert.equal(
  (await inspectEventOwnershipInvite({ pageSlug: 'unassigned', token: second.token, now })).status,
  'valid',
  'the latest token should remain valid'
);

const consumed = await consumeEventOwnershipInvite({
  pageSlug: 'unassigned',
  token: second.token,
  customer: {
    uid: 'customer-1',
    email: 'one@example.com',
    displayName: '첫 고객',
  },
  now,
});
assert.equal(consumed.eventId, 'event-unassigned');
assert.equal(
  (await db.collection('events').doc('event-unassigned').get()).get('ownerUid'),
  'customer-1',
  'consuming should assign the verified customer'
);
assert.equal(
  (await inspectEventOwnershipInvite({ pageSlug: 'unassigned', token: second.token, now })).status,
  'consumed',
  'used links should become consumed'
);

const adminInvite = await issueEventOwnershipInvite({
  pageSlug: 'admin-owned',
  createdByUid: 'admin-1',
  baseUrl: 'https://example.test',
  now,
});
await consumeEventOwnershipInvite({
  pageSlug: 'admin-owned',
  token: adminInvite.token,
  customer: {
    uid: 'customer-2',
    email: 'two@example.com',
    displayName: '둘째 고객',
  },
  now,
});
assert.equal(
  (await db.collection('events').doc('event-admin').get()).get('ownerUid'),
  'customer-2',
  'administrator-owned legacy events should transfer to the customer'
);

await assert.rejects(
  issueEventOwnershipInvite({
    pageSlug: 'customer-owned',
    createdByUid: 'admin-1',
    baseUrl: 'https://example.test',
    now,
  }),
  /이미 다른 고객 계정에 연결된/
);

const expiredInvite = await issueEventOwnershipInvite({
  pageSlug: 'concurrent',
  createdByUid: 'admin-1',
  baseUrl: 'https://example.test',
  now,
});
assert.equal(
  (
    await inspectEventOwnershipInvite({
      pageSlug: 'concurrent',
      token: expiredInvite.token,
      now: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    })
  ).status,
  'expired'
);

const concurrentInvite = await issueEventOwnershipInvite({
  pageSlug: 'concurrent',
  createdByUid: 'admin-1',
  baseUrl: 'https://example.test',
  now,
});
const concurrentResults = await Promise.allSettled([
  consumeEventOwnershipInvite({
    pageSlug: 'concurrent',
    token: concurrentInvite.token,
    customer: { uid: 'customer-a', email: 'a@example.com', displayName: 'A' },
    now,
  }),
  consumeEventOwnershipInvite({
    pageSlug: 'concurrent',
    token: concurrentInvite.token,
    customer: { uid: 'customer-b', email: 'b@example.com', displayName: 'B' },
    now,
  }),
]);
assert.equal(
  concurrentResults.filter((result) => result.status === 'fulfilled').length,
  1,
  'only one concurrent customer should consume the link'
);

console.log('event ownership invite emulator checks passed');
