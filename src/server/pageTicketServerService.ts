import 'server-only';

import { getServerFirestore } from './firebaseAdmin';

const PAGE_TICKET_COLLECTION = 'page-ticket-balances';

function normalizePageSlug(pageSlug: string) {
  return pageSlug.trim();
}

function readTicketCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function buildTicketBalancePayload(pageSlug: string, ticketCount: number) {
  return {
    pageSlug,
    ticketCount,
    updatedAt: new Date().toISOString(),
  };
}

export async function getServerPageTicketCount(pageSlug: string) {
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  if (!normalizedPageSlug) {
    return 0;
  }

  const db = getServerFirestore();
  if (!db) {
    return 0;
  }

  const snapshot = await db
    .collection(PAGE_TICKET_COLLECTION)
    .doc(normalizedPageSlug)
    .get();

  if (!snapshot.exists) {
    return 0;
  }

  return readTicketCount(snapshot.data()?.ticketCount);
}

export async function adjustServerPageTicketCount(pageSlug: string, amount: number) {
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('Page slug is required.');
  }

  const normalizedAmount = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const docRef = db.collection(PAGE_TICKET_COLLECTION).doc(normalizedPageSlug);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    const currentCount = snapshot.exists
      ? readTicketCount(snapshot.data()?.ticketCount)
      : 0;
    const nextCount = Math.max(0, currentCount + normalizedAmount);

    transaction.set(
      docRef,
      buildTicketBalancePayload(normalizedPageSlug, nextCount),
      { merge: true }
    );

    return nextCount;
  });
}

export async function transferServerPageTicketCount(
  sourcePageSlug: string,
  targetPageSlug: string,
  amount: number
) {
  const normalizedSourcePageSlug = normalizePageSlug(sourcePageSlug);
  const normalizedTargetPageSlug = normalizePageSlug(targetPageSlug);
  const normalizedAmount = Number.isFinite(amount) ? Math.trunc(amount) : 0;

  if (!normalizedSourcePageSlug || !normalizedTargetPageSlug) {
    throw new Error('Target page slug and session are required.');
  }

  if (normalizedSourcePageSlug === normalizedTargetPageSlug) {
    throw new Error('Target page slug must be different.');
  }

  if (normalizedAmount <= 0) {
    throw new Error('Transfer ticket count amount is required.');
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const sourceRef = db.collection(PAGE_TICKET_COLLECTION).doc(normalizedSourcePageSlug);
  const targetRef = db.collection(PAGE_TICKET_COLLECTION).doc(normalizedTargetPageSlug);

  return db.runTransaction(async (transaction) => {
    const [sourceSnapshot, targetSnapshot] = await Promise.all([
      transaction.get(sourceRef),
      transaction.get(targetRef),
    ]);

    const sourceTicketCount = sourceSnapshot.exists
      ? readTicketCount(sourceSnapshot.data()?.ticketCount)
      : 0;
    const targetTicketCount = targetSnapshot.exists
      ? readTicketCount(targetSnapshot.data()?.ticketCount)
      : 0;

    if (sourceTicketCount < normalizedAmount) {
      throw new Error('Not enough tickets.');
    }

    const nextSourceTicketCount = sourceTicketCount - normalizedAmount;
    const nextTargetTicketCount = targetTicketCount + normalizedAmount;

    transaction.set(
      sourceRef,
      buildTicketBalancePayload(normalizedSourcePageSlug, nextSourceTicketCount),
      { merge: true }
    );
    transaction.set(
      targetRef,
      buildTicketBalancePayload(normalizedTargetPageSlug, nextTargetTicketCount),
      { merge: true }
    );

    return {
      sourceTicketCount: nextSourceTicketCount,
      targetTicketCount: nextTargetTicketCount,
    };
  });
}
