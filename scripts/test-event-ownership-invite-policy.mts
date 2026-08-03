import assert from 'node:assert/strict';

import {
  OWNERSHIP_INVITE_TTL_MS,
  createOwnershipInviteToken,
  getOwnershipInviteStatus,
  hashOwnershipInviteToken,
} from '../src/server/eventOwnershipInvitePolicy.ts';

const token = 'known-token';
const now = new Date('2026-08-03T00:00:00.000Z');
const activeInvite = {
  tokenHash: hashOwnershipInviteToken(token),
  status: 'active' as const,
  expiresAt: new Date(now.getTime() + OWNERSHIP_INVITE_TTL_MS),
  createdAt: now,
  createdByUid: 'admin-1',
  consumedAt: null,
  consumedByUid: null,
};

assert.equal(
  getOwnershipInviteStatus(activeInvite, token, now),
  'valid',
  'matching active tokens should be valid'
);
assert.equal(
  getOwnershipInviteStatus(activeInvite, 'wrong-token', now),
  'invalid',
  'non-matching tokens should not reveal invite lifecycle'
);
assert.equal(
  getOwnershipInviteStatus(activeInvite, token, activeInvite.expiresAt),
  'expired',
  'the exact expiration instant should be expired'
);
assert.equal(
  getOwnershipInviteStatus(
    {
      ...activeInvite,
      status: 'consumed',
      consumedAt: new Date(now.getTime() + 1_000),
      consumedByUid: 'customer-1',
    },
    token,
    now
  ),
  'consumed',
  'matching consumed tokens should report consumed'
);
assert.equal(
  getOwnershipInviteStatus(null, token, now),
  'invalid',
  'missing invite records should be invalid'
);
assert.equal(
  Buffer.from(createOwnershipInviteToken(), 'base64url').byteLength,
  32,
  'generated tokens should contain 32 random bytes'
);
assert.equal(
  hashOwnershipInviteToken(token).length,
  64,
  'token hashes should be lowercase SHA-256 hex'
);

console.log('event ownership invite policy checks passed');
