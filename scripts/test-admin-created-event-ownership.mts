import assert from 'node:assert/strict';

import { resolveNextClientEventOwner } from '../src/services/repositories/clientEventOwnershipPolicy.ts';

const adminOwner = {
  ownerUid: 'admin-1',
  ownerEmail: 'admin@example.com',
  ownerDisplayName: '관리자',
};

assert.deepEqual(
  resolveNextClientEventOwner({
    existingEventFound: false,
    existing: null,
    requested: null,
    currentAuthOwner: adminOwner,
    initializeOwnerFromCurrentAuth: false,
  }),
  {
    ownerUid: null,
    ownerEmail: null,
    ownerDisplayName: null,
  },
  'administrator-created events should remain unassigned'
);

assert.deepEqual(
  resolveNextClientEventOwner({
    existingEventFound: true,
    existing: {
      ownerUid: null,
      ownerEmail: null,
      ownerDisplayName: null,
    },
    requested: null,
    currentAuthOwner: adminOwner,
    initializeOwnerFromCurrentAuth: true,
  }),
  {
    ownerUid: null,
    ownerEmail: null,
    ownerDisplayName: null,
  },
  'later saves should preserve an explicitly unassigned event'
);

assert.deepEqual(
  resolveNextClientEventOwner({
    existingEventFound: true,
    existing: {
      ownerUid: 'customer-1',
      ownerEmail: 'customer@example.com',
      ownerDisplayName: '고객',
    },
    requested: null,
    currentAuthOwner: adminOwner,
    initializeOwnerFromCurrentAuth: false,
  }),
  {
    ownerUid: 'customer-1',
    ownerEmail: 'customer@example.com',
    ownerDisplayName: '고객',
  },
  'existing customer ownership should be preserved'
);

assert.deepEqual(
  resolveNextClientEventOwner({
    existingEventFound: false,
    existing: null,
    requested: null,
    currentAuthOwner: adminOwner,
    initializeOwnerFromCurrentAuth: true,
  }),
  adminOwner,
  'existing current-user creation behavior should remain available'
);

console.log('admin-created event ownership checks passed');
