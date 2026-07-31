import assert from 'node:assert/strict';

import { deleteApp as deleteAdminApp } from 'firebase-admin/app';

const projectId = process.env.GCLOUD_PROJECT || 'demo-invitation-rules';
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
await db.recursiveDelete(db.collection('billingFulfillments'));

const purchase = {
  appUserId: 'customer-1',
  productId: 'invitation_premium',
  transactionId: 'transaction-1',
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

await db.recursiveDelete(db.collection('billingFulfillments'));
await db.terminate();
const adminApp = getServerFirebaseAdminApp();
if (adminApp) {
  await deleteAdminApp(adminApp);
}
console.log('billing fulfillment lock checks passed');
