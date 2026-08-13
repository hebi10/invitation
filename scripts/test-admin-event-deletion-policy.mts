import assert from 'node:assert/strict';

import {
  isEventDeletionBlockingAccess,
  readEventDeletionMetadata,
} from '../src/server/eventDeletionPolicy.ts';
import { buildAdminInvitationPageSummary } from '../src/server/adminInvitationPagesService.ts';
import { normalizeEventSummaryRecord } from '../src/server/repositories/eventReadThroughDtos.ts';

const validDeletion = {
  jobId: 'delete-opening-bloom-cafe',
  status: 'pending',
  currentStep: 'block-access',
  requestedAt: '2026-08-13T00:00:00.000Z',
  retryable: true,
};

assert.deepEqual(
  readEventDeletionMetadata(validDeletion),
  validDeletion,
  'valid deletion metadata should be retained'
);

for (const status of ['pending', 'running', 'failed'] as const) {
  assert.equal(
    isEventDeletionBlockingAccess({ ...validDeletion, status }),
    true,
    `${status} deletion jobs should block access`
  );
}

assert.equal(
  readEventDeletionMetadata({ ...validDeletion, status: 'completed' }),
  null,
  'unknown deletion job statuses should be discarded'
);
assert.equal(
  readEventDeletionMetadata({ ...validDeletion, currentStep: 'unexpected' }),
  null,
  'unknown deletion steps should be discarded'
);
assert.equal(
  readEventDeletionMetadata(null),
  null,
  'non-record deletion metadata should be discarded'
);
assert.equal(
  isEventDeletionBlockingAccess(null),
  false,
  'events without deletion metadata should remain accessible'
);

const normalEvent = normalizeEventSummaryRecord('event-normal', {
  slug: 'normal-event',
});
assert.ok(normalEvent);
assert.equal(normalEvent.deletion, null, 'existing events without deletion metadata should remain normal');

const deletingEvent = normalizeEventSummaryRecord('event-deleting', {
  slug: 'deleting-event',
  deletion: validDeletion,
});
assert.ok(deletingEvent);
assert.deepEqual(deletingEvent.deletion, validDeletion, 'DTOs should expose valid deletion metadata');

const invalidDeletionEvent = normalizeEventSummaryRecord('event-invalid-deletion', {
  slug: 'invalid-deletion-event',
  deletion: { ...validDeletion, status: 'completed' },
});
assert.ok(invalidDeletionEvent);
assert.equal(invalidDeletionEvent.deletion, null, 'DTOs should normalize invalid deletion metadata to null');

const adminSummary = buildAdminInvitationPageSummary(
  deletingEvent,
  null,
  new Set(),
  'none'
);
assert.deepEqual(
  adminSummary.deletion,
  validDeletion,
  'admin invitation summaries should receive deletion metadata when present'
);

console.log('admin event deletion policy checks passed');
