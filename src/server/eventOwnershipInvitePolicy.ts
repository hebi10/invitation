import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const OWNERSHIP_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type EventOwnershipInviteLifecycleStatus = 'active' | 'consumed';
export type EventOwnershipInviteStatus =
  | 'valid'
  | 'expired'
  | 'consumed'
  | 'invalid'
  | 'different-owner';

export interface EventOwnershipInviteRecord {
  tokenHash: string;
  status: EventOwnershipInviteLifecycleStatus;
  expiresAt: Date;
  createdAt: Date;
  createdByUid: string;
  consumedAt: Date | null;
  consumedByUid: string | null;
}

export function createOwnershipInviteToken() {
  return randomBytes(32).toString('base64url');
}

export function hashOwnershipInviteToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function hasMatchingToken(record: EventOwnershipInviteRecord, token: string) {
  const normalizedToken = token.trim();
  if (!normalizedToken || !/^[A-Za-z0-9_-]{8,256}$/.test(normalizedToken)) {
    return false;
  }

  if (!/^[a-f0-9]{64}$/.test(record.tokenHash)) {
    return false;
  }

  const requestedHash = Buffer.from(hashOwnershipInviteToken(normalizedToken), 'hex');
  const storedHash = Buffer.from(record.tokenHash, 'hex');
  return requestedHash.length === storedHash.length && timingSafeEqual(requestedHash, storedHash);
}

export function getOwnershipInviteStatus(
  record: EventOwnershipInviteRecord | null,
  token: string,
  now = new Date()
): Exclude<EventOwnershipInviteStatus, 'different-owner'> {
  if (!record || !hasMatchingToken(record, token)) {
    return 'invalid';
  }

  if (record.status === 'consumed') {
    return 'consumed';
  }

  if (now.getTime() >= record.expiresAt.getTime()) {
    return 'expired';
  }

  return 'valid';
}
