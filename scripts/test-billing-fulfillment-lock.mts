import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { deleteApp as deleteAdminApp } from 'firebase-admin/app';

const projectId = process.env.GCLOUD_PROJECT || 'demo-invitation-rules';
assert.equal(projectId, 'demo-invitation-rules', 'Use the isolated demo project.');
assert.match(
  process.env.FIRESTORE_EMULATOR_HOST ?? '',
  /^(?:127\.0\.0\.1|localhost):\d+$/,
  'A local Firestore emulator is required.'
);
process.env.NEXT_PUBLIC_USE_FIREBASE = 'true';
process.env.FIREBASE_PROJECT_ID = projectId;
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId });

const [
  { getServerFirebaseAdminApp, getServerFirestore },
  { firestoreBillingFulfillmentRepository },
] = await Promise.all([
  import('@/server/firebaseAdmin'),
  import('@/server/repositories/billingFulfillmentRepository'),
]);

const db = getServerFirestore();
assert.ok(db, 'Firestore emulator must be available.');
const runId = randomUUID();

const purchase = {
  appUserId: 'customer-1',
  productId: 'invitation_premium',
  transactionId: `transaction-${runId}`,
};

const [first, second] = await Promise.all([
  firestoreBillingFulfillmentRepository.acquireLock(
    purchase,
    'pageCreation'
  ),
  firestoreBillingFulfillmentRepository.acquireLock(
    purchase,
    'pageCreation'
  ),
]);

assert.equal(
  [first, second].filter((result) => result.acquired).length,
  1,
  'Only one concurrent request may acquire a fulfillment lock.'
);
assert.equal(first.record.transactionId, purchase.transactionId);
assert.equal(second.record.transactionId, purchase.transactionId);

await assert.rejects(
  () =>
    firestoreBillingFulfillmentRepository.acquireLock(
      {
        ...purchase,
        appUserId: 'customer-2',
      },
      'pageCreation'
    ),
  /already linked to another request/
);

const eventId = `atomic-billing-${runId}`;
const targetPageSlug = `atomic-page-${runId}`;
const eventRef = db.collection('events').doc(eventId);
await eventRef.set({
  slug: targetPageSlug,
  ownerUid: 'customer-1',
  eventType: 'wedding',
  version: 4,
  stats: { ticketCount: 2, ticketBalance: 2, commentCount: 7 },
});
const ticketPurchase = {
  appUserId: 'customer-1',
  productId: 'ticket_pack_1',
  transactionId: `ticket-${runId}`,
};
const ticketInput = {
  purchase: ticketPurchase,
  eventId,
  targetPageSlug,
  ownerUid: 'customer-1',
  ticketCount: 1,
  purchaseDate: null,
};
const ticketResults = await Promise.all(
  Array.from({ length: 5 }, () =>
    firestoreBillingFulfillmentRepository.fulfillTicketPack(ticketInput)
  )
);
assert.equal(ticketResults.filter((result) => result.applied).length, 1);
assert.ok(ticketResults.every((result) => result.ticketCount === 3));
const grantedEvent = (await eventRef.get()).data();
assert.deepEqual(grantedEvent?.stats, {
  ticketCount: 3,
  ticketBalance: 3,
  commentCount: 7,
});
assert.equal(grantedEvent?.version, 5);
const fulfilledReceipt = await firestoreBillingFulfillmentRepository.findByTransactionId(
  ticketPurchase.transactionId
);
assert.equal(fulfilledReceipt?.status, 'fulfilled');
assert.equal(fulfilledReceipt?.eventId, eventId);
assert.equal(fulfilledReceipt?.grantedTicketCount, 1);

await assert.rejects(
  () => firestoreBillingFulfillmentRepository.fulfillTicketPack({
    ...ticketInput,
    purchase: { ...ticketPurchase, appUserId: 'customer-2' },
  }),
  /already linked to another request/
);
for (const status of ['processing', 'failed'] as const) {
  const legacyPurchase = { ...ticketPurchase, transactionId: `${status}-${runId}` };
  await firestoreBillingFulfillmentRepository.acquireLock(legacyPurchase, 'ticketPack');
  if (status === 'failed') {
    await firestoreBillingFulfillmentRepository.markFailed(legacyPurchase.transactionId, 'Interrupted legacy request');
  }
  await assert.rejects(
    () => firestoreBillingFulfillmentRepository.fulfillTicketPack({
      ...ticketInput,
      purchase: legacyPurchase,
    }),
    { code: 'billing-fulfillment-requires-review' }
  );
}
assert.equal((await eventRef.get()).data()?.stats.ticketBalance, 3);

await db.terminate();
const adminApp = getServerFirebaseAdminApp();
if (adminApp) {
  await deleteAdminApp(adminApp);
}
console.log('billing fulfillment lock and atomic ticket grant checks passed');
