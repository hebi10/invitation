import 'server-only';

import { CustomerEventClaimError } from '../customerEventClaimPolicy';
import { getServerFirestore } from '../firebaseAdmin';
import {
  EVENTS_COLLECTION,
  resolveStoredEventBySlug,
} from './eventRepository';

const ADMIN_USERS_COLLECTION = 'admin-users';

function isEnabledAdmin(data: FirebaseFirestore.DocumentData | undefined) {
  return Boolean(data && data.enabled !== false);
}

export async function claimStoredEventOwnership(input: {
  pageSlug: string;
  customer: {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
}) {
  const pageSlug = input.pageSlug.trim();
  const customerUid = input.customer.uid.trim();
  if (!pageSlug || !customerUid) {
    throw new CustomerEventClaimError(
      400,
      'invalid',
      '연결할 청첩장 주소와 고객 계정을 확인해 주세요.'
    );
  }

  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    throw new CustomerEventClaimError(
      404,
      'missing',
      '연결할 청첩장을 찾지 못했습니다.'
    );
  }

  const db = getServerFirestore();
  if (!db) {
    throw new CustomerEventClaimError(
      503,
      'unavailable',
      '청첩장 연결 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.'
    );
  }

  const eventRef = db.collection(EVENTS_COLLECTION).doc(resolvedEvent.summary.eventId);
  await db.runTransaction(async (transaction) => {
    const eventSnapshot = await transaction.get(eventRef);
    if (!eventSnapshot.exists) {
      throw new CustomerEventClaimError(
        404,
        'missing',
        '연결할 청첩장을 찾지 못했습니다.'
      );
    }

    const ownerUid =
      typeof eventSnapshot.data()?.ownerUid === 'string'
        ? eventSnapshot.data()!.ownerUid.trim()
        : '';

    if (ownerUid === customerUid) {
      return;
    }

    const adminSnapshot = ownerUid
      ? await transaction.get(db.collection(ADMIN_USERS_COLLECTION).doc(ownerUid))
      : null;
    if (ownerUid && !isEnabledAdmin(adminSnapshot?.data())) {
      throw new CustomerEventClaimError(
        409,
        'different-owner',
        '이미 다른 고객 계정에 연결된 청첩장입니다.'
      );
    }

    transaction.set(
      eventRef,
      {
        ownerUid: customerUid,
        ownerEmail: input.customer.email?.trim() || null,
        ownerDisplayName: input.customer.displayName?.trim() || null,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  });
}
