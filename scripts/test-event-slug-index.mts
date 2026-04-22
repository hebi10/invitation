import assert from 'node:assert/strict';

import { normalizeEventSlugIndexRecord } from '../src/server/repositories/eventReadThroughDtos.ts';
import {
  EventSlugIndexConflictError,
  assertEventSlugIndexOwnership,
  normalizeEventSlugIndexStatus,
} from '../src/server/repositories/eventSlugIndex.ts';

async function main() {
  assert.equal(normalizeEventSlugIndexStatus('active'), 'active');
  assert.equal(normalizeEventSlugIndexStatus('redirect'), 'redirect');
  assert.equal(normalizeEventSlugIndexStatus('revoked'), 'revoked');
  assert.equal(normalizeEventSlugIndexStatus('unknown'), 'active');

  const activeRecord = normalizeEventSlugIndexRecord('wedding-a', {
    eventId: 'evt_wedding-a',
    eventType: 'wedding',
    status: 'active',
  });
  assert.deepEqual(activeRecord, {
    slug: 'wedding-a',
    eventId: 'evt_wedding-a',
    eventType: 'wedding',
    status: 'active',
    targetSlug: null,
    createdAt: null,
    updatedAt: null,
  });

  assert.doesNotThrow(() => {
    assertEventSlugIndexOwnership({
      slug: 'wedding-a',
      nextEventId: 'evt_wedding-a',
      existingRecord: activeRecord,
    });
  });

  assert.doesNotThrow(() => {
    assertEventSlugIndexOwnership({
      slug: 'wedding-b',
      nextEventId: 'evt_wedding-b-next',
      existingRecord: {
        slug: 'wedding-b',
        eventId: 'evt_wedding-b-prev',
        status: 'revoked',
      },
    });
  });

  assert.throws(
    () =>
      assertEventSlugIndexOwnership({
        slug: 'wedding-c',
        nextEventId: 'evt_wedding-c-next',
        existingRecord: {
          slug: 'wedding-c',
          eventId: 'evt_wedding-c-prev',
          status: 'active',
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof EventSlugIndexConflictError);
      assert.equal(error.slug, 'wedding-c');
      assert.equal(error.currentEventId, 'evt_wedding-c-prev');
      assert.equal(error.nextEventId, 'evt_wedding-c-next');
      return true;
    }
  );

  console.log('event slug index checks passed');
}

void main();
