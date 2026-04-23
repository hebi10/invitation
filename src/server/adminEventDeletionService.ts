import 'server-only';

import { getServerFirestore } from './firebaseAdmin';
import {
  EVENT_SLUG_INDEX_COLLECTION,
  EVENTS_COLLECTION,
  resolveStoredEventBySlug,
} from './repositories/eventRepository';

const EVENT_SECRETS_COLLECTION = 'eventSecrets';
const BILLING_FULFILLMENTS_COLLECTION = 'billingFulfillments';
const EVENT_WRITE_THROUGH_FAILURES_COLLECTION = 'event-write-through-failures';
const EVENT_READ_FALLBACK_LOGS_COLLECTION = 'event-read-fallback-logs';
const EVENT_ROLLOUT_MISMATCHES_COLLECTION = 'event-rollout-mismatches';

type DeleteCountResult = {
  deletedCount: number;
};

export type DeleteAdminEventResult = {
  eventId: string;
  slug: string;
  deleted: {
    eventDocument: boolean;
    eventSecrets: number;
    slugIndexes: number;
    billingFulfillments: number;
    writeThroughFailures: number;
    readFallbackLogs: number;
    rolloutMismatches: number;
  };
};

async function deleteDocumentRecursively(
  docRef: FirebaseFirestore.DocumentReference
): Promise<number> {
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return 0;
  }

  let deletedCount = 0;
  const subcollections = await docRef.listCollections();

  for (const collectionRef of subcollections) {
    deletedCount += await deleteCollectionRecursively(collectionRef);
  }

  await docRef.delete();
  return deletedCount + 1;
}

async function deleteCollectionRecursively(
  collectionRef: FirebaseFirestore.CollectionReference
): Promise<number> {
  const snapshot = await collectionRef.get();
  let deletedCount = 0;

  for (const docSnapshot of snapshot.docs) {
    deletedCount += await deleteDocumentRecursively(docSnapshot.ref);
  }

  return deletedCount;
}

async function deleteDocumentIfExists(
  docRef: FirebaseFirestore.DocumentReference
): Promise<number> {
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return 0;
  }

  await docRef.delete();
  return 1;
}

async function collectQueryRefs(
  queries: FirebaseFirestore.Query[]
): Promise<FirebaseFirestore.DocumentReference[]> {
  const refs = new Map<string, FirebaseFirestore.DocumentReference>();

  for (const query of queries) {
    const snapshot = await query.get();
    snapshot.docs.forEach((docSnapshot) => {
      refs.set(docSnapshot.ref.path, docSnapshot.ref);
    });
  }

  return [...refs.values()];
}

async function deleteRefs(
  refs: FirebaseFirestore.DocumentReference[]
): Promise<DeleteCountResult> {
  if (!refs.length) {
    return { deletedCount: 0 };
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  let deletedCount = 0;

  for (let index = 0; index < refs.length; index += 400) {
    const batch = db.batch();
    const chunk = refs.slice(index, index + 400);

    chunk.forEach((ref) => {
      batch.delete(ref);
    });

    await batch.commit();
    deletedCount += chunk.length;
  }

  return { deletedCount };
}

export async function deleteAdminEventBySlug(pageSlug: string): Promise<DeleteAdminEventResult | null> {
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) {
    return null;
  }

  const resolvedEvent = await resolveStoredEventBySlug(normalizedPageSlug);
  if (!resolvedEvent) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const eventId = resolvedEvent.summary.eventId;
  const canonicalSlug = resolvedEvent.summary.slug;
  const eventDocRef = db.collection(EVENTS_COLLECTION).doc(eventId);

  const slugIndexRefs = await collectQueryRefs([
    db.collection(EVENT_SLUG_INDEX_COLLECTION).where('eventId', '==', eventId),
  ]);

  const billingRefs = await collectQueryRefs([
    db.collection(BILLING_FULFILLMENTS_COLLECTION).where('eventId', '==', eventId),
    db.collection(BILLING_FULFILLMENTS_COLLECTION).where('createdPageSlug', '==', canonicalSlug),
    db.collection(BILLING_FULFILLMENTS_COLLECTION).where('targetPageSlug', '==', canonicalSlug),
  ]);

  const writeThroughFailureRefs = await collectQueryRefs([
    db
      .collection(EVENT_WRITE_THROUGH_FAILURES_COLLECTION)
      .where('pageSlug', '==', canonicalSlug),
  ]);

  const readFallbackRefs = await collectQueryRefs([
    db.collection(EVENT_READ_FALLBACK_LOGS_COLLECTION).where('lookupValue', '==', canonicalSlug),
  ]);

  const mismatchRefs = await collectQueryRefs([
    db.collection(EVENT_ROLLOUT_MISMATCHES_COLLECTION).where('lookupValue', '==', canonicalSlug),
  ]);

  const eventDocumentDeleteCount = await deleteDocumentRecursively(eventDocRef);
  const eventSecretsDeleteCount = await deleteDocumentIfExists(
    db.collection(EVENT_SECRETS_COLLECTION).doc(eventId)
  );
  const slugIndexesDeleteResult = await deleteRefs(slugIndexRefs);
  const billingDeleteResult = await deleteRefs(billingRefs);
  const writeThroughFailureDeleteResult = await deleteRefs(writeThroughFailureRefs);
  const readFallbackDeleteResult = await deleteRefs(readFallbackRefs);
  const mismatchDeleteResult = await deleteRefs(mismatchRefs);

  return {
    eventId,
    slug: canonicalSlug,
    deleted: {
      eventDocument: eventDocumentDeleteCount > 0,
      eventSecrets: eventSecretsDeleteCount,
      slugIndexes: slugIndexesDeleteResult.deletedCount,
      billingFulfillments: billingDeleteResult.deletedCount,
      writeThroughFailures: writeThroughFailureDeleteResult.deletedCount,
      readFallbackLogs: readFallbackDeleteResult.deletedCount,
      rolloutMismatches: mismatchDeleteResult.deletedCount,
    },
  };
}
