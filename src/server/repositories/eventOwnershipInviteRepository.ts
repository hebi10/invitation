import 'server-only';

import type { DocumentSnapshot } from 'firebase-admin/firestore';

import { getServerFirestore } from '../firebaseAdmin';
import {
  getOwnershipInviteStatus,
  type EventOwnershipInviteRecord,
  type EventOwnershipInviteStatus,
} from '../eventOwnershipInvitePolicy';
import {
  EVENTS_COLLECTION,
  resolveStoredEventBySlug,
} from './eventRepository';

const OWNERSHIP_INVITES_COLLECTION = 'ownershipInvites';
const CURRENT_OWNERSHIP_INVITE_DOC = 'current';
const ADMIN_USERS_COLLECTION = 'admin-users';

export class EventOwnershipInviteError extends Error {
  status: number;
  code: EventOwnershipInviteStatus | 'missing' | 'unavailable';

  constructor(
    status: number,
    code: EventOwnershipInviteError['code'],
    message: string
  ) {
    super(message);
    this.name = 'EventOwnershipInviteError';
    this.status = status;
    this.code = code;
  }
}

export interface EventOwnershipInviteTarget {
  eventId: string;
  slug: string;
  displayName: string;
}

export interface EventOwnershipInviteInspection extends EventOwnershipInviteTarget {
  status: EventOwnershipInviteStatus;
}

function requireFirestore() {
  const db = getServerFirestore();
  if (!db) {
    throw new EventOwnershipInviteError(
      503,
      'unavailable',
      '청첩장 연결 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.'
    );
  }

  return db;
}

function toDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  return null;
}

function toOwnershipInviteRecord(
  snapshot: DocumentSnapshot
): EventOwnershipInviteRecord | null {
  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() ?? {};
  const tokenHash = typeof data.tokenHash === 'string' ? data.tokenHash.trim() : '';
  const status =
    data.status === 'active' || data.status === 'consumed' ? data.status : null;
  const expiresAt = toDate(data.expiresAt);
  const createdAt = toDate(data.createdAt);
  const createdByUid =
    typeof data.createdByUid === 'string' ? data.createdByUid.trim() : '';
  const consumedAt = toDate(data.consumedAt);
  const consumedByUid =
    typeof data.consumedByUid === 'string' && data.consumedByUid.trim()
      ? data.consumedByUid.trim()
      : null;

  if (!tokenHash || !status || !expiresAt || !createdAt || !createdByUid) {
    return null;
  }

  return {
    tokenHash,
    status,
    expiresAt,
    createdAt,
    createdByUid,
    consumedAt,
    consumedByUid,
  };
}

function getEventDisplayName(input: {
  slug: string;
  displayName?: string | null;
  title?: string | null;
}) {
  return input.displayName?.trim() || input.title?.trim() || input.slug;
}

function isEnabledAdmin(snapshot: DocumentSnapshot | null) {
  return Boolean(snapshot?.exists && snapshot.data()?.enabled !== false);
}

function getStatusError(status: Exclude<EventOwnershipInviteStatus, 'valid'>) {
  switch (status) {
    case 'expired':
      return new EventOwnershipInviteError(
        410,
        status,
        '청첩장 연결 링크의 유효기간이 만료되었습니다.'
      );
    case 'consumed':
      return new EventOwnershipInviteError(
        409,
        status,
        '이미 사용된 청첩장 연결 링크입니다.'
      );
    case 'different-owner':
      return new EventOwnershipInviteError(
        409,
        status,
        '이미 다른 고객 계정에 연결된 청첩장입니다.'
      );
    default:
      return new EventOwnershipInviteError(
        404,
        'invalid',
        '유효한 청첩장 연결 링크를 찾지 못했습니다.'
      );
  }
}

async function requireTarget(pageSlug: string) {
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) {
    throw new EventOwnershipInviteError(
      400,
      'missing',
      '연결할 청첩장 주소를 확인해 주세요.'
    );
  }

  const resolvedEvent = await resolveStoredEventBySlug(normalizedPageSlug);
  if (!resolvedEvent) {
    throw new EventOwnershipInviteError(
      404,
      'missing',
      '연결할 청첩장을 찾지 못했습니다.'
    );
  }

  return {
    eventId: resolvedEvent.summary.eventId,
    slug: resolvedEvent.summary.slug,
    displayName: getEventDisplayName(resolvedEvent.summary),
  } satisfies EventOwnershipInviteTarget;
}

export async function issueStoredEventOwnershipInvite(input: {
  pageSlug: string;
  tokenHash: string;
  createdByUid: string;
  createdAt: Date;
  expiresAt: Date;
}) {
  const target = await requireTarget(input.pageSlug);
  const db = requireFirestore();
  const eventRef = db.collection(EVENTS_COLLECTION).doc(target.eventId);
  const inviteRef = eventRef
    .collection(OWNERSHIP_INVITES_COLLECTION)
    .doc(CURRENT_OWNERSHIP_INVITE_DOC);

  await db.runTransaction(async (transaction) => {
    const eventSnapshot = await transaction.get(eventRef);
    if (!eventSnapshot.exists) {
      throw new EventOwnershipInviteError(
        404,
        'missing',
        '연결할 청첩장을 찾지 못했습니다.'
      );
    }

    const ownerUid =
      typeof eventSnapshot.data()?.ownerUid === 'string'
        ? eventSnapshot.data()!.ownerUid.trim()
        : '';
    const adminSnapshot = ownerUid
      ? await transaction.get(db.collection(ADMIN_USERS_COLLECTION).doc(ownerUid))
      : null;

    if (ownerUid && !isEnabledAdmin(adminSnapshot)) {
      throw getStatusError('different-owner');
    }

    transaction.set(inviteRef, {
      tokenHash: input.tokenHash,
      status: 'active',
      expiresAt: input.expiresAt,
      createdAt: input.createdAt,
      createdByUid: input.createdByUid,
      consumedAt: null,
      consumedByUid: null,
    });
  });

  return target;
}

export async function inspectStoredEventOwnershipInvite(input: {
  pageSlug: string;
  token: string;
  now: Date;
}): Promise<EventOwnershipInviteInspection> {
  const target = await requireTarget(input.pageSlug);
  const db = requireFirestore();
  const eventRef = db.collection(EVENTS_COLLECTION).doc(target.eventId);
  const inviteRef = eventRef
    .collection(OWNERSHIP_INVITES_COLLECTION)
    .doc(CURRENT_OWNERSHIP_INVITE_DOC);
  const [eventSnapshot, inviteSnapshot] = await db.getAll(eventRef, inviteRef);
  const record = toOwnershipInviteRecord(inviteSnapshot);
  const inviteStatus = getOwnershipInviteStatus(record, input.token, input.now);

  if (inviteStatus !== 'valid') {
    return { ...target, status: inviteStatus };
  }

  const ownerUid =
    typeof eventSnapshot.data()?.ownerUid === 'string'
      ? eventSnapshot.data()!.ownerUid.trim()
      : '';
  if (!ownerUid) {
    return { ...target, status: 'valid' };
  }

  const adminSnapshot = await db.collection(ADMIN_USERS_COLLECTION).doc(ownerUid).get();
  return {
    ...target,
    status: isEnabledAdmin(adminSnapshot) ? 'valid' : 'different-owner',
  };
}

export async function consumeStoredEventOwnershipInvite(input: {
  pageSlug: string;
  token: string;
  customer: {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
  now: Date;
}) {
  const target = await requireTarget(input.pageSlug);
  const db = requireFirestore();
  const eventRef = db.collection(EVENTS_COLLECTION).doc(target.eventId);
  const inviteRef = eventRef
    .collection(OWNERSHIP_INVITES_COLLECTION)
    .doc(CURRENT_OWNERSHIP_INVITE_DOC);

  await db.runTransaction(async (transaction) => {
    const [eventSnapshot, inviteSnapshot] = await transaction.getAll(
      eventRef,
      inviteRef
    );
    if (!eventSnapshot.exists) {
      throw new EventOwnershipInviteError(
        404,
        'missing',
        '연결할 청첩장을 찾지 못했습니다.'
      );
    }

    const ownerUid =
      typeof eventSnapshot.data()?.ownerUid === 'string'
        ? eventSnapshot.data()!.ownerUid.trim()
        : '';
    const adminSnapshot = ownerUid
      ? await transaction.get(db.collection(ADMIN_USERS_COLLECTION).doc(ownerUid))
      : null;
    const record = toOwnershipInviteRecord(inviteSnapshot);
    const status = getOwnershipInviteStatus(record, input.token, input.now);

    if (status !== 'valid') {
      throw getStatusError(status);
    }

    if (
      ownerUid &&
      ownerUid !== input.customer.uid &&
      !isEnabledAdmin(adminSnapshot)
    ) {
      throw getStatusError('different-owner');
    }

    transaction.set(
      eventRef,
      {
        ownerUid: input.customer.uid,
        ownerEmail: input.customer.email,
        ownerDisplayName: input.customer.displayName,
        updatedAt: input.now,
      },
      { merge: true }
    );
    transaction.set(
      inviteRef,
      {
        status: 'consumed',
        consumedAt: input.now,
        consumedByUid: input.customer.uid,
      },
      { merge: true }
    );
  });

  return target;
}
